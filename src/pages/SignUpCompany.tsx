import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/SignUp.module.css";
import { registerCompany, getErrorMessage } from "../api/auth";
import { useLang } from "../context/LanguageContext";
import { translations } from "../i18n/translations";
import ConfirmEmail from "./ConfirmEmail";
import { isStrongPassword } from "../utils/password";
import { isValidBin, normalizeBin } from "../utils/bin";
import { verifyBin } from "../api/bin";
import PasswordChecklist from "../components/PasswordChecklist";

type BinStatus = "idle" | "checking" | "format" | "notfound" | "valid" | "error";

type Props = { role?: "agency" | "developer"; onClose: () => void; onBack: () => void };

const SignUpCompany: FunctionComponent<Props> = ({ role = "agency", onClose, onBack }) => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = translations[lang].signup;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [bin, setBin] = useState("");
  const [binStatus, setBinStatus] = useState<BinStatus>("idle");
  const [binName, setBinName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValidForm =
    companyName.trim().length > 0 && binStatus === "valid" && city.length > 0 &&
    email.includes("@") && email.includes(".") && phone.trim().length >= 10 &&
    firstName.trim().length > 0 && lastName.trim().length > 0 && position.trim().length > 0 &&
    document !== null && isStrongPassword(password) && password === confirmPassword && agreed;

  const handleBinChange = (raw: string) => {
    setBin(normalizeBin(raw));
    setBinStatus("idle");
    setBinName("");
  };

  const checkBin = async () => {
    if (!isValidBin(bin)) { setBinStatus("format"); return; }
    setBinStatus("checking");
    try {
      const { exists, name } = await verifyBin(bin);
      if (exists) { setBinStatus("valid"); setBinName(name ?? ""); }
      else { setBinStatus("notfound"); }
    } catch {
      setBinStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!isValidForm || !document) return;
    setError(""); setLoading(true);
    try {
      await registerCompany({ city, company_email: email, company_name: companyName, company_phone: phone, company_type: role, first_name: firstName, job_title: position, last_name: lastName, password, password_confirmation: confirmPassword, registration_number: bin, document });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const EyeOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  const EyeOn = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  if (submitted) {
    return (
      <div className={styles.container} style={{ height: "auto" }}>
        <div className={styles.container18}>
          <div className={styles.heading2}><div className={styles.div10}>{t.submitted}</div></div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff7e6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>{t.awaitVerification}</div>
          <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.6, maxWidth: 340, whiteSpace: "pre-line" }}>
            {t.verificationDesc(companyName)}
          </div>
          <div style={{ width: "100%", maxWidth: 440 }}>
            <ConfirmEmail email={email} embedded />
          </div>
          <div style={{ padding: "12px 20px", background: "#fffbe6", borderRadius: 8, border: "1px solid #ffe58f", fontSize: 13, color: "#7c4a00", textAlign: "left", width: "100%", maxWidth: 340 }}>
            {t.verificationNote}
          </div>
          <button className={styles.buttonPrimary} style={{ backgroundColor: "#70a0ff", marginTop: 8 }} onClick={() => { onClose(); navigate("/"); }}>
            {t.backToHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ height: "auto", maxHeight: "90vh" }}>
      <div className={styles.container18} style={{ position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <div className={styles.heading2}><div className={styles.div10}>{t.title}</div></div>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>

      <div className={styles.container2Outer}>
        <div className={styles.paragraph} style={{ marginBottom: "24px", textAlign: "center", width: "100%" }}>
          <div className={styles.div}>{t.step2}</div>
        </div>

        <div className={styles.form}>
          <div className={styles.sectionTitle}>{t.companyInfo}</div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>{t.companyName}<span>*</span></label>
              <input type="text" className={styles.input} placeholder="ТОО Городская Недвижимость" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.regNumber}<span>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="БИН/ИИН"
                  value={bin}
                  onChange={e => handleBinChange(e.target.value)}
                  onBlur={() => { if (bin.length === 12 && binStatus === "idle") checkBin(); }}
                  disabled={loading}
                  inputMode="numeric"
                  maxLength={12}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={checkBin}
                  disabled={loading || binStatus === "checking" || bin.length !== 12}
                  style={{
                    flexShrink: 0, padding: "0 16px", height: 44, borderRadius: 8,
                    border: "1px solid #70a0ff", background: binStatus === "valid" ? "#eaf6ee" : "#fff",
                    color: "#70a0ff", fontSize: 14, fontWeight: 500,
                    cursor: bin.length === 12 && binStatus !== "checking" ? "pointer" : "not-allowed",
                    opacity: bin.length === 12 && binStatus !== "checking" ? 1 : 0.6,
                  }}
                >
                  {binStatus === "checking" ? "…" : binStatus === "valid" ? "✓" : t.binCheck}
                </button>
              </div>
              {binStatus === "checking" && <div style={{ fontSize: 12, color: "#595959", marginTop: 6 }}>{t.binChecking}</div>}
              {binStatus === "format" && <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 6 }}>{t.binFormatInvalid}</div>}
              {binStatus === "notfound" && <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 6 }}>{t.binNotFound}</div>}
              {binStatus === "error" && <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 6 }}>{t.binError}</div>}
              {binStatus === "valid" && <div style={{ fontSize: 12, color: "#15a34a", marginTop: 6 }}>{t.binFound} {binName || "✓"}</div>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.city}<span>*</span></label>
              <select className={styles.select} value={city} onChange={e => setCity(e.target.value)} disabled={loading}>
                <option value="" disabled>{t.selectCity}</option>
                <option value="almaty">Алматы</option>
                <option value="astana">Астана</option>
                <option value="shymkent">Шымкент</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.companyEmail}<span>*</span></label>
              <input type="email" className={styles.input} placeholder="info@company.kz" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.companyPhone}<span>*</span></label>
              <input type="tel" className={styles.input} placeholder="+7 700 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>{t.document}<span>*</span></label>
              <label
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  border: `1.5px dashed ${document ? "#15a34a" : "#cdd3da"}`, borderRadius: 8,
                  background: document ? "#f1faf4" : "#fafbfc",
                  cursor: loading ? "default" : "pointer", color: document ? "#15a34a" : "#595959",
                  fontSize: 14, fontFamily: "inherit",
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                  style={{ display: "none" }}
                  disabled={loading}
                  onChange={e => setDocument(e.target.files?.[0] ?? null)}
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {document ? document.name : t.documentChoose}
                </span>
                {document && <span style={{ marginLeft: "auto", fontSize: 12, color: "#70a0ff" }}>{t.documentChange}</span>}
              </label>
              <div style={{ fontSize: 12, color: "#939393", marginTop: 6 }}>{t.documentHint}</div>
            </div>
          </div>

          <div className={styles.divider} />
          <div className={styles.sectionTitle}>{t.contactPerson}</div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.firstName}<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Алексей" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.lastName}<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Иванов" value={lastName} onChange={e => setLastName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>{t.position}<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Директор" value={position} onChange={e => setPosition(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.password}<span>*</span></label>
              <div className={styles.passwordWrapper}>
                <input type={showPassword ? "text" : "password"} className={`${styles.input} ${styles.passwordInput}`} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                <button type="button" className={styles.eyeButton} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.confirmPassword}<span>*</span></label>
              <div className={styles.passwordWrapper}>
                <input type={showConfirmPassword ? "text" : "password"} className={`${styles.input} ${styles.passwordInput}`} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} />
                <button type="button" className={styles.eyeButton} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>
          </div>

          {password.length > 0 && <PasswordChecklist password={password} />}

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <div style={{ color: "#e53e3e", fontSize: "12px", marginTop: "-8px", marginBottom: "4px" }}>{t.passwordMismatch}</div>
          )}

          <label className={styles.checkboxRow}>
            <input type="checkbox" className={styles.checkbox} checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>{t.agree}</span>
          </label>

          {error && (
            <div style={{ color: "#e53e3e", fontSize: "13px", padding: "8px 12px", background: "#fff5f5", borderRadius: "6px", border: "1px solid #fed7d7" }}>{error}</div>
          )}

          <div className={styles.actions}>
            <button className={styles.buttonSecondary} onClick={onBack} disabled={loading}>{t.back}</button>
            <button
              className={styles.buttonPrimary}
              disabled={!isValidForm || loading}
              style={{ backgroundColor: isValidForm && !loading ? "#70a0ff" : "#d2d2d2", cursor: isValidForm && !loading ? "pointer" : "not-allowed", transition: "all 0.3s ease", opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
            >
              {loading ? t.registering : t.register}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpCompany;
