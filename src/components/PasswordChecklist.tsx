import type { FunctionComponent } from "react";
import { useLang } from "../context/LanguageContext";
import { translations } from "../i18n/translations";
import { checkPassword } from "../utils/password";

/** Live checklist of the backend password requirements, shown while typing a password. */
const PasswordChecklist: FunctionComponent<{ password: string }> = ({ password }) => {
  const { lang } = useLang();
  const t = translations[lang].signup;
  const c = checkPassword(password);

  const rules: { ok: boolean; label: string }[] = [
    { ok: c.len, label: t.pwLen },
    { ok: c.upper, label: t.pwUpper },
    { ok: c.lower, label: t.pwLower },
    { ok: c.digit, label: t.pwDigit },
    { ok: c.special, label: t.pwSpecial },
  ];

  return (
    <div style={{ marginTop: 6, marginBottom: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#595959", marginBottom: 6 }}>{t.passwordHint}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        {rules.map(r => (
          <span
            key={r.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: r.ok ? "#15a34a" : "#9aa0a6",
              transition: "color .15s ease",
            }}
          >
            {r.ok ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9" /></svg>
            )}
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PasswordChecklist;
