import { useState, type FunctionComponent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { confirmPasswordReset, getErrorMessage } from "../api/auth";

const ResetPassword: FunctionComponent = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!isValid || !token) return;
    setError("");
    setLoading(true);
    try {
      await confirmPasswordReset({
        token,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 44px 0 14px",
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

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbfb", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Недействительная ссылка</div>
          <div style={{ fontSize: 14, color: "#939393", marginBottom: 24 }}>Токен сброса пароля отсутствует или ссылка повреждена.</div>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 24px", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}
          >На главную</button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbfb", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40, maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f6ffed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#52c97a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Пароль успешно изменён</div>
          <div style={{ fontSize: 14, color: "#939393", marginBottom: 24 }}>Теперь вы можете войти с новым паролем</div>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 32px", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 500 }}
          >Войти</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fbfbfb", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/assets/logo.png" alt="Qonys" style={{ height: 40, objectFit: "contain" }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>Новый пароль</div>
        </div>

        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, color: "#737373" }}>
            Придумайте новый пароль для вашего аккаунта
          </div>

          <div>
            <label style={labelStyle}>Новый пароль<span style={{ color: "#e53e3e" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input
                style={inputStyle}
                type={showNew ? "text" : "password"}
                placeholder="Не менее 8 символов"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#939393", padding: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showNew
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 4 }}>Минимум 8 символов</div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Повторите пароль<span style={{ color: "#e53e3e" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input
                style={inputStyle}
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#939393", padding: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showConfirm
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
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
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{
              width: "100%",
              height: 48,
              background: isValid && !loading ? "#70a0ff" : "#d2d2d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: isValid && !loading ? "pointer" : "not-allowed",
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
              transition: "background 0.2s",
            }}
          >
            {loading ? "Сохраняем..." : "Сохранить пароль"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
