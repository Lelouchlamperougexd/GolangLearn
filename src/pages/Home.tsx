import { useState, useRef, useEffect, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/HomeResponsive.module.css";
import Container from "./Login";
import SignUp from "./SignUp";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import videoLogo from "../assets/video-logo.mp4";

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

const Home: FunctionComponent = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
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
    setTimeout(() => {
      logout();
      navigate("/");
      setLoggingOut(false);
    }, 1800);
  };

  const handleLoginSuccess = (roleName: string) => {
    setLoggingIn(true);
    setTimeout(() => {
      setLoggingIn(false);
      if (roleName === "admin" || roleName === "moderator") navigate("/admin");
      else if (roleName === "agency") navigate("/agency");
      else if (roleName === "developer") navigate("/developer");
    }, 1800);
  };

  return (
    <div className={styles.landingPage}>
      {(loggingOut || loggingIn) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "var(--color-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease",
        }}>
          <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
          <video
            src={videoLogo}
            autoPlay
            muted
            playsInline
            style={{ width: 320, height: 320, objectFit: "contain" }}
          />
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <img src="/assets/logo.png" alt="Qonys" />
          </div>
          <nav className={styles.navigation}>
            <a className={`${styles.navLink} ${styles.active}`}>Главная</a>
            <a className={styles.navLink} onClick={() => navigate('/catalog')} style={{ cursor: 'pointer' }}>Каталог</a>
          </nav>
          <div className={styles.headerActions}>
            <button className={styles.themeToggle} onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {user ? (
              <>
                {user.role?.name === "agency" && (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate("/agency")}>
                    Создать объявление
                  </button>
                )}
                {user.role?.name === "developer" && (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate("/developer")}>
                    Создать проект
                  </button>
                )}
                <div ref={profileMenuRef} style={{ position: "relative" }}>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowProfileMenu(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      {(user.first_name || user.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <span style={{ display: 'none' }}>
                      {user.first_name || user.username}
                    </span>
                  </button>

                  {showProfileMenu && (
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--color-bg)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid var(--color-border)", minWidth: 210, zIndex: 1000, overflow: "hidden" }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{user.email}</div>
                        <div style={{ fontSize: 11, color: "var(--color-primary)", marginTop: 2, fontWeight: 500 }}>
                          {getRoleLabel(user.role?.name ?? "")}
                        </div>
                      </div>
                      <button onClick={() => { setShowProfileMenu(false); navigate(getDashboardRoute(user.role?.name ?? "")); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Inter, sans-serif", textAlign: "left", color: "var(--color-text-primary)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-secondary)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        Личный кабинет
                      </button>
                      <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Inter, sans-serif", textAlign: "left", color: "#f5222d", borderTop: "1px solid var(--color-border)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-secondary)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                        </svg>
                        Выйти
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowRegister(true)}>
                  Зарегистрироваться
                </button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowLogin(true)}>
                  Войти
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Как работает платформа</h1>
            <p className={styles.sectionSubtitle}>Четыре этапа работы с объектами недвижимости</p>
          </div>
          <div className={styles.featuresGrid}>
            {[
              { num: "01", title: "Поиск объектов на карте", desc: "Фильтрация по городу, району и параметрам." },
              { num: "02", title: "Просмотр проверенных объявлений", desc: "Модерация и верификация всех объявлений." },
              { num: "03", title: "Связь с агентством", desc: "Встроенный чат для прямого общения." },
              { num: "04", title: "Бронирование объекта", desc: "Отправка заявки без онлайн-оплаты." },
            ].map(feature => (
              <div key={feature.num} className={styles.featureCard}>
                <div className={styles.featureNumber}>{feature.num}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Платформа для разных ролей</h2>
            <p className={styles.sectionSubtitle}>Функциональность для покупателей, агентств и застройщиков</p>
          </div>
          <div className={styles.rolesGrid}>
            {[
              { title: "Покупателям", img: "/assets/source/image.jpg", icon: "/assets/Icon-17.svg", items: ["Проверенные объявления", "Карта и фильтры", "Прямая связь с агентствами"] },
              { title: "Агентствам", img: "/assets/Image (Агентствам).png", icon: "/assets/Icon-15.svg", items: ["Личный кабинет", "Управление объявлениями", "Заявки и чаты"] },
              { title: "Застройщикам", img: "/assets/Image (Застройщикам).png", icon: "/assets/Icon-14.svg", items: ["Размещение новостроек", "Управление проектами", "Аналитика просмотров"] },
            ].map(role => (
              <div key={role.title} className={styles.roleCard}>
                <img src={role.img} alt={role.title} className={styles.roleCardImage} />
                <div className={styles.roleCardContent}>
                  <div className={styles.roleCardHeader}>
                    <img src={role.icon} alt="" className={styles.roleCardIcon} />
                    <h3 className={styles.roleCardTitle}>{role.title}</h3>
                  </div>
                  <ul className={styles.roleCardList}>
                    {role.items.map((item, i) => (
                      <li key={i} className={styles.roleCardListItem}>
                        <img src="/assets/Icon-16.svg" alt="" className={styles.roleCardListIcon} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button className={styles.roleCardBtn}>Подробнее</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="/assets/Icon-13.svg" alt="" style={{ width: 24, height: 24 }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Система контроля</span>
            </div>
            <h2 className={styles.sectionTitle}>Безопасность и контроль качества</h2>
            <p className={styles.sectionSubtitle}>Верификация агентств, модерация объявлений и защищённая коммуникация.</p>
          </div>

          <div className={styles.securityContainer}>
            <div className={styles.securityFeatures}>
              {[
                { icon: "/assets/Icon-12.svg", title: "Верификация объявлений", badge: "Проверено", desc: "Проверка данных агентств и документов." },
                { icon: "/assets/Icon-11.svg", title: "Модерация контента", badge: "Контроль качества", desc: "Ручная проверка всех объявлений." },
                { icon: "/assets/Icon-10.svg", title: "Безопасная коммуникация", badge: "Защищено", desc: "Встроенный чат без передачи личных данных." },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: '1.5rem' }}>
                  <img src={item.icon} alt="" style={{ width: 48, height: 48, flexShrink: 0, objectFit: 'contain' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.title}</h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(112, 160, 255, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{item.badge}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
              {[
                { num: "~10K", label: "Объектов" },
                { num: "~500", label: "Агентств" },
                { num: "~50K", label: "Пользователей" },
              ].map(stat => (
                <div key={stat.label} className={styles.statBox}>
                  <div className={styles.statNumber}>{stat.num}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate('/catalog')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/assets/Icon-21.svg" alt="" style={{ width: 20, height: 20 }} />
              Найти объект
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`}>
              Зарегистрировать агентство
            </button>
          </div>
        </div>
      </section>

      {/* Quick Search Section */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '1.5rem' }}>Быстрый поиск объектов</h2>
          <div className={styles.searchSection}>
            <form className={styles.searchForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Город</label>
                <input type="text" placeholder="Выберите город" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Тип недвижимости</label>
                <input type="text" placeholder="Квартира" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Цена от</label>
                <input type="number" placeholder="0" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Цена до</label>
                <input type="number" placeholder="∞" className={styles.formInput} />
              </div>
              <button type="button" className={styles.searchBtn}>
                <img src="/assets/Icon-21.svg" alt="" style={{ width: 16, height: 16 }} />
                Поиск
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.sectionContainer}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h4>Qonys</h4>
              <p>Платформа для поиска проверенных объектов недвижимости. Соединяем покупателей, агентства и застройщиков.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <img src="/assets/Icon-6.svg" alt="" style={{ width: 20, height: 20, cursor: 'pointer', opacity: 0.8 }} />
                <img src="/assets/Icon-5.svg" alt="" style={{ width: 20, height: 20, cursor: 'pointer', opacity: 0.8 }} />
                <img src="/assets/Icon-4.svg" alt="" style={{ width: 20, height: 20, cursor: 'pointer', opacity: 0.8 }} />
              </div>
            </div>
            <div className={styles.footerSection}>
              <h4>О платформе</h4>
              <ul className={styles.footerLinks}>
                <a href="#">О нас</a>
                <a href="#">Как это работает</a>
                <a href="#">Тарифы</a>
                <a href="#">Блог</a>
              </ul>
            </div>
            <div className={styles.footerSection}>
              <h4>Пользователям</h4>
              <ul className={styles.footerLinks}>
                <a href="#">Поиск объектов</a>
                <a href="#">Агентствам</a>
                <a href="#">Застройщикам</a>
                <a href="#">Помощь</a>
              </ul>
            </div>
            <div className={styles.footerSection}>
              <h4>Контакты</h4>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <img src="/assets/Icon-3.svg" alt="" style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>г. Алматы, ул. Примерная, 123</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <img src="/assets/Icon-2.svg" alt="" style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>+7 700 000 00 00</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <img src="/assets/Icon-1.svg" alt="" style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>info@platform.kz</span>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerBottomText}>© 2026 Qonys. Все права защищены.</p>
            <div className={styles.footerBottomLinks}>
              <a href="#">Политика конфиденциальности</a>
              <a href="#">Условия использования</a>
              <a href="#">Cookie</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showLogin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <Container onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
      {showRegister && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <SignUp onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
