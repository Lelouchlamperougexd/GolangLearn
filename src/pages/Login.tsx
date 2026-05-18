import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Login.module.css";
import { loginUser, getErrorMessage, requestPasswordReset } from "../api/auth";
import { useAuth } from "../context/AuthContext";

type Props = {
  onClose: () => void;
  onLoginSuccess?: (roleName: string) => void;
};

type Step = "login" | "forgot-email" | "forgot-sent";

const Container: FunctionComponent<Props> = ({ onClose, onLoginSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidLogin = email.includes("@") && email.includes(".") && password.length >= 3;

  const handleLogin = async () => {
    if (!isValidLogin) return;
    setError("");
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      login(data.token, data.user);
      const roleName = data.user?.role?.name ?? "";
      if (onLoginSuccess) {
        onClose();
        onLoginSuccess(roleName);
      } else {
        onClose();
        if (roleName === "admin" || roleName === "moderator") navigate("/admin");
        else if (roleName === "agency") navigate("/agency");
        else if (roleName === "developer") navigate("/developer");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!resetEmail.includes("@")) return;
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(resetEmail);
      setStep("forgot-sent");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  const goBack = () => {
    setStep("login");
    setError("");
    setResetEmail("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    border: "1.5px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    color: "#1a1a2e",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: "#3a3a3a",
    marginBottom: 6,
    display: "block",
  };

  // ── ШАГИ "ЗАБЫЛ ПАРОЛЬ" ──────────────────────────────────────────────────

  if (step === "forgot-email") {
    return (
      <div className={styles.container}>
        <div className={styles.container2}>
          <div className={styles.heading2}>
            <div className={styles.div}>Восстановление пароля</div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.container3}>
          <div className={styles.paragraph}>
            <div className={styles.div2}>
              Введите email — мы отправим код для сброса пароля
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
            <div>
              <label style={labelStyle}>Email<span style={{ color: "#e53e3e" }}>*</span></label>
              <input
                style={inputStyle}
                type="email"
                placeholder="user@example.com"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRequestReset()}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {error && (
              <div style={{ color: "#e53e3e", fontSize: 13, padding: "10px 14px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
                {error}
              </div>
            )}

            <button
              className={styles.button}
              onClick={handleRequestReset}
              disabled={!resetEmail.includes("@") || loading}
              style={{ opacity: (!resetEmail.includes("@") || loading) ? 0.7 : 1 }}
            >
              {loading ? "Отправляем..." : "Отправить код"}
            </button>

            <button
              onClick={goBack}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#70a0ff", padding: 0, textAlign: "center" }}
            >
              ← Вернуться к входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "forgot-sent") {
    return (
      <div className={styles.container}>
        <div className={styles.container2}>
          <div className={styles.heading2}>
            <div className={styles.div}>Проверьте почту</div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.container3} style={{ textAlign: "center", paddingTop: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eef3ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Письмо отправлено</div>
          <div style={{ fontSize: 13, color: "#595959", lineHeight: 1.6, marginBottom: 24 }}>
            Мы отправили ссылку для сброса пароля на <strong>{resetEmail}</strong>.<br />
            Перейдите по ней, чтобы задать новый пароль.
          </div>
          <button
            onClick={goBack}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#70a0ff", padding: 0 }}
          >
            ← Вернуться к входу
          </button>
        </div>
      </div>
    );
  }

  // ── ОСНОВНАЯ ФОРМА ВХОДА ──────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.container2}>
        <div className={styles.heading2}>
          <div className={styles.div}>Войти</div>
        </div>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>

      <div className={styles.container3}>
        <div className={styles.paragraph}>
          <div className={styles.div2}>Войдите в свой аккаунт для использования платформы</div>
        </div>

        <div className={styles.container4}>
          <div className={styles.container5}>
            <div className={styles.label}>
              <div className={styles.email}>Email<span className={styles.span}>*</span></div>
            </div>
            <div className={styles.container6}>
              <input
                id="login-email"
                className={styles.emailInput}
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                disabled={loading}
                autoComplete="email"
              />
              <img src="/assets/email.svg" className={styles.icon} alt="" />
            </div>
          </div>

          <div className={styles.container5}>
            <div className={styles.label}>
              <div className={styles.email}>Пароль<span className={styles.span}>*</span></div>
            </div>
            <div className={styles.container6}>
              <input
                id="login-password"
                className={styles.passwordInput}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                disabled={loading}
                autoComplete="current-password"
              />
              <img src="/assets/password.svg" className={styles.icon} alt="" />
              <img
                src="/assets/password2.svg"
                className={styles.buttonIcon2}
                alt="Показать пароль"
                style={{ cursor: "pointer" }}
                onClick={() => setShowPassword(v => !v)}
              />
            </div>
          </div>
        </div>

        {/* Forgot password link */}
        <div style={{ textAlign: "right", marginTop: -4 }}>
          <button
            onClick={() => { setStep("forgot-email"); setResetEmail(email); setError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#70a0ff", padding: 0 }}
          >
            Забыли пароль?
          </button>
        </div>

        {error && (
          <div style={{ color: "#e53e3e", fontSize: 13, marginTop: 8, padding: "10px 14px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <button
          id="login-submit"
          className={styles.button}
          onClick={handleLogin}
          disabled={!isValidLogin || loading}
          style={{ opacity: loading || !isValidLogin ? 0.7 : 1 }}
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </div>
    </div>
  );
};

export default Container;
