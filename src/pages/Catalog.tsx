import { useState, useEffect, useCallback, useRef, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Catalog.module.css";
import type { Property } from "../components/MapComponent";
import MapComponent from "../components/MapComponent";
import { getListings, type CatalogListing } from "../api/dashboard";
import { useAuth } from "../context/AuthContext";
import Container from "./Login";
import SignUp from "./SignUp";

// City center coordinates for radius filtering
const CITY_CENTERS: Record<string, [number, number]> = {
  "Алматы": [43.238949, 76.889709],
  "Астана": [51.1605, 71.4704],
  "Шымкент": [42.3417, 69.5901],
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Slight random jitter so co-located markers don't stack perfectly
function jitter(coord: number): number {
  return coord + (Math.random() - 0.5) * 0.008;
}

function listingToProperty(l: CatalogListing): Property | null {
  // Use real coordinates if available, else fall back to city center
  let lat: number;
  let lng: number;
  if (l.latitude != null && l.longitude != null) {
    lat = l.latitude;
    lng = l.longitude;
  } else {
    const center = CITY_CENTERS[l.city];
    if (!center) return null; // can't place on map at all
    lat = jitter(center[0]);
    lng = jitter(center[1]);
  }
  return {
    id: String(l.id),
    title: l.title,
    price: l.price,
    address: l.address || l.city,
    lat,
    lng,
    rooms: l.rooms ?? 0,
    area: l.area ?? 0,
    imageUrl: l.media?.[0]?.url || "https://placehold.co/600x400?text=Нет+фото",
  };
}

const PROPERTY_TYPES = [
  { value: "", label: "Все типы" },
  { value: "apartment", label: "Квартира" },
  { value: "house", label: "Дом" },
  { value: "studio", label: "Студия" },
  { value: "commercial", label: "Коммерческое" },
  { value: "land", label: "Земля" },
];

const DEAL_TYPES = [
  { value: "", label: "Любой" },
  { value: "rent", label: "Аренда" },
  { value: "sale", label: "Продажа" },
];

const CITIES = ["", "Алматы", "Астана", "Шымкент"];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Квартира",
  house: "Дом",
  studio: "Студия",
  commercial: "Коммерческое",
  land: "Земля",
};

const DEAL_TYPE_LABELS: Record<string, string> = {
  rent: "Аренда",
  sale: "Продажа",
};

function getDashboardRoute(roleName: string): string {
  if (roleName === "admin" || roleName === "moderator") return "/admin";
  if (roleName === "agency") return "/agency";
  if (roleName === "developer") return "/developer";
  return "/dashboard";
}

function getRoleLabel(roleName: string): string {
  if (roleName === "admin") return "Администратор";
  if (roleName === "moderator") return "Модератор";
  if (roleName === "agency") return "Агентство";
  if (roleName === "developer") return "Застройщик";
  return "Личный кабинет";
}

const Catalog: FunctionComponent = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfileMenu(false);
    setLoggingOut(true);
    setTimeout(() => { logout(); navigate("/"); setLoggingOut(false); }, 1800);
  };

  // Filter state (draft — what's in the UI controls)
  const [city, setCity] = useState("");
  const [dealType, setDealType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [rooms, setRooms] = useState("");
  const [radius, setRadius] = useState(5);

  // Results
  const [listings, setListings] = useState<CatalogListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchListings = useCallback(
    async (params: {
      city: string; dealType: string; propertyType: string;
      priceMin: string; priceMax: string; rooms: string;
    }) => {
      setLoading(true);
      setError("");
      try {
        const filter: Parameters<typeof getListings>[0] = {};
        if (params.city)         filter.city          = params.city;
        if (params.dealType)     filter.deal_type     = params.dealType;
        if (params.propertyType) filter.property_type = params.propertyType;
        if (params.priceMin && !isNaN(Number(params.priceMin))) filter.price_min = Number(params.priceMin);
        if (params.priceMax && !isNaN(Number(params.priceMax))) filter.price_max = Number(params.priceMax);
        // Rooms: map to rooms_min / rooms_max
        if (params.rooms === "1") { filter.rooms_min = 1; filter.rooms_max = 1; }
        else if (params.rooms === "2") { filter.rooms_min = 2; filter.rooms_max = 2; }
        else if (params.rooms === "3+") { filter.rooms_min = 3; }
        const data = await getListings(filter);
        setListings(data);
      } catch {
        setError("Не удалось загрузить объявления. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load — no filters
  useEffect(() => {
    fetchListings({ city, dealType, propertyType, priceMin, priceMax, rooms });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    fetchListings({ city, dealType, propertyType, priceMin, priceMax, rooms });
  };

  const handleReset = () => {
    setCity("");
    setDealType("");
    setPropertyType("");
    setPriceMin("");
    setPriceMax("");
    setRooms("");
    setRadius(5);
    fetchListings({ city: "", dealType: "", propertyType: "", priceMin: "", priceMax: "", rooms: "" });
  };

  // Apply radius filtering client-side (only for listings with coordinates)
  const cityCenter = city ? CITY_CENTERS[city] : null;
  const filtered = listings.filter((l) => {
    if (!cityCenter || l.latitude == null || l.longitude == null) return true;
    return haversineKm(cityCenter[0], cityCenter[1], l.latitude, l.longitude) <= radius;
  });

  // All filtered listings go on the map; city center used as fallback when no coordinates
  const mapProperties: Property[] = filtered
    .map(listingToProperty)
    .filter((p): p is Property => p !== null);

  return (
    <div className={styles.catalogPage}>
      {/* Logout overlay */}
      {loggingOut && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#fbfbfb", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/assets/logo.png" alt="" style={{ width: 120, opacity: 0.5 }} />
        </div>
      )}

      {/* Header / Nav */}
      <header className={styles.header}>
        {/* Logo */}
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/assets/logo.png" alt="Qonys" style={{ height: 48, objectFit: "contain" }} />
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <span
            onClick={() => navigate("/")}
            style={{ fontSize: 15, fontWeight: 500, color: "#3a3a3a", cursor: "pointer", transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#70a0ff")}
            onMouseLeave={e => (e.currentTarget.style.color = "#3a3a3a")}
          >Главная</span>
          <span
            style={{ fontSize: 15, fontWeight: 500, color: "#70a0ff", cursor: "default" }}
          >Каталог</span>
        </nav>

        {/* Result count */}
        <div className={styles.resultCount}>
          {loading ? "Загрузка..." : error ? "Ошибка загрузки" : `Найдено: ${filtered.length} объектов`}
        </div>

        {/* Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user ? (
            <div ref={profileMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", background: "#70a0ff", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500 }}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                  {(user.first_name || user.username || "?").charAt(0).toUpperCase()}
                </div>
                {user.first_name || user.username}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {showProfileMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #f0f0f0", minWidth: 200, zIndex: 1000, overflow: "hidden", fontFamily: "Inter, sans-serif" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{user.first_name} {user.last_name}</div>
                    <div style={{ fontSize: 12, color: "#939393", marginTop: 2 }}>{user.email}</div>
                    <div style={{ fontSize: 11, color: "#70a0ff", marginTop: 2, fontWeight: 500 }}>{getRoleLabel(user.role?.name ?? "")}</div>
                  </div>
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate(getDashboardRoute(user.role?.name ?? "")); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#1a1a2e", fontFamily: "Inter, sans-serif", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f7f9fa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Личный кабинет
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#f5222d", fontFamily: "Inter, sans-serif", textAlign: "left", borderTop: "1px solid #f5f5f5" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => setShowRegister(true)} style={{ height: 40, padding: "0 16px", background: "none", border: "1.5px solid #e0e0e0", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#3a3a3a", fontFamily: "Inter, sans-serif" }}>
                Зарегистрироваться
              </button>
              <button onClick={() => setShowLogin(true)} style={{ height: 40, padding: "0 20px", background: "#70a0ff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#fff", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/assets/Icon.svg" alt="" style={{ width: 16, height: 16 }} />
                Войти
              </button>
            </>
          )}
        </div>
      </header>

      {showLogin && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 500 }}>
            <Container onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}
      {showRegister && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560 }}>
            <SignUp onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>

        {/* Map Area */}
        <div className={styles.mapContainer}>
          {error ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: "#f5222d", fontFamily: "Inter, sans-serif", fontSize: 14,
            }}>
              {error}
            </div>
          ) : (
            <MapComponent properties={mapProperties} />
          )}
        </div>

        {/* Filters Sidebar */}
        <div className={styles.filtersContainer}>
          <div className={styles.filtersHeader}>
            <img src="/assets/filter.svg" alt="" style={{ width: 18 }} />
            Фильтры
          </div>

          <div className={styles.filtersBody}>
            {/* City */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Город</div>
              <select className={styles.select} value={city} onChange={e => setCity(e.target.value)}>
                <option value="">Все города</option>
                {CITIES.filter(c => c).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Deal type */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Тип сделки</div>
              <select className={styles.select} value={dealType} onChange={e => setDealType(e.target.value)}>
                {DEAL_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Property type */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Тип недвижимости</div>
              <select className={styles.select} value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                {PROPERTY_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Цена, ₸</div>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="От"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  min={0}
                />
                <input
                  type="number"
                  className={styles.input}
                  placeholder="До"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Radius */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>
                Радиус поиска{!city && <span style={{ color: "#aaa", fontSize: 11, marginLeft: 4 }}>(выберите город)</span>}
              </div>
              <div className={styles.radioGroup}>
                {[1, 3, 5, 10].map(val => (
                  <button
                    key={val}
                    className={`${styles.radioBtn} ${radius === val ? styles.radioBtnActive : ""}`}
                    onClick={() => setRadius(val)}
                    disabled={!city}
                    style={{ opacity: city ? 1 : 0.45 }}
                  >
                    {val} км
                  </button>
                ))}
              </div>
            </div>

            {/* Rooms */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Комнат</div>
              <select className={styles.select} value={rooms} onChange={e => setRooms(e.target.value)}>
                <option value="">Любое</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3+">3+</option>
              </select>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.btnPrimary}
                onClick={handleApply}
                disabled={loading}
              >
                {loading ? "..." : "Применить"}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleReset}
                disabled={loading}
              >
                Сбросить
              </button>
            </div>
          </div>

          <div className={styles.listingsHeader}>
            <div className={styles.listingsTitle}>Объявления</div>
            <div className={styles.listingsCount}>
              {loading ? "..." : filtered.length}
            </div>
          </div>

          <div className={styles.propertyList}>
            {loading && (
              <div className={styles.emptyListState}>Загружаем объявления...</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className={styles.emptyListState}>По выбранным фильтрам объявлений нет</div>
            )}
            {!loading && !error && filtered.map(item => {
              const imageUrl = item.media?.[0]?.url || "https://placehold.co/600x400?text=Нет+фото";
              const propertyLabel = PROPERTY_TYPE_LABELS[item.property_type] ?? item.property_type;
              const dealLabel = DEAL_TYPE_LABELS[item.deal_type] ?? item.deal_type;
              const details = [
                propertyLabel,
                dealLabel,
                item.rooms != null ? `${item.rooms} комн.` : null,
                item.area != null ? `${item.area} м²` : null,
              ].filter(Boolean).join(" · ");

              return (
                <button
                  key={item.id}
                  type="button"
                  className={styles.propertyCardShort}
                  onClick={() => navigate(`/property/${item.id}`)}
                >
                  <img src={imageUrl} alt={item.title} className={styles.propertyImage} />
                  <div className={styles.propertyInfo}>
                    <div className={styles.propertyPrice}>{item.price.toLocaleString("ru-RU")} ₸</div>
                    <div className={styles.propertyTitle}>{item.title}</div>
                    <div className={styles.propertyAddress}>{item.address || item.city}</div>
                    <div className={styles.propertyMeta}>{details}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
