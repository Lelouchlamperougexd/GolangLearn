import { useEffect, useState, type FunctionComponent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styles from "../css/SignUp.module.css";
import { activateUser, getErrorMessage, resendActivation } from "../api/auth";

type Props = {
  email?: string;
  onClose?: () => void;
  embedded?: boolean;
};

function extractActivationToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const queryToken = url.searchParams.get("token");
    if (queryToken) return queryToken;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? trimmed;
  } catch {
    return trimmed;
  }
}

const ConfirmEmail: FunctionComponent<Props> = ({ email = "", onClose, embedded = false }) => {
  const navigate = useNavigate();
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const initialToken = routeToken ?? searchParams.get("token") ?? "";

  const [emailValue, setEmailValue] = useState(email);
  const [code, setCode] = useState(initialToken);
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);

  const handleConfirm = async (rawCode = code) => {
    const token = extractActivationToken(rawCode);
    if (!token) return;

    setError("");
    setMessage("");
    setConfirming(true);

    try {
      await activateUser(token);
      setStatus("success");
      setMessage("Email подтверждён. Теперь можно войти в аккаунт.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleResend = async () => {
    if (!emailValue.includes("@")) return;

    setError("");
    setMessage("");
    setResending(true);

    try {
      await resendActivation(emailValue);
      setMessage("Письмо отправлено повторно. Проверьте почту и папку «Спам».");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      void handleConfirm(initialToken);
    }
    // Run once for email links that open /confirm/:token or /?token=...
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={embedded ? undefined : styles.container}
      style={embedded ? { width: "100%", height: "auto", background: "#fff", textAlign: "center", fontFamily: "Inter, sans-serif" } : { height: "auto", maxHeight: "90vh" }}
    >
      {!embedded && (
        <div className={styles.container18} style={{ position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
          <div className={styles.heading2}>
            <div className={styles.div10}>Подтвердите email</div>
          </div>
          {onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      )}

      <div className={embedded ? undefined : styles.container2Outer} style={embedded ? { width: "100%", display: "flex", justifyContent: "center" } : undefined}>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 18, textAlign: "center", paddingTop: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: status === "success" ? "#f6ffed" : "#f0f7ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            {status === "success" ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#52c97a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <img src="/assets/email.svg" alt="" style={{ width: 30, height: 30 }} />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>
              {status === "success" ? "Аккаунт активирован" : "Проверьте почту"}
            </div>
            <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.6 }}>
              {status === "success"
                ? "Регистрация завершена. Войдите с email и паролем, которые указали при регистрации."
                : "Мы отправили письмо со ссылкой подтверждения. Перейдите по ссылке или вставьте код из письма ниже."}
            </div>
          </div>

          {status !== "success" && (
            <div className={styles.form} style={{ gap: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Код или ссылка из письма</label>
                <input
                  className={styles.input}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  placeholder="Вставьте код или ссылку"
                  disabled={confirming}
                  autoComplete="one-time-code"
                />
              </div>

              <button
                className={styles.buttonPrimary}
                onClick={() => handleConfirm()}
                disabled={!code.trim() || confirming}
                style={{ width: "100%", flex: "none", opacity: !code.trim() || confirming ? 0.7 : 1 }}
              >
                {confirming ? "Проверяем..." : "Подтвердить"}
              </button>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email для повторной отправки</label>
                <input
                  className={styles.input}
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="user@example.com"
                  disabled={resending}
                  autoComplete="email"
                />
              </div>

              <button
                className={styles.buttonSecondary}
                onClick={handleResend}
                disabled={!emailValue.includes("@") || resending}
                style={{ width: "100%", flex: "none", opacity: !emailValue.includes("@") || resending ? 0.7 : 1 }}
              >
                {resending ? "Отправляем..." : "Отправить письмо повторно"}
              </button>
            </div>
          )}

          {message && (
            <div style={{ color: "#237804", fontSize: 13, padding: "10px 14px", background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f", lineHeight: 1.5 }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ color: "#e53e3e", fontSize: 13, padding: "10px 14px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {status === "success" && (
            <button
              className={styles.buttonPrimary}
              style={{ width: "100%", flex: "none" }}
              onClick={() => {
                if (onClose) onClose();
                navigate("/");
              }}
            >
              Перейти ко входу
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
