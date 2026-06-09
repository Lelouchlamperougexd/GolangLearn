import { useState, useRef, useEffect, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import s from "../css/HomeResponsive.module.css";
import Container from "./Login";
import SignUp from "./SignUp";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LanguageContext";
import { translations, type Lang } from "../i18n/translations";
import videoLogo from "../assets/video-logo.mp4";

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconShieldFill = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);

const IconDocCheck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
    <polyline points="14 2 14 8 20 8"/>
    <polyline points="9 13 11 15 15 11"/>
  </svg>
);

const IconEye = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconUser = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconHome = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconGrid = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const IconCheck = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#faad14" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add(s.revealVisible); }),
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );
    document.querySelectorAll(`.${s.reveal}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Main component ───────────────────────────────────────────────────────────

const Home: FunctionComponent = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const t = translations[lang];

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useReveal();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      navigate(`/confirm/${encodeURIComponent(token)}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node))
        setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const getDashboardRoute = (role: string) => {
    if (role === "admin" || role === "moderator") return "/admin";
    if (role === "agency") return "/agency";
    if (role === "developer") return "/developer";
    return "/dashboard";
  };

  const getRoleLabel = (role: string) => {
    const m: Record<string, string> = {
      admin: t.roleLabels.admin,
      moderator: t.roleLabels.moderator,
      agency: t.roleLabels.agency,
      developer: t.roleLabels.developer,
    };
    return m[role] ?? t.roleLabels.user;
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    setLoggingOut(true);
    setTimeout(() => { logout(); navigate("/"); setLoggingOut(false); }, 1800);
  };

  const handleLoginSuccess = (roleName: string) => {
    setLoggingIn(true);
    setTimeout(() => {
      setLoggingIn(false);
      navigate(getDashboardRoute(roleName));
    }, 1800);
  };

  const roleName = user?.role?.name ?? "";

  const roleIcons = [
    { icon: <IconUser />, color: "#70a0ff", bg: "rgba(112,160,255,0.1)" },
    { icon: <IconHome />, color: "#52c97a", bg: "rgba(82,201,122,0.1)" },
    { icon: <IconGrid />, color: "#faad14", bg: "rgba(250,173,20,0.1)" },
  ];

  const featureColors = ["#70a0ff", "#52c97a", "#faad14", "#a78bfa", "#f97316", "#f5222d"];

  const testimonialPhotos = [
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&h=120&q=80",
  ];
  const testimonialNames = ["Айгерим С.", "Данияр К.", "Малика Т."];
  const testimonialCities = ["Алматы", "Астана", "Шымкент"];

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className={s.landingPage}>

      {(loggingOut || loggingIn) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <video src={videoLogo} autoPlay muted playsInline style={{ width: 300, height: 300, objectFit: "contain" }} />
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <header className={s.header}>
        <div className={s.headerContent}>
          <div className={s.logo} onClick={() => navigate("/")}>
            <img src="/assets/logo.png" alt="Qonys" />
          </div>

          <nav className={s.navigation}>
            <span className={`${s.navLink} ${s.active}`}>{t.nav.home}</span>
            <span className={s.navLink} onClick={() => navigate("/catalog")}>{t.nav.catalog}</span>
          </nav>

          <div className={s.headerActions}>
            {/* Language switcher */}
            <div className={s.langSwitcher}>
              {(["ru", "kz", "en"] as Lang[]).map(l => (
                <button
                  key={l}
                  className={`${s.langBtn} ${lang === l ? s.langBtnActive : ""}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button className={s.themeToggle} onClick={toggleTheme} title="Theme">
              {theme === "light" ? (
                <img src="https://cdn-icons-png.flaticon.com/512/581/581601.png" width={20} height={20} alt="dark mode" style={{ display: "block" }} />
              ) : (
                <img src="https://cdn-icons-png.flaticon.com/512/869/869869.png" width={20} height={20} alt="light mode" style={{ display: "block" }} />
              )}
            </button>

            {user ? (
              <>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => navigate(getDashboardRoute(roleName))}>
                  {getRoleLabel(roleName)}
                </button>
                <div ref={profileMenuRef} style={{ position: "relative" }}>
                  <button
                    style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-primary)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                    onClick={() => setShowProfileMenu(v => !v)}
                  >
                    {(user.first_name || user.username || "?").charAt(0).toUpperCase()}
                  </button>
                  {showProfileMenu && (
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--color-bg-card)", borderRadius: 12, boxShadow: "var(--shadow-lg)", border: "1px solid var(--color-border)", minWidth: 220, zIndex: 1000, overflow: "hidden" }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{user.first_name} {user.last_name}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{user.email}</div>
                        <div style={{ fontSize: 11, color: "var(--color-primary)", marginTop: 2, fontWeight: 600 }}>{getRoleLabel(roleName)}</div>
                      </div>
                      {[
                        { label: t.profileMenu.cabinet, action: () => { setShowProfileMenu(false); navigate(getDashboardRoute(roleName)); } },
                        { label: t.profileMenu.catalog, action: () => { setShowProfileMenu(false); navigate("/catalog"); } },
                      ].map(item => (
                        <button key={item.label} onClick={item.action}
                          style={{ display: "block", width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)", fontFamily: "Inter, sans-serif", textAlign: "left" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-secondary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        >{item.label}</button>
                      ))}
                      <button onClick={handleLogout}
                        style={{ display: "block", width: "100%", padding: "11px 16px", background: "none", border: "none", borderTop: "1px solid var(--color-border)", cursor: "pointer", fontSize: 13, color: "#f5222d", fontFamily: "Inter, sans-serif", textAlign: "left" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,34,45,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >{t.profileMenu.logout}</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setShowRegister(true)}>{t.nav.register}</button>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowLogin(true)}>{t.nav.login}</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroText}>
          <div className={s.heroBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
            {t.hero.badge}
          </div>

          <h1 className={s.heroTitle}>
            {t.hero.line1}<br />
            <span className={s.heroAccent}>{t.hero.line2}</span><br />
            {t.hero.line3}
          </h1>

          <p className={s.heroSubtitle}>{t.hero.subtitle}</p>

          <div className={s.heroTrustRow}>
            <span className={s.heroTrustChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              {t.hero.trust1}
            </span>
            <span className={s.heroTrustChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {t.hero.trust2}
            </span>
            <span className={s.heroTrustChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              {t.hero.trust3}
            </span>
          </div>

          <div className={s.heroActions}>
            <button className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => navigate("/catalog")}>
              <IconSearch /> {t.hero.catalogBtn}
            </button>
            {user ? (
              <button className={`${s.btn} ${s.btnSecondary} ${s.btnLarge}`} onClick={() => navigate(getDashboardRoute(roleName))}>
                {t.hero.cabinetBtn} <IconArrow />
              </button>
            ) : (
              <button className={`${s.btn} ${s.btnSecondary} ${s.btnLarge}`} onClick={() => setShowLogin(true)}>
                {t.hero.loginBtn}
              </button>
            )}
          </div>

          <div className={s.heroStats}>
            {[
              { v: t.hero.stat1v, l: t.hero.stat1l },
              { v: t.hero.stat2v, l: t.hero.stat2l },
              { v: t.hero.stat3v, l: t.hero.stat3l },
            ].map(stat => (
              <div key={stat.l} className={s.heroStat}>
                <div className={s.heroStatValue}>{stat.v}</div>
                <div className={s.heroStatLabel}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.heroVisual}>
          <div className={s.heroCard}>
            <div className={s.heroCardMapArea}>
              <img
                src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=500&q=80"
                alt="apartment"
                className={s.heroCardPhoto}
              />
            </div>
            <div className={s.heroCardBody}>
              <div className={s.heroCardPrice}>85 000 000 ₸</div>
              <div className={s.heroCardTitle}>{t.hero.cardTitle}</div>
              <div className={s.heroCardAddr}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {t.hero.cardAddr}
              </div>
              <div className={s.heroCardTags}>
                <span className={s.heroCardTag}>{t.hero.cardTag1}</span>
                <span className={s.heroCardTag}>{t.hero.cardTag2}</span>
                <span className={s.heroCardTag}>{t.hero.cardTag3}</span>
              </div>
            </div>
          </div>
          <div className={`${s.heroFloat} ${s.heroFloat1}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#52c97a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {t.hero.float1}
          </div>
          <div className={`${s.heroFloat} ${s.heroFloat2}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {t.hero.float2}
          </div>
        </div>
      </section>

      {/* ── SECURITY ───────────────────────────────────────────────────────────── */}
      <section className={s.trustSection}>
        <div className={s.trustInner}>
          <div className={`${s.trustHead} ${s.reveal}`}>
            <div className={s.trustBadge}><IconShieldFill />{t.trust.badge}</div>
            <h2 className={s.trustTitle}>{t.trust.title1}<br />{t.trust.title2}</h2>
            <p className={s.trustSubtitle}>{t.trust.subtitle}</p>
          </div>
          <div className={s.trustGrid}>
            {[
              { icon: <IconShieldFill />, title: t.trust.p1t, desc: t.trust.p1d },
              { icon: <IconDocCheck />, title: t.trust.p2t, desc: t.trust.p2d },
              { icon: <IconEye />, title: t.trust.p3t, desc: t.trust.p3d },
            ].map((p, i) => (
              <div key={i} className={`${s.trustPillar} ${s.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={s.trustPillarIcon}>{p.icon}</div>
                <h3 className={s.trustPillarTitle}>{p.title}</h3>
                <p className={s.trustPillarDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────────── */}
      <section className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.sectionInner}>
          <div className={`${s.sectionHead} ${s.reveal}`}>
            <div className={s.sectionBadge}>{t.features.badge}</div>
            <h2 className={s.sectionTitle}>{t.features.title}</h2>
            <p className={s.sectionSubtitle}>{t.features.subtitle}</p>
          </div>
          <div className={s.featuresGrid}>
            {t.features.items.map((f, i) => (
              <div key={i} className={`${s.featureCard} ${s.reveal}`} style={{ transitionDelay: `${i * 70}ms` }}>
                <div className={s.featureNum} style={{ color: featureColors[i] }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className={s.featureTitle}>{f.title}</h3>
                <p className={s.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s.sectionInner}>
          <div className={`${s.sectionHead} ${s.reveal}`}>
            <div className={s.sectionBadge}>{t.steps.badge}</div>
            <h2 className={s.sectionTitle}>{t.steps.title}</h2>
            <p className={s.sectionSubtitle}>{t.steps.subtitle}</p>
          </div>
          <div className={s.stepsGrid}>
            {t.steps.items.map((step, i) => (
              <div key={i} className={`${s.stepCard} ${s.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={s.stepCircle}>
                  <span className={s.stepNumLarge}>{i + 1}</span>
                </div>
                <div>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p className={s.stepDesc}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────────── */}
      <section className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.sectionInner}>
          <div className={`${s.sectionHead} ${s.reveal}`}>
            <div className={s.sectionBadge}>{t.testimonials.badge}</div>
            <h2 className={s.sectionTitle}>{t.testimonials.title}</h2>
            <p className={s.sectionSubtitle}>{t.testimonials.subtitle}</p>
          </div>
          <div className={s.testimonialsGrid}>
            {t.testimonials.items.map((text, i) => (
              <div key={i} className={`${s.testimonialCard} ${s.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className={s.testimonialStars}>
                  {Array.from({ length: 5 }).map((_, j) => <IconStar key={j} />)}
                </div>
                <p className={s.testimonialText}>"{text}"</p>
                <div className={s.testimonialAuthor}>
                  <img src={testimonialPhotos[i]} alt={testimonialNames[i]} className={s.testimonialAvatar} />
                  <div>
                    <div className={s.testimonialName}>{testimonialNames[i]}</div>
                    <div className={s.testimonialCity}>{testimonialCities[i]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ──────────────────────────────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s.sectionInner}>
          <div className={`${s.sectionHead} ${s.reveal}`}>
            <div className={s.sectionBadge}>{t.roles.badge}</div>
            <h2 className={s.sectionTitle}>{t.roles.title}</h2>
            <p className={s.sectionSubtitle}>{t.roles.subtitle}</p>
          </div>
          <div className={s.rolesGrid}>
            {t.roles.items.map((role, i) => (
              <div key={i} className={`${s.roleCard} ${s.reveal}`} style={{ transitionDelay: `${i * 80}ms`, borderTop: `3px solid ${roleIcons[i].color}` }}>
                <div className={s.roleTop}>
                  <div className={s.roleIconWrap} style={{ background: roleIcons[i].bg, color: roleIcons[i].color }}>{roleIcons[i].icon}</div>
                  <div className={s.roleMeta}>
                    <div className={s.roleTag} style={{ color: roleIcons[i].color }}>{role.tag}</div>
                    <h3 className={s.roleTitle}>{role.title}</h3>
                  </div>
                </div>
                <ul className={s.roleList}>
                  {role.items.map((item, j) => (
                    <li key={j} className={s.roleItem}><IconCheck color={roleIcons[i].color} />{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────────── */}
      <section className={s.ctaSection}>
        <div className={`${s.ctaInner} ${s.reveal}`}>
          <div className={s.ctaBadge}>{t.cta.badge}</div>
          <h2 className={s.ctaTitle}>{t.cta.title}</h2>
          <p className={s.ctaSubtitle}>{t.cta.subtitle}</p>
          <div className={s.ctaActions}>
            <button className={s.ctaBtnPrimary} onClick={() => navigate("/catalog")}>
              <IconSearch /> {t.cta.catalogBtn}
            </button>
            {!user && (
              <button className={s.ctaBtnSecondary} onClick={() => setShowLogin(true)}>
                {t.cta.loginBtn} <IconArrow />
              </button>
            )}
            {user && (
              <button className={s.ctaBtnSecondary} onClick={() => navigate(getDashboardRoute(roleName))}>
                {t.cta.cabinetBtn} <IconArrow />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <img src="/assets/logo.png" alt="Qonys" />
            <p className={s.footerBrandText}>{t.footer.brand}</p>
          </div>
          <div className={s.footerCol}>
            <div className={s.footerColTitle}>{t.footer.catalogTitle}</div>
            <span className={s.footerLink} onClick={() => navigate("/catalog")}>{t.footer.catalogAll}</span>
            <span className={s.footerLink} onClick={() => navigate("/catalog")}>{t.footer.catalogRent}</span>
            <span className={s.footerLink} onClick={() => navigate("/catalog")}>{t.footer.catalogSale}</span>
          </div>
          <div className={s.footerCol}>
            <div className={s.footerColTitle}>{t.footer.bizTitle}</div>
            <span className={s.footerLink} style={{ opacity: 0.5, cursor: "default" }}>{t.footer.bizAgency}</span>
            <span className={s.footerLink} style={{ opacity: 0.5, cursor: "default" }}>{t.footer.bizDev}</span>
          </div>
          <div className={s.footerCol}>
            <div className={s.footerColTitle}>{t.footer.accountTitle}</div>
            {user ? (
              <span className={s.footerLink} onClick={() => navigate(getDashboardRoute(roleName))}>{t.footer.accountCabinet}</span>
            ) : (
              <>
                <span className={s.footerLink} onClick={() => setShowLogin(true)}>{t.footer.accountLogin}</span>
                <span className={s.footerLink} onClick={() => setShowRegister(true)}>{t.footer.accountRegister}</span>
              </>
            )}
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>{t.footer.copyright}</span>
          <span>{t.footer.country}</span>
        </div>
      </footer>

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}
      {showLogin && (
        <div className={s.modalOverlay} onClick={() => setShowLogin(false)}>
          <div className={`${s.modalContent} ${s.modalContentNarrow}`} onClick={e => e.stopPropagation()}>
            <Container onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
      {showRegister && (
        <div className={s.modalOverlay} onClick={() => setShowRegister(false)}>
          <div className={s.modalContent} onClick={e => e.stopPropagation()}>
            <SignUp onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
