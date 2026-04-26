import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Login.module.css";
import { loginUser, getErrorMessage, requestPasswordReset, confirmPasswordReset } from "../api/auth";
import { useAuth } from "../context/AuthContext";

type Props = {
  onClose: () => void;
  onLoginSuccess?: (roleName: string) => void;
};

type Step = "login" | "forgot-email" | "forgot-confirm" | "forgot-done";

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
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

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
      setStep("forgot-confirm");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetToken.trim() || newPassword.length < 8 || newPassword !== confirmPassword) return;
    setError("");
    setLoading(true);
    try {
      await confirmPasswordReset({
        token: resetToken.trim(),
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setStep("forgot-done");
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
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
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

  if (step === "forgot-confirm") {
    const isValid = resetToken.trim().length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;
    return (
      <div className={styles.container}>
        <div className={styles.container2}>
          <div className={styles.heading2}>
            <div className={styles.div}>Введите код</div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.container3}>
          <div className={styles.paragraph}>
            <div className={styles.div2}>
              Код отправлен на <strong>{resetEmail}</strong>. Введите его и задайте новый пароль.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            <div>
              <label style={labelStyle}>Код из письма<span style={{ color: "#e53e3e" }}>*</span></label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Вставьте код из email"
                value={resetToken}
                onChange={e => setResetToken(e.target.value)}
                disabled={loading}
                autoComplete="one-time-code"
              />
            </div>

            <div>
              <label style={labelStyle}>Новый пароль<span style={{ color: "#e53e3e" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 44 }}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Не менее 8 символов"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#939393", padding: 0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showNewPassword
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Повторите пароль<span style={{ color: "#e53e3e" }}>*</span></label>
              <input
                style={inputStyle}
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConfirmReset()}
                disabled={loading}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 4 }}>Пароли не совпадают</div>
              )}
            </div>

            {error && (
              <div style={{ color: "#e53e3e", fontSize: 13, padding: "10px 14px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
                {error}
              </div>
            )}

            <button
              className={styles.button}
              onClick={handleConfirmReset}
              disabled={!isValid || loading}
              style={{ opacity: (!isValid || loading) ? 0.7 : 1 }}
            >
              {loading ? "Сохраняем..." : "Сохранить пароль"}
            </button>

            <button
              onClick={() => { setStep("forgot-email"); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#70a0ff", padding: 0, textAlign: "center" }}
            >
              ← Отправить код повторно
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "forgot-done") {
    return (
      <div className={styles.container}>
        <div className={styles.container2}>
          <div className={styles.heading2}>
            <div className={styles.div}>Готово!</div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.container3} style={{ textAlign: "center", paddingTop: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f6ffed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52c97a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Пароль успешно изменён</div>
          <div style={{ fontSize: 13, color: "#939393", marginBottom: 24 }}>Теперь вы можете войти с новым паролем</div>
          <button className={styles.button} onClick={goBack}>Войти</button>
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
