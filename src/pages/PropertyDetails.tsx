import { useState, useEffect, type FunctionComponent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../css/PropertyDetails.module.css";
import MapComponent, { type Property } from "../components/MapComponent";
import {
  getListing, type CatalogListing,
  addFavorite, removeFavorite, getFavorites,
  createApplication, type CreateApplicationPayload,
} from "../api/dashboard";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/auth";
import NearbyPlaces from "../components/NearbyPlaces";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Квартира", house: "Дом", studio: "Студия",
  commercial: "Коммерческое", land: "Земля",
};
const DEAL_TYPE_LABELS: Record<string, string> = { rent: "Аренда", sale: "Продажа" };

function listingToMapProperty(l: CatalogListing): Property {
  return {
    id: String(l.id), title: l.title, price: l.price,
    address: l.address || l.city, lat: l.latitude ?? 43.238949,
    lng: l.longitude ?? 76.889709, rooms: l.rooms ?? 0, area: l.area ?? 0,
    imageUrl: l.media?.[0]?.url || "",
  };
}

// ── Application modal ────────────────────────────────────────────────────────
function ApplyModal({ listing, onClose, onSuccess }: {
  listing: CatalogListing;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user ? `${user.first_name} ${user.last_name}`.trim() : "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [occupantCount, setOccupantCount] = useState(1);
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [stayTermMonths, setStayTermMonths] = useState<number | "">(6);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRent = listing.deal_type === "rent";
  const isValid = fullName.trim().length > 0 && phone.trim().length >= 7 && email.includes("@");

  const handleSubmit = async () => {
    if (!isValid) return;
    setError("");
    setLoading(true);
    try {
      const payload: CreateApplicationPayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        occupant_count: occupantCount,
        has_children: hasChildren,
        has_pets: hasPets,
        is_student: isStudent,
        stay_term_months: isRent && stayTermMonths !== "" ? Number(stayTermMonths) : undefined,
        comment: comment.trim() || undefined,
      };
      await createApplication(listing.id, payload);
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 12px", border: "1.5px solid #e0e0e0",
    borderRadius: 8, fontSize: 14, fontFamily: "Inter, sans-serif",
    outline: "none", boxSizing: "border-box", color: "#1a1a2e", background: "#fff",
  };
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "#3a3a3a", marginBottom: 5, display: "block" };

  // Yes/No toggle button pair
  const YesNo = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div style={{ display: "flex", gap: 8 }}>
      {([true, false] as const).map(v => (
        <button key={String(v)} type="button" onClick={() => onChange(v)} disabled={loading}
          style={{ flex: 1, height: 38, borderRadius: 8, border: `1.5px solid ${value === v ? "#70a0ff" : "#e0e0e0"}`, background: value === v ? "#eef3ff" : "#fff", color: value === v ? "#70a0ff" : "#595959", fontWeight: value === v ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all .15s" }}>
          {v ? "Да" : "Нет"}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>Подать заявку</div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 3 }}>{listing.title}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#939393", lineHeight: 1 }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div>
            <label style={lbl}>Имя<span style={{ color: "#e53e3e" }}>*</span></label>
            <input style={inp} type="text" placeholder="Иван Иванов" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label style={lbl}>Телефон<span style={{ color: "#e53e3e" }}>*</span></label>
            <input style={inp} type="tel" placeholder="+7 700 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label style={lbl}>Email<span style={{ color: "#e53e3e" }}>*</span></label>
            <input style={inp} type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Жильцов</label>
              <input style={inp} type="number" min={1} max={20} value={occupantCount} onChange={e => setOccupantCount(Number(e.target.value))} disabled={loading} />
            </div>
            {isRent && (
              <div>
                <label style={lbl}>Срок аренды (мес.)</label>
                <input style={inp} type="number" min={1} value={stayTermMonths} onChange={e => setStayTermMonths(e.target.value === "" ? "" : Number(e.target.value))} disabled={loading} />
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Дети</label>
              <YesNo value={hasChildren} onChange={setHasChildren} />
            </div>
            <div>
              <label style={lbl}>Животные</label>
              <YesNo value={hasPets} onChange={setHasPets} />
            </div>
            <div>
              <label style={lbl}>Студент</label>
              <YesNo value={isStudent} onChange={setIsStudent} />
            </div>
          </div>

          <div>
            <label style={lbl}>Комментарий</label>
            <textarea
              style={{ ...inp, height: 72, padding: "10px 12px", resize: "vertical" }}
              placeholder="Дополнительная информация..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ color: "#e53e3e", fontSize: 13, padding: "10px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{ height: 46, background: isValid && !loading ? "#70a0ff" : "#d2d2d2", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: isValid && !loading ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", transition: "background .2s" }}
          >
            {loading ? "Отправляем..." : "Отправить заявку"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
const PropertyDetails: FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<CatalogListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [showApply, setShowApply] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  useEffect(() => {
    if (!id) { setError("Нет ID объекта"); setLoading(false); return; }
    setLoading(true);
    getListing(Number(id))
      .then(data => { setListing(data); setLoading(false); })
      .catch(() => { setError("Объект не найден"); setLoading(false); });
  }, [id]);

  // Check favorites
  useEffect(() => {
    if (!user || !id) return;
    getFavorites()
      .then(favs => setIsFav(favs.some(f => f.listing_id === Number(id))))
      .catch(() => {});
  }, [user, id]);

  const handleFav = async () => {
    if (!user) { alert("Войдите в аккаунт чтобы добавить в избранное"); return; }
    if (!listing) return;
    setFavLoading(true);
    try {
      if (isFav) { await removeFavorite(listing.id); setIsFav(false); }
      else { await addFavorite(listing.id); setIsFav(true); }
    } catch { /* ignore */ }
    finally { setFavLoading(false); }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>← Назад</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#939393", fontSize: 15 }}>
          Загрузка...
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>← Назад</button>
        </div>
        <div style={{ padding: 32, color: "#939393" }}>{error || "Объект не найден"}</div>
      </div>
    );
  }

  const images = listing.media && listing.media.length > 0
    ? listing.media.map(m => m.url)
    : [];
  const mapProp = listingToMapProperty(listing);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← {listing.title}
        </button>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={handleFav}
            disabled={favLoading}
            title={isFav ? "Убрать из избранного" : "Добавить в избранное"}
            style={{ color: isFav ? "#f5222d" : undefined }}
          >
            {isFav
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#f5222d" stroke="#f5222d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            }
          </button>
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* Left Column */}
        <div className={styles.leftColumn}>

          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImageWrapper}>
              {images.length > 1 && (
                <button className={`${styles.sliderArrow} ${styles.sliderArrowLeft}`} onClick={() => setCurrentImageIdx(i => i === 0 ? images.length - 1 : i - 1)}>←</button>
              )}
              {images.length > 0
                ? <img src={images[currentImageIdx]} alt={listing.title} className={styles.mainImage} />
                : <div style={{ width: "100%", height: 320, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#939393", fontSize: 15, borderRadius: 12 }}>Нет фото</div>
              }
              {images.length > 1 && (
                <button className={`${styles.sliderArrow} ${styles.sliderArrowRight}`} onClick={() => setCurrentImageIdx(i => i === images.length - 1 ? 0 : i + 1)}>→</button>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.thumbnailList}>
                {images.map((img, idx) => (
                  <img key={idx} src={img} alt="" className={`${styles.thumbnail} ${idx === currentImageIdx ? styles.thumbnailActive : ""}`} onClick={() => setCurrentImageIdx(idx)} />
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Описание</div>
              <div className={styles.description}>{listing.description}</div>
            </div>
          )}

          {/* Characteristics */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Характеристики</div>
            <div className={styles.grid}>
              {listing.rooms != null && (
                <div className={styles.gridItem}>
                  <div className={styles.gridIconWrapper}><img src="/assets/room.svg" alt="" className={styles.gridIcon} /></div>
                  <div className={styles.gridText}><span className={styles.gridLabel}>Комнат</span><span className={styles.gridValue}>{listing.rooms}</span></div>
                </div>
              )}
              {listing.area != null && (
                <div className={styles.gridItem}>
                  <div className={styles.gridIconWrapper}><img src="/assets/area.svg" alt="" className={styles.gridIcon} /></div>
                  <div className={styles.gridText}><span className={styles.gridLabel}>Площадь</span><span className={styles.gridValue}>{listing.area} м²</span></div>
                </div>
              )}
              {listing.floor != null && (
                <div className={styles.gridItem}>
                  <div className={styles.gridIconWrapper}><img src="/assets/floor.svg" alt="" className={styles.gridIcon} /></div>
                  <div className={styles.gridText}>
                    <span className={styles.gridLabel}>Этаж</span>
                    <span className={styles.gridValue}>{listing.floor}{listing.total_floors ? ` из ${listing.total_floors}` : ""}</span>
                  </div>
                </div>
              )}
              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}><img src="/assets/property_type.svg" alt="" className={styles.gridIcon} /></div>
                <div className={styles.gridText}><span className={styles.gridLabel}>Тип</span><span className={styles.gridValue}>{PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type}</span></div>
              </div>
              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}><img src="/assets/calendar.svg" alt="" className={styles.gridIcon} /></div>
                <div className={styles.gridText}><span className={styles.gridLabel}>Сделка</span><span className={styles.gridValue}>{DEAL_TYPE_LABELS[listing.deal_type] ?? listing.deal_type}</span></div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className={styles.mapSection}>
            <div className={styles.mapHeader}>
              <div className={styles.mapTitle}>
                <div className={styles.mapTitleIconWrapper}>
                  <img src="/assets/location.svg" alt="" style={{ width: 16, height: 16, filter: "invert(52%) sepia(85%) saturate(1636%) hue-rotate(192deg) brightness(101%) contrast(101%)" }} />
                </div>
                Расположение
              </div>
              <div className={styles.mapSubtitle}>{listing.address}, {listing.city}</div>
            </div>
            <div className={styles.mapContainer}>
              <MapComponent properties={[mapProp]} />
            </div>
          </div>

          {/* Nearby infrastructure */}
          {listing.latitude && listing.longitude && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Инфраструктура рядом</div>
              <NearbyPlaces lat={listing.latitude} lng={listing.longitude} />
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          <div className={styles.priceCard}>
            <div className={styles.price}>{listing.price.toLocaleString("ru-RU")} ₸</div>

            {listing.company_name && (
              <div className={styles.agencyInfo}>
                <div className={styles.agencyLogo}>
                  <img src="/assets/avatar.svg" alt="" style={{ width: 48, height: 48 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span className={styles.agencyName}>{listing.company_name}</span>
                  <span className={styles.agencyType}>Агентство недвижимости</span>
                </div>
              </div>
            )}

            <div className={styles.actionBtns}>
              {/* Подать заявку */}
              {applyDone ? (
                <div style={{ padding: "10px 14px", background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, fontSize: 13, color: "#389e0d", textAlign: "center", fontWeight: 500 }}>
                  ✓ Заявка отправлена
                </div>
              ) : (
                <button
                  className={styles.btnPrimary}
                  onClick={() => { if (!user) { alert("Войдите в аккаунт чтобы подать заявку"); return; } setShowApply(true); }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  Подать заявку
                </button>
              )}

              {/* Избранное */}
              <button
                className={styles.btnSecondary}
                onClick={handleFav}
                disabled={favLoading}
                style={{ background: isFav ? "#fff1f0" : undefined, borderColor: isFav ? "#ffa39e" : undefined, color: isFav ? "#f5222d" : undefined }}
              >
                {isFav
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#f5222d" stroke="#f5222d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                }
                {isFav ? "В избранном" : "В избранное"}
              </button>
            </div>

            <div className={styles.addressRow}>
              <img src="/assets/location.svg" alt="" className={styles.contactIcon} style={{ opacity: 1 }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className={styles.addressTitle}>{listing.city}</span>
                <span>{listing.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showApply && (
        <ApplyModal
          listing={listing}
          onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); setApplyDone(true); }}
        />
      )}
    </div>
  );
};

export default PropertyDetails;
