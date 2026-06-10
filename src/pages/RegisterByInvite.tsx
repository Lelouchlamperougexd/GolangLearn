import { useState, type FunctionComponent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../css/SignUp.module.css";
import { registerCompany, getErrorMessage } from "../api/auth";
import { useAuth } from "../context/AuthContext";

const RegisterByInvite: FunctionComponent = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [bin, setBin] = useState("");
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValidForm =
    companyName.trim().length > 0 &&
    bin.trim().length > 0 &&
    city.length > 0 &&
    email.includes("@") &&
    email.includes(".") &&
    phone.trim().length >= 10 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    position.trim().length > 0 &&
    document !== null &&
    password.length >= 8 &&
    password === confirmPassword &&
    agreed;

  const handleSubmit = async () => {
    if (!isValidForm || !document) return;
    setError("");
    setLoading(true);
    try {
      const data = await registerCompany({
        city,
        company_email: email,
        company_name: companyName,
        company_phone: phone,
        company_type: "agency",
        first_name: firstName,
        job_title: position,
        last_name: lastName,
        password,
        password_confirmation: confirmPassword,
        registration_number: bin,
        invite_token: token,
        document,
      });
      const { token: authToken, ...user } = data;
      login(authToken, user as Parameters<typeof login>[1]);
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbfb", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Недействительная ссылка</div>
          <div style={{ fontSize: 14, color: "#939393", marginBottom: 24 }}>Токен приглашения отсутствует или ссылка повреждена.</div>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 24px", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}
          >На главную</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbfb", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40, maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff7e6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Заявка отправлена</div>
          <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.6, marginBottom: 24 }}>
            Ваша заявка на регистрацию компании <strong>{companyName}</strong> отправлена администратору. Обычно проверка занимает до 24 часов.
          </div>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 24px", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}
          >На главную</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fbfbfb", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 600, background: "#fff", borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Регистрация по приглашению</div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 4 }}>Заполните данные для регистрации компании</div>
          </div>
          <img src="/assets/logo.png" alt="Qonys" style={{ height: 48, objectFit: "contain" }} />
        </div>

        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#939393", textTransform: "uppercase", letterSpacing: "0.5px" }}>Информация о компании</div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Название компании<span>*</span></label>
              <input type="text" className={styles.input} placeholder="ТОО Городская Недвижимость" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Регистрационный номер (БИН)<span>*</span></label>
              <input type="text" className={styles.input} placeholder="БИН/ИИН" value={bin} onChange={e => setBin(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Город<span>*</span></label>
              <select className={styles.select} value={city} onChange={e => setCity(e.target.value)} disabled={loading}>
                <option value="" disabled>Выберите город</option>
                <option value="almaty">Алматы</option>
                <option value="astana">Астана</option>
                <option value="shymkent">Шымкент</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email компании<span>*</span></label>
              <input type="email" className={styles.input} placeholder="info@company.kz" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Телефон компании<span>*</span></label>
              <input type="tel" className={styles.input} placeholder="+7 700 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Документ о регистрации<span>*</span></label>
              <label
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  border: `1.5px dashed ${document ? "#15a34a" : "#cdd3da"}`, borderRadius: 8,
                  background: document ? "#f1faf4" : "#fafbfc",
                  cursor: loading ? "default" : "pointer", color: document ? "#15a34a" : "#595959", fontSize: 14,
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
                  {document ? document.name : "Прикрепить файл"}
                </span>
              </label>
              <div style={{ fontSize: 12, color: "#939393", marginTop: 6 }}>Свидетельство о регистрации (PDF, JPG или PNG)</div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: "#939393", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 8 }}>Контактное лицо</div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Имя<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Имя" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Фамилия<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Фамилия" value={lastName} onChange={e => setLastName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Должность<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Директор" value={position} onChange={e => setPosition(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Пароль<span>*</span></label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.passwordInput}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="button" className={styles.eyeButton} onClick={() => setShowPassword(v => !v)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Повторите пароль<span>*</span></label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.passwordInput}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="button" className={styles.eyeButton} onClick={() => setShowConfirmPassword(v => !v)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showConfirmPassword
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <div style={{ color: "#e53e3e", fontSize: 12, marginTop: -8 }}>Пароли не совпадают</div>
          )}

          <label className={styles.checkboxRow}>
            <input type="checkbox" className={styles.checkbox} checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>Я принимаю условия сервиса и согласен(а) на обработку персональных данных.</span>
          </label>

          {error && (
            <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 6, border: "1px solid #fed7d7" }}>
              {error}
            </div>
          )}

          <button
            className={styles.buttonPrimary}
            disabled={!isValidForm || loading}
            style={{
              background: isValidForm && !loading ? "#70a0ff" : "#d2d2d2",
              cursor: isValidForm && !loading ? "pointer" : "not-allowed",
              opacity: loading ? 0.7 : 1,
              marginTop: 8,
            }}
            onClick={handleSubmit}
          >
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterByInvite;
