import { useState, useEffect, useRef, useCallback, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../api/admin";
import {
  getMyApplications,
  getChats,
  getMessages,
  sendMessage,
  markMessagesRead,
  connectChatMessagesSocket,
  updateApplicationStatus,
  getCompanyListings,
  createListing,
  updateListing,
  deleteListing,
  getListing,
  uploadListingMedia,
  updateProfile,
  uploadAvatar,
  changePassword,
  statusLabel,
  statusColor,
  type Application,
  type ChatSummary,
  type ApplicationMessage,
  type CompanyListing,
  type CreateListingPayload,
} from "../api/dashboard";
import { getErrorMessage } from "../api/auth";
import MapPicker from "../components/MapPicker";
import s from "../css/AgencyDashboard.module.css";

const logo = "/assets/logo.png";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

function fmtTime(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return ""; }
}

function fmtDateLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
}

function listingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active:     "Активно",
    moderation: "На модерации",
    rejected:   "Отклонено",
    draft:      "Черновик",
    archived:   "Архив",
  };
  return map[status] ?? status;
}

function badgeClass(st: Record<string, string>, status: string) {
  const map: Record<string, string> = {
    active:     "badgeActive",
    moderation: "badgeModerate",
    rejected:   "badgeRejected",
    draft:      "badgeDraft",
    archived:   "badge",
    // legacy Russian keys kept for compatibility
    "Активно":      "badgeActive",
    "На проверке":  "badgePending",
    "На модерации": "badgeModerate",
    "Отклонено":    "badgeRejected",
    "Черновик":     "badgeDraft",
  };
  return `${st.badge} ${st[map[status] || "badge"] || ""}`;
}

function appStatusColor(status: string) {
  return statusColor(status);
}

const ITEMS_PER_PAGE = 8;

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    title: "Добро пожаловать в кабинет агентства",
    desc: "Здесь вы можете управлять объявлениями, заявками и коммуникацией с клиентами.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    title: "Добавление объявления",
    desc: "Создайте объект: задайте название и отправьте его на модерацию. После одобрения объявление станет доступным пользователям.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
        <path d="M14 2v6h6M12 18v-6M9 15h6"/>
      </svg>
    ),
  },
  {
    title: "Работа с заявками",
    desc: "Здесь пользователи будут обращаться за разделов «Заявки». Вы можете связаться с ними прямо через встроенный чат.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    title: "Статусы объявлений",
    desc: "Каждое объявление имеет статус: активное, На модерации, Не одобрено. Вы узнаете о статусе объявления в разделе Объявления.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
  },
];

// ─── AGENCY CHAT WINDOW ───────────────────────────────────────────────────────

function AgencyChatWindow({
  chat, userId, onBack,
}: { chat: ChatSummary; userId: number; onBack: () => void }) {
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshMessages = async () => {
      try {
        const data = await getMessages(chat.application_id);
        if (!cancelled) setMessages(data);
        await markMessagesRead(chat.application_id);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshMessages();
    const intervalID = window.setInterval(refreshMessages, 30000);
    const socket = connectChatMessagesSocket(chat.application_id, event => {
      if (event.type === "message_created" && event.message) {
        const message = event.message;
        setMessages(prev => (
          prev.some(msg => msg.id === message.id) ? prev : [...prev, message]
        ));
        markMessagesRead(chat.application_id).catch(console.error);
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(intervalID);
      socket?.close();
    };
  }, [chat.application_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(chat.application_id, body);
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const senderName = chat.user_name || chat.company_name;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", display: "flex", flexDirection: "column", height: 600 }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#939393", padding: 0 }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0f7ff", color: "#70a0ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
          {senderName.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{senderName}</div>
          <div style={{ fontSize: 12, color: "#939393" }}>{chat.listing_title}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && <div style={{ textAlign: "center", color: "#ccc", fontSize: 14 }}>Загрузка...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#b0b0b0", fontSize: 14, marginTop: 40 }}>
            Сообщений пока нет. Начните диалог первыми.
          </div>
        )}
        {messages.reduce<React.ReactNode[]>((acc, msg, i) => {
          const msgDay = msg.created_at.slice(0, 10);
          const prevDay = i > 0 ? messages[i - 1].created_at.slice(0, 10) : null;
          if (msgDay !== prevDay) {
            acc.push(
              <div key={`sep-${msgDay}`} style={{ textAlign: "center", fontSize: 12, color: "#b0b0b0", margin: "12px 0", userSelect: "none", alignSelf: "center" }}>
                <span style={{ background: "#f0f0f0", padding: "2px 12px", borderRadius: 10 }}>
                  {fmtDateLabel(msg.created_at)}
                </span>
              </div>
            );
          }
          const isSent = msg.sender_user_id === userId;
          acc.push(
            <div key={msg.id} style={{ alignSelf: isSent ? "flex-end" : "flex-start", maxWidth: "70%" }}>
              <div style={{
                padding: "12px 16px", borderRadius: isSent ? "16px 16px 0 16px" : "16px 16px 16px 0",
                background: isSent ? "#70a0ff" : "#f5f5f5", color: isSent ? "#fff" : "#1a1a2e",
                fontSize: 14, lineHeight: 1.5
              }}>{msg.body}</div>
              <div style={{ fontSize: 11, color: "#939393", marginTop: 4, textAlign: isSent ? "right" : "left" }}>
                {fmtTime(msg.created_at)}
              </div>
            </div>
          );
          return acc;
        }, [])}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #f0f0f0", display: "flex", gap: 12 }}>
        <input
          type="text"
          style={{ flex: 1, padding: "0 16px", height: 44, borderRadius: 22, border: "1px solid #e8e8e8", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif" }}
          placeholder="Написать сообщение..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ width: 44, height: 44, borderRadius: "50%", background: sending ? "#ccc" : "#70a0ff", border: "none", cursor: sending ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── LISTINGS PAGE ────────────────────────────────────────────────────────────

function ListingsPage({
  listings, loading, error, onAdd, onRefresh, onSelect, onEdit, onDelete,
}: {
  listings: CompanyListing[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onRefresh: () => void;
  onSelect: (l: CompanyListing) => void;
  onEdit: (l: CompanyListing) => void;
  onDelete: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Все");
  const [filterDeal, setFilterDeal] = useState("Все");
  const [page, setPage] = useState(1);

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q);
    const matchStatus = filterStatus === "Все" || listingStatusLabel(l.status) === filterStatus;
    const matchDeal = filterDeal === "Все" || (filterDeal === "Аренда" ? l.deal_type === "rent" : l.deal_type === "sale");
    return matchSearch && matchStatus && matchDeal;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = {
    total:      listings.length,
    active:     listings.filter(l => l.status === "active").length,
    moderation: listings.filter(l => l.status === "moderation").length,
    views:      0, // not returned by API
    apps:       0, // not returned by API
  };

  return (
    <>
      <div className={s.statsRow}>
        {[
          { label: "Всего объявлений", value: stats.total,      cls: "statCardIconBlue",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg> },
          { label: "Активно",          value: stats.active,     cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: "На модерации",     value: stats.moderation, cls: "statCardIconOrange", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
        ].map(card => (
          <div key={card.label} className={s.statCard}>
            <div className={s.statCardTop}>
              <div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div>
            </div>
            <div className={s.statCardValue}>{card.value}</div>
            <div className={s.statCardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={s.toolbar}>
        <input
          className={s.searchInput}
          placeholder="Поиск объявлений..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className={s.filterSelect} value={filterDeal} onChange={e => { setFilterDeal(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option>Аренда</option>
          <option>Продажа</option>
        </select>
        <select className={s.filterSelect} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option>Активно</option>
          <option>На модерации</option>
          <option>Отклонено</option>
          <option>Черновик</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className={s.btnAdd} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Добавить объявление
        </button>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#70a0ff", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#939393" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", marginBottom: 6 }}>
              {listings.length === 0 ? "Объявлений пока нет" : "Нет совпадений по фильтру"}
            </div>
            {listings.length === 0 && (
              <div style={{ fontSize: 13, color: "#b0b0b0" }}>Нажмите «Добавить объявление», чтобы создать первое</div>
            )}
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Фото</th>
                <th className={s.th}>Название объекта</th>
                <th className={s.th}>Тип</th>
                <th className={s.th}>Статус</th>
                <th className={s.th}>Цена</th>
                <th className={s.th}>Дата</th>
                <th className={s.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => (
                <tr key={item.id} className={s.tr} style={{ cursor: "pointer" }} onClick={e => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  onSelect(item);
                }}>
                  <td className={s.td}>
                    <div className={s.propImgPlaceholder}>
                      {item.media?.[0]?.url ? (
                        <img src={item.media[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      )}
                    </div>
                  </td>
                  <td className={s.td} style={{ maxWidth: 200, fontWeight: 500 }}>{item.title}</td>
                  <td className={s.td}>{item.deal_type === "rent" ? "Аренда" : "Продажа"}</td>
                  <td className={s.td}><span className={badgeClass(s, item.status)}>{listingStatusLabel(item.status)}</span></td>
                  <td className={s.td}>{item.price.toLocaleString("ru-RU")} ₸</td>
                  <td className={s.td}>{fmtDate(item.created_at)}</td>
                  <td className={s.td}>
                    <div className={s.rowActions}>
                      <button className={s.rowBtn} title="Просмотр" onClick={() => onSelect(item)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className={s.rowBtn} title="Редактировать" onClick={() => onEdit(item)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className={s.rowBtn} title="Удалить" onClick={() => onDelete(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && pageItems.length > 0 && (
          <div className={s.pagination}>
            <span>Показано {pageItems.length} из {filtered.length} объявлений</span>
            <div className={s.paginationPages}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} className={`${s.pageBtn} ${page === i + 1 ? s.pageBtnActive : ""}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── APPLICATIONS PAGE ────────────────────────────────────────────────────────

function AgencyApplicationsPage({
  applications, loading, error, onOpenApp, onRefresh, onStatusChange,
}: {
  applications: Application[];
  loading: boolean;
  error: string | null;
  onOpenApp: (app: Application) => void;
  onRefresh: () => void;
  onStatusChange: (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const reviewCount = applications.filter(a => a.status === "review").length;

  return (
    <>
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconTeal}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div></div>
          <div className={s.statCardValue}>{applications.length}</div>
          <div className={s.statCardLabel}>Всего заявок</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconBlue}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
          <div className={s.statCardValue}>{reviewCount}</div>
          <div className={s.statCardLabel}>На рассмотрении</div>
        </div>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#70a0ff", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : applications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Заявок пока нет</div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Заявитель</th>
                <th className={s.th}>Объект</th>
                <th className={s.th}>Тип</th>
                <th className={s.th}>Совместимость</th>
                <th className={s.th}>Дата</th>
                <th className={s.th}>Статус</th>
                <th className={s.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(a => (
                <tr key={a.id} className={s.tr} style={{ cursor: "pointer" }} onClick={() => onOpenApp(a)}>
                  <td className={s.td}><strong>{a.full_name}</strong></td>
                  <td className={s.td} style={{ maxWidth: 200 }}>{a.listing_title ?? `Объект #${a.listing_id}`}</td>
                  <td className={s.td}>{a.deal_type === "rent" ? "Аренда" : "Продажа"}</td>
                  <td className={s.td}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: a.is_compatible ? "#52c97a" : "#faad14" }}>
                      {a.is_compatible ? "✓ Подходит" : "~ Не подходит"}
                    </span>
                  </td>
                  <td className={s.td}>{fmtDate(a.created_at)}</td>
                  <td className={s.td}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "2px 10px",
                      borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${appStatusColor(a.status)}18`, color: appStatusColor(a.status),
                      border: `1px solid ${appStatusColor(a.status)}40`,
                    }}>
                      {statusLabel(a.status)}
                    </span>
                  </td>
                  <td className={s.td} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (openMenuId === a.id) { setOpenMenuId(null); setMenuPos(null); return; }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setOpenMenuId(a.id);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "#595959", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center" }}
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Three-dot dropdown — fixed position outside table overflow */}
      {openMenuId !== null && menuPos && (() => {
        const a = applications.find(x => x.id === openMenuId);
        if (!a) return null;
        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => { setOpenMenuId(null); setMenuPos(null); }} />
            <div style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 100, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 190, padding: "6px 0" }}>
              <button onClick={() => { onOpenApp(a); setOpenMenuId(null); setMenuPos(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 16px", fontSize: 14, color: "#1a1a2e", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Просмотреть
              </button>
              {a.status !== "approved" && (
                <button onClick={() => { onStatusChange(a.id, "approved"); setOpenMenuId(null); setMenuPos(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 16px", fontSize: 14, color: "#52c97a", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Одобрить
                </button>
              )}
              {a.status !== "review" && (
                <button onClick={() => { onStatusChange(a.id, "review"); setOpenMenuId(null); setMenuPos(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 16px", fontSize: 14, color: "#70a0ff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  На рассмотрение
                </button>
              )}
              {a.status !== "rejected" && (
                <button onClick={() => { onStatusChange(a.id, "rejected"); setOpenMenuId(null); setMenuPos(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 16px", fontSize: 14, color: "#f5222d", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Отклонить
                </button>
              )}
            </div>
          </>
        );
      })()}
    </>
  );
}

// ─── APPLICATION DETAIL MODAL ─────────────────────────────────────────────────

function ApplicationDetailModal({
  app,
  onClose,
  onReply,
  onStatusChange,
}: {
  app: Application;
  onClose: () => void;
  onReply: () => void;
  onStatusChange: (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleStatus = async (status: 'new' | 'review' | 'approved' | 'rejected') => {
    setSaving(true);
    try {
      await onStatusChange(app.id, status);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const rows: { label: string; value: string | number | boolean | null | undefined }[] = [
    { label: "Имя",               value: app.full_name },
    { label: "Телефон",           value: app.phone },
    { label: "Email",             value: app.email },
    { label: "Тип сделки",        value: app.deal_type === "rent" ? "Аренда" : "Продажа" },
    { label: "Жильцов",           value: app.occupant_count },
    { label: "Дети",              value: app.has_children == null ? null : app.has_children ? "Да" : "Нет" },
    { label: "Животные",          value: app.has_pets == null ? null : app.has_pets ? "Да" : "Нет" },
    { label: "Студент",           value: app.is_student == null ? null : app.is_student ? "Да" : "Нет" },
    { label: "Срок аренды (мес)", value: app.stay_term_months },
    { label: "Ипотека",           value: app.needs_mortgage == null ? null : app.needs_mortgage ? "Да" : "Нет" },
    { label: "Срок покупки",      value: app.purchase_term },
    { label: "Комментарий",       value: app.comment },
  ].filter(r => r.value != null && r.value !== "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
              Заявка на: {app.listing_title ?? `Объект #${app.listing_id}`}
            </div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{app.full_name} · {fmtDate(app.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393" }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: `${appStatusColor(app.status)}20`, color: appStatusColor(app.status),
            border: `1px solid ${appStatusColor(app.status)}50`,
          }}>
            {statusLabel(app.status)}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: app.is_compatible ? "#f6ffed" : "#fff7e6",
            color: app.is_compatible ? "#52c97a" : "#faad14",
            border: `1px solid ${app.is_compatible ? "#b7eb8f" : "#ffd591"}`,
          }}>
            {app.is_compatible ? "Подходит" : "Не подходит"}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "#939393", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 12, fontWeight: 500 }}>
          Анкета заявителя
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: "#3a3a3a", textAlign: "right" }}>{String(r.value)}</span>
            </div>
          ))}
        </div>

        {/* Status actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {app.status !== "approved" && (
            <button
              disabled={saving}
              onClick={() => handleStatus("approved")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#52c97a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >Одобрить</button>
          )}
          {app.status !== "review" && (
            <button
              disabled={saving}
              onClick={() => handleStatus("review")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >На рассмотрение</button>
          )}
          {app.status !== "rejected" && (
            <button
              disabled={saving}
              onClick={() => handleStatus("rejected")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#f5f5f5", color: "#f5222d", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >Отклонить</button>
          )}
        </div>

        <button
          onClick={onReply}
          style={{ marginTop: 12, width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Написать сообщение
        </button>
      </div>
    </div>
  );
}

// ─── ADD LISTING MODAL ────────────────────────────────────────────────────────

// ─── EDIT LISTING MODAL ───────────────────────────────────────────────────────

function EditListingModal({ listing, onClose, onSaved }: {
  listing: CompanyListing;
  onClose: () => void;
  onSaved: (l: CompanyListing) => void;
}) {
  const [form, setForm] = useState({
    title:        listing.title,
    description:  "",
    property_type: listing.property_type,
    deal_type:    listing.deal_type as "rent" | "sale",
    price:        String(listing.price),
    city:         listing.city || "Алматы",
    address:      listing.address || "",
    rooms:        listing.rooms != null ? String(listing.rooms) : "",
    area:         listing.area != null ? String(listing.area) : "",
    floor:        listing.floor != null ? String(listing.floor) : "",
    total_floors: listing.total_floors != null ? String(listing.total_floors) : "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [descLoading, setDescLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getListing(listing.id)
      .then(full => setForm(p => ({ ...p, description: full.description ?? "" })))
      .catch(() => {})
      .finally(() => setDescLoading(false));
  }, [listing.id]);

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    const combined = [...newPhotos, ...files].slice(0, 10 - listing.media.length);
    setNewPhotos(combined);
    setNewPreviews(combined.map(f => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeNewPhoto = (idx: number) => {
    const next = newPhotos.filter((_, i) => i !== idx);
    setNewPhotos(next);
    setNewPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.price || !form.city.trim()) {
      setError("Заполните обязательные поля: название, цена, город");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: Partial<import("../api/dashboard").CreateListingPayload> = {
        title:         form.title.trim(),
        description:   form.description.trim() || undefined,
        property_type: form.property_type,
        deal_type:     form.deal_type,
        price:         parseInt(form.price, 10),
        city:          form.city.trim(),
        address:       form.address.trim() || undefined,
        rooms:         form.rooms ? parseInt(form.rooms, 10) : undefined,
        area:          form.area ? parseFloat(form.area) : undefined,
        floor:         form.floor ? parseInt(form.floor, 10) : undefined,
        total_floors:  form.total_floors ? parseInt(form.total_floors, 10) : undefined,
        latitude:      coords?.lat,
        longitude:     coords?.lng,
      };
      let updated = await updateListing(listing.id, payload);
      if (newPhotos.length > 0) {
        const startPos = listing.media.length + 1;
        for (let i = 0; i < newPhotos.length; i++) {
          setUploadStep(`Загрузка фото ${i + 1} из ${newPhotos.length}...`);
          try {
            const media = await uploadListingMedia(listing.id, newPhotos[i], startPos + i);
            updated = { ...updated, media: [...(updated.media ?? []), media] };
          } catch { /* continue */ }
        }
      }
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
      setUploadStep("");
    }
  };

  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Редактировать объявление</div>
          <button className={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Название *</label>
            <input className={s.formInput} value={form.title} onChange={e => f("title", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Описание</label>
            {descLoading ? (
              <div style={{ fontSize: 13, color: "#939393", padding: "8px 0" }}>Загрузка...</div>
            ) : (
              <textarea className={s.formTextarea} value={form.description} onChange={e => f("description", e.target.value)} />
            )}
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип объекта</label>
              <select className={s.formSelect} value={form.property_type} onChange={e => f("property_type", e.target.value)}>
                <option value="apartment">Квартира</option>
                <option value="house">Дом</option>
                <option value="studio">Студия</option>
                <option value="commercial">Коммерческое</option>
                <option value="land">Земля</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип сделки</label>
              <select className={s.formSelect} value={form.deal_type} onChange={e => f("deal_type", e.target.value as "rent" | "sale")}>
                <option value="rent">Аренда</option>
                <option value="sale">Продажа</option>
              </select>
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Цена (₸) *</label>
              <input className={s.formInput} type="number" value={form.price} onChange={e => f("price", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Город *</label>
              <select className={s.formSelect} value={form.city} onChange={e => { f("city", e.target.value); setCoords(null); }}>
                <option value="Алматы">Алматы</option>
                <option value="Астана">Астана</option>
              </select>
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Адрес</label>
            <input className={s.formInput} value={form.address} onChange={e => f("address", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Местоположение на карте</label>
            <MapPicker value={coords} onChange={setCoords} city={form.city} onAddress={addr => f("address", addr)} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Комнат</label>
              <input className={s.formInput} type="number" value={form.rooms} onChange={e => f("rooms", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Площадь (м²)</label>
              <input className={s.formInput} type="number" value={form.area} onChange={e => f("area", e.target.value)} />
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этаж</label>
              <input className={s.formInput} type="number" value={form.floor} onChange={e => f("floor", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этажей в доме</label>
              <input className={s.formInput} type="number" value={form.total_floors} onChange={e => f("total_floors", e.target.value)} />
            </div>
          </div>

          {/* Existing photos */}
          {listing.media.length > 0 && (
            <div className={s.formGroup}>
              <label className={s.formLabel}>Текущие фото</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {listing.media.map(m => (
                  <div key={m.id} style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
                    <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New photos */}
          {listing.media.length < 10 && (
            <div className={s.formGroup}>
              <label className={s.formLabel}>Добавить фото</label>
              <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: "none" }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {newPreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => removeNewPhoto(i)} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ))}
                {newPhotos.length < 10 - listing.media.length && (
                  <button onClick={() => photoRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #d0d9ff", background: "#f5f7ff", color: "#70a0ff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                )}
              </div>
            </div>
          )}

          {uploadStep && <div style={{ fontSize: 13, color: "#70a0ff", padding: "6px 0" }}>{uploadStep}</div>}
          {error && <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>{error}</div>}
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose} disabled={saving}>Отмена</button>
          <button className={s.btnSubmit} onClick={handleSave} disabled={saving}>
            {saving ? (uploadStep || "Сохранение...") : "Сохранить →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD LISTING MODAL ────────────────────────────────────────────────────────

function AddListingModal({ onClose, onSaved }: { onClose: () => void; onSaved: (l: CompanyListing) => void }) {
  const [form, setForm] = useState<{
    title: string; description: string; property_type: string;
    deal_type: "rent" | "sale"; price: string; city: string;
    address: string; rooms: string; area: string; floor: string; total_floors: string;
  }>({
    title: "", description: "", property_type: "apartment",
    deal_type: "rent", price: "", city: "Алматы",
    address: "", rooms: "", area: "", floor: "", total_floors: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    const combined = [...photos, ...files].slice(0, 10);
    setPhotos(combined);
    setPreviews(combined.map(f => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.city.trim()) {
      setError("Заполните обязательные поля: название, описание, цена, город");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: CreateListingPayload = {
        title:         form.title.trim(),
        description:   form.description.trim(),
        property_type: form.property_type,
        deal_type:     form.deal_type,
        price:         parseInt(form.price, 10),
        city:          form.city.trim(),
        address:       form.address.trim() || undefined,
        rooms:         form.rooms ? parseInt(form.rooms, 10) : undefined,
        area:          form.area ? parseFloat(form.area) : undefined,
        floor:         form.floor ? parseInt(form.floor, 10) : undefined,
        total_floors:  form.total_floors ? parseInt(form.total_floors, 10) : undefined,
        latitude:      coords?.lat,
        longitude:     coords?.lng,
      };
      const created = await createListing(payload);
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          setUploadStep(`Загрузка фото ${i + 1} из ${photos.length}...`);
          try {
            const media = await uploadListingMedia(created.id, photos[i], i + 1);
            created.media = [...(created.media ?? []), media];
          } catch {
            // continue with remaining photos even if one fails
          }
        }
      }
      onSaved(created);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
      setUploadStep("");
    }
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Новое объявление</div>
          <button className={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Название *</label>
            <input className={s.formInput} placeholder="Например: 2-комнатная квартира в центре" value={form.title} onChange={e => f("title", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Описание *</label>
            <textarea className={s.formTextarea} placeholder="Опишите объект..." value={form.description} onChange={e => f("description", e.target.value)} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип объекта</label>
              <select className={s.formSelect} value={form.property_type} onChange={e => f("property_type", e.target.value)}>
                <option value="apartment">Квартира</option>
                <option value="house">Дом</option>
                <option value="studio">Студия</option>
                <option value="commercial">Коммерческое</option>
                <option value="land">Земля</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип сделки</label>
              <select className={s.formSelect} value={form.deal_type} onChange={e => f("deal_type", e.target.value as "rent" | "sale")}>
                <option value="rent">Аренда</option>
                <option value="sale">Продажа</option>
              </select>
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Цена (₸) *</label>
              <input className={s.formInput} type="number" placeholder="450000" value={form.price} onChange={e => f("price", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Город *</label>
              <select className={s.formSelect} value={form.city} onChange={e => { f("city", e.target.value); setCoords(null); }}>
                <option value="Алматы">Алматы</option>
                <option value="Астана">Астана</option>
              </select>
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Адрес</label>
            <input className={s.formInput} placeholder="пр. Абая, 1" value={form.address} onChange={e => f("address", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Местоположение на карте</label>
            <MapPicker value={coords} onChange={setCoords} city={form.city} onAddress={addr => f("address", addr)} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Комнат</label>
              <input className={s.formInput} type="number" placeholder="2" value={form.rooms} onChange={e => f("rooms", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Площадь (м²)</label>
              <input className={s.formInput} type="number" placeholder="65" value={form.area} onChange={e => f("area", e.target.value)} />
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этаж</label>
              <input className={s.formInput} type="number" placeholder="5" value={form.floor} onChange={e => f("floor", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этажей в доме</label>
              <input className={s.formInput} type="number" placeholder="12" value={form.total_floors} onChange={e => f("total_floors", e.target.value)} />
            </div>
          </div>

          {/* ── Photo upload ── */}
          <div className={s.formGroup}>
            <label className={s.formLabel}>Фотографии (до 10 шт.)</label>
            <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: "none" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                  >✕</button>
                </div>
              ))}
              {photos.length < 10 && (
                <button
                  onClick={() => photoRef.current?.click()}
                  style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #d0d9ff", background: "#f5f7ff", color: "#70a0ff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >+</button>
              )}
            </div>
          </div>

          {uploadStep && (
            <div style={{ fontSize: 13, color: "#70a0ff", padding: "6px 0" }}>{uploadStep}</div>
          )}
          {error && (
            <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
              {error}
            </div>
          )}
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose} disabled={saving}>Отмена</button>
          <button className={s.btnSubmit} onClick={handleSave} disabled={saving}>
            {saving ? (uploadStep || "Сохранение...") : "Добавить →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AgencyDashboardContent: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout, user, token, login } = useAuth();

  const onboardingKey = `qonys_onboarding_agency_${user?.id ?? "anon"}`;
  const [obStep, setObStep] = useState(0);
  // Onboarding is a one-time tour: only show it until the user has dismissed it once.
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(onboardingKey));
  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(onboardingKey, "1");
  };
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingListing, setEditingListing] = useState<CompanyListing | null>(null);

  // Real data
  const [applications, setApplications] = useState<Application[]>([]);
  const [listings, setListings] = useState<CompanyListing[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);

  // Loaded flags (load once per session)
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [overviewLoaded, setOverviewLoaded] = useState(false);

  // Loading / error states
  const [appsLoading, setAppsLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [, setChatsError] = useState<string | null>(null);

  // UI state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [selectedListing, setSelectedListing] = useState<CompanyListing | null>(null);

  // Settings state
  const [profileImage, setProfileImage] = useState<string | null>(() => user?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsFirstName, setSettingsFirstName] = useState(user?.first_name ?? "");
  const [settingsLastName, setSettingsLastName] = useState(user?.last_name ?? "");
  const [settingsPhone, setSettingsPhone] = useState(user?.phone ?? "");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveProfile = async () => {
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsSuccess("");
    try {
      await updateProfile({ first_name: settingsFirstName, last_name: settingsLastName, phone: settingsPhone });
      if (token && user) login(token, { ...user, first_name: settingsFirstName, last_name: settingsLastName, phone: settingsPhone });
      setSettingsSuccess("Данные успешно сохранены");
    } catch (e) {
      setSettingsError(getErrorMessage(e));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword) { setPasswordError("Введите текущий пароль"); return; }
    if (newPassword.length < 8) { setPasswordError("Пароль должен содержать не менее 8 символов"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword, new_password_confirmation: confirmPassword });
      setIsEditingPassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError(getErrorMessage(e));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(file);
      setProfileImage(url);
      if (token && user) login(token, { ...user, avatar_url: url });
    } catch {
      const reader = new FileReader();
      reader.onload = ev => setProfileImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadApplications = useCallback(() => {
    setAppsLoading(true);
    setAppsError(null);
    getMyApplications()
      .then(data => { setApplications(data); setAppsLoaded(true); })
      .catch(e => setAppsError(getErrorMessage(e)))
      .finally(() => setAppsLoading(false));
  }, []);

  const loadListings = useCallback(() => {
    setListingsLoading(true);
    setListingsError(null);
    getCompanyListings()
      .then(data => { setListings(Array.isArray(data) ? data : []); setListingsLoaded(true); })
      .catch(() => { setListings([]); setListingsLoaded(true); })
      .finally(() => setListingsLoading(false));
  }, []);

  const loadChats = useCallback(() => {
    setChatsLoading(true);
    setChatsError(null);
    getChats()
      .then(data => { setChatSummaries(data); setChatsLoaded(true); })
      .catch(e => setChatsError(getErrorMessage(e)))
      .finally(() => setChatsLoading(false));
  }, []);

  // Load overview data on mount (applications + chats are enough for overview stats)
  useEffect(() => {
    if (!overviewLoaded) {
      setOverviewLoaded(true);
      loadApplications();
      loadChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Lazy-load per tab
  useEffect(() => {
    if (activeTab === "applications" && !appsLoaded && !appsLoading) loadApplications();
    if (activeTab === "listings"     && !listingsLoaded && !listingsLoading) loadListings();
    if (activeTab === "messages"     && !chatsLoaded && !chatsLoading) loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lazy-load only when the tab changes
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "messages" || activeChat) return;

    const refreshChats = () => {
      getChats()
        .then(data => setChatSummaries(data))
        .catch(e => setChatsError(getErrorMessage(e)));
    };

    refreshChats();
    const intervalID = window.setInterval(refreshChats, 5000);
    return () => window.clearInterval(intervalID);
  }, [activeTab, activeChat]);

  // ── Status update ─────────────────────────────────────────────────────────

  const handleDeleteListing = async (id: number) => {
    if (!window.confirm("Удалить объявление? Это действие нельзя отменить.")) return;
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch {
      alert("Не удалось удалить объявление");
    }
  };

  const handleStatusChange = async (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => {
    const updated = await updateApplicationStatus(id, status);
    setApplications(prev => prev.map(a => a.id === id ? updated : a));
  };

  // ── Nav ───────────────────────────────────────────────────────────────────

  const NAV = [
    { key: "overview",     label: "Обзор",      icon: "/assets/overview.svg" },
    { key: "listings",     label: "Объявления", icon: "/assets/document.svg" },
    { key: "applications", label: "Заявки",     icon: "/assets/applications.svg" },
    { key: "messages",     label: "Сообщения",  icon: "/assets/messages.svg" },
    { key: "analytics",    label: "Аналитика",  icon: "/assets/activity.svg" },
    { key: "settings",     label: "Настройки",  icon: "/assets/settings.svg" },
  ];

  const PAGE_TITLES: Record<string, string> = {
    overview: "Обзор", listings: "Управление объявлениями",
    applications: "Заявки от пользователей", messages: "Сообщения",
    analytics: "Аналитика", settings: "Настройки",
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const unreadCount = chatSummaries.filter(c => c.is_unread).length;
    const newApps     = applications.filter(a => a.status === "new").length;
    const activeCount = listings.filter(l => l.status === "active").length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className={s.statsRow}>
          {[
            { label: "Активных заявок",    value: newApps,     cls: "statCardIconTeal",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
            { label: "Непрочитанных",      value: unreadCount, cls: "statCardIconBlue",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
            { label: "Активных объявлений",value: activeCount, cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          ].map(card => (
            <div key={card.label} className={s.statCard}>
              <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div></div>
              <div className={s.statCardValue}>{card.value}</div>
              <div className={s.statCardLabel}>{card.label}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Последние заявки</h3>
          {appsLoading ? (
            <div style={{ color: "#939393", fontSize: 14 }}>Загрузка...</div>
          ) : applications.length === 0 ? (
            <div style={{ color: "#939393", fontSize: 14 }}>Заявок пока нет</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {applications.slice(0, 3).map(app => (
                <div
                  key={app.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }}
                  onClick={() => setSelectedApp(app)}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
                      {app.listing_title ?? `Объект #${app.listing_id}`}
                    </div>
                    <div style={{ fontSize: 13, color: "#939393" }}>От: {app.full_name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "2px 10px",
                      borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${appStatusColor(app.status)}18`, color: appStatusColor(app.status),
                      border: `1px solid ${appStatusColor(app.status)}40`,
                    }}>{statusLabel(app.status)}</span>
                    <span style={{ fontSize: 13, color: "#939393" }}>{fmtDate(app.created_at)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#939393" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    // If a chat is open, show the chat window
    if (activeChat) {
      return (
        <AgencyChatWindow
          chat={activeChat}
          userId={user?.id ?? 0}
          onBack={() => setActiveChat(null)}
        />
      );
    }

    if (chatsLoading && appsLoading) {
      return <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>;
    }

    // Build chat list: prefer chatSummaries, fallback to applications
    const chatItems: ChatSummary[] = chatSummaries.length > 0
      ? chatSummaries
      : applications.map(app => ({
          application_id: app.id,
          listing_title:  app.listing_title ?? `Объект #${app.listing_id}`,
          company_name:   "",
          user_name:      app.full_name,
          last_message:   app.comment ?? "Заявка подана",
          last_message_at: app.updated_at,
          is_unread:      false,
        }));

    if (chatItems.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#939393" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a" }}>Сообщений нет</div>
          <div style={{ fontSize: 13, color: "#b0b0b0", marginTop: 4 }}>Чаты появятся когда пользователи подадут заявки</div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {chatItems.map(chat => {
          const senderName = chat.user_name || chat.company_name;
          return (
            <div
              key={chat.application_id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: chat.is_unread ? "#f0f7ff" : "#fff", padding: "16px 20px", borderRadius: 12, border: `1px solid ${chat.is_unread ? "#c5d9ff" : "#e8e8e8"}`, cursor: "pointer" }}
              onClick={() => {
                if (chat.is_unread) {
                  markMessagesRead(chat.application_id).catch(console.error);
                  setChatSummaries(prev => prev.map(c =>
                    c.application_id === chat.application_id ? { ...c, is_unread: false } : c
                  ));
                }
                setActiveChat(chat);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f7ff", color: "#70a0ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 18, position: "relative", flexShrink: 0 }}>
                  {senderName.charAt(0)}
                  {chat.is_unread && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, background: "#f5222d", borderRadius: "50%", border: "2px solid #fff" }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{senderName}</div>
                  <div style={{ fontSize: 13, color: "#939393", marginBottom: 2 }}>{chat.listing_title}</div>
                  <div style={{ fontSize: 13, color: chat.is_unread ? "#1a1a2e" : "#737373", fontWeight: chat.is_unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>
                    {chat.last_message}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{fmtTime(chat.last_message_at)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={s.layout}>
      {/* Mobile top bar with hamburger (hidden on desktop) */}
      <div className={s.mobileBar}>
        <button className={s.hamburger} onClick={() => setMobileNavOpen(true)} aria-label="Меню">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <span className={s.mobileBarTitle}>Кабинет агентства</span>
      </div>

      {/* Drawer backdrop */}
      {mobileNavOpen && <div className={s.sidebarOverlay} onClick={() => setMobileNavOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${s.sidebar} ${mobileNavOpen ? s.sidebarOpen : ""}`}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <img src={logo} alt="Qonys" style={{ height: 32, width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.3px" }}>Qonys</span>
          </div>
          <button onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#939393", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            На главную
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", lineHeight: 1.4 }}>Кабинет агентства</div>
        </div>
        <nav className={s.navMenu}>
          {NAV.map(item => (
            <div
              key={item.key}
              className={`${s.navItem} ${activeTab === item.key ? s.navItemActive : ""}`}
              onClick={() => { setActiveTab(item.key); if (item.key !== "messages") setActiveChat(null); setMobileNavOpen(false); }}
            >
              <img src={item.icon} alt="" style={{ width: 18, opacity: activeTab === item.key ? 1 : 0.5 }} />
              {item.label}
              {item.key === "messages" && chatSummaries.filter(c => c.is_unread).length > 0 && (
                <span style={{ marginLeft: "auto", background: "#f5222d", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {chatSummaries.filter(c => c.is_unread).length}
                </span>
              )}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #5b73e8, #4a60d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
              {profileImage
                ? <img src={profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (user?.first_name?.charAt(0) ?? "") + (user?.last_name?.charAt(0) ?? "")}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 11, color: "#939393", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
            </div>
          </div>
          <div className={s.navItem} onClick={() => { logout(); navigate("/"); }} style={{ color: "#f5222d", cursor: "pointer" }}>
            <span className={s.navItemIcon} style={{ display: "flex", alignItems: "center", opacity: 1, color: "#f5222d" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </span>
            Выйти
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={s.main}>
        <div className={s.topbar}>
          <div>
            <div className={s.pageTitle}>{PAGE_TITLES[activeTab] || "Кабинет агентства"}</div>
            <div className={s.topbarSub}>Агентство недвижимости</div>
          </div>
          <div className={s.topbarRight}>
            {activeTab === "listings" && (
              <button className={s.btnAdd} onClick={() => setShowAddModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Добавить объявление
              </button>
            )}
          </div>
        </div>

        <div className={s.content}>
          {activeTab === "overview"     && renderOverview()}
          {activeTab === "listings"     && (
            <ListingsPage
              listings={listings}
              loading={listingsLoading}
              error={listingsError}
              onAdd={() => setShowAddModal(true)}
              onRefresh={loadListings}
              onSelect={setSelectedListing}
              onEdit={setEditingListing}
              onDelete={handleDeleteListing}
            />
          )}
          {activeTab === "applications" && (
            <AgencyApplicationsPage
              applications={applications}
              loading={appsLoading}
              error={appsError}
              onOpenApp={setSelectedApp}
              onRefresh={loadApplications}
              onStatusChange={handleStatusChange}
            />
          )}
          {activeTab === "messages"     && renderMessages()}
          {activeTab === "analytics"    && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className={s.statsRow}>
                {[
                  { label: "Заявки",          value: applications.length, icon: "📋" },
                  { label: "Объявления",       value: listings.length,     icon: "🏠" },
                  { label: "Активных",         value: listings.filter(l => l.status === "active").length, icon: "✅" },
                  { label: "На модерации",     value: listings.filter(l => l.status === "moderation").length, icon: "⏳" },
                ].map((stat, i) => (
                  <div key={i} className={s.statCard}>
                    <div className={s.statCardTop}>
                      <div className={s.statCardLabel}>{stat.label}</div>
                      <div style={{ fontSize: 20 }}>{stat.icon}</div>
                    </div>
                    <div className={s.statCardValue}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Активность</h3>
                <div style={{ fontSize: 13, color: "#939393" }}>Детальная аналитика будет доступна позже</div>
              </div>
            </div>
          )}
          {activeTab === "settings"     && (
            <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Профиль агентства</h3>
                <div className={s.profileSection}>
                  <div
                    className={s.avatarWrapper}
                    onClick={() => !avatarUploading && fileInputRef.current?.click()}
                    style={{ cursor: avatarUploading ? "default" : "pointer", opacity: avatarUploading ? 0.7 : 1 }}
                  >
                    {profileImage ? <img src={profileImage} alt="Profile" className={s.avatarImage} /> : "АН"}
                    <div className={s.avatarOverlay}>
                      <span style={{ fontSize: 24, color: "#fff" }}>{avatarUploading ? "..." : "📷"}</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className={s.uploadInput} disabled={avatarUploading} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#3a3a3a" }}>Логотип агентства</div>
                    <div style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>
                      {avatarUploading ? "Загрузка..." : "Нажмите на аватар, чтобы загрузить новое фото"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className={s.formRowContainer}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Имя</label>
                      <input className={s.formInput} placeholder="Имя" value={settingsFirstName} onChange={e => setSettingsFirstName(e.target.value)} />
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Фамилия</label>
                      <input className={s.formInput} placeholder="Фамилия" value={settingsLastName} onChange={e => setSettingsLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className={s.formRowContainer}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Email</label>
                      <input className={s.formInput} value={user?.email ?? ""} readOnly style={{ background: "#fafafa", color: "#939393" }} />
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Телефон</label>
                      <input className={s.formInput} placeholder="+7 (999) 000-00-00" value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} />
                    </div>
                  </div>
                  {settingsError && (
                    <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
                      {settingsError}
                    </div>
                  )}
                  {settingsSuccess && (
                    <div style={{ color: "#52c97a", fontSize: 13, padding: "8px 12px", background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
                      {settingsSuccess}
                    </div>
                  )}
                  <button className={s.btnSubmit} style={{ width: "fit-content", marginTop: 8, opacity: settingsSaving ? 0.6 : 1 }} onClick={handleSaveProfile} disabled={settingsSaving}>
                    {settingsSaving ? "Сохранение..." : "Сохранить изменения"}
                  </button>
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Безопасность</h3>
                {!isEditingPassword ? (
                  <button className={s.btnSecondary} onClick={() => setIsEditingPassword(true)}>Изменить пароль</button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
                    {[
                      { label: "Текущий пароль", value: oldPassword, set: setOldPassword, show: showOld, toggle: () => setShowOld(p => !p), placeholder: "Введите текущий пароль" },
                      { label: "Новый пароль", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(p => !p), placeholder: "Не менее 8 символов" },
                      { label: "Подтвердите пароль", value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(p => !p), placeholder: "Повторите новый пароль" },
                    ].map(({ label, value, set, show, toggle, placeholder }) => (
                      <div className={s.formGroup} key={label}>
                        <label className={s.formLabel}>{label}</label>
                        <div style={{ position: "relative" }}>
                          <input type={show ? "text" : "password"} value={value} onChange={e => set(e.target.value)} className={s.formInput} placeholder={placeholder} style={{ paddingRight: 36 }} />
                          <button type="button" onClick={toggle} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#939393", display: "flex", padding: 0 }}>
                            {show
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                    {passwordError && (
                      <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
                        {passwordError}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <button className={s.btnSubmit} onClick={handleSavePassword} disabled={passwordSaving} style={{ opacity: passwordSaving ? 0.6 : 1 }}>
                        {passwordSaving ? "Сохранение..." : "Сохранить"}
                      </button>
                      <button className={s.btnCancel} onClick={() => { setIsEditingPassword(false); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}>Отмена</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding */}
      {showOnboarding && (
        <div className={s.overlay}>
          <div className={s.onboarding}>
            <button className={s.onboardingClose} onClick={dismissOnboarding}>✕</button>
            <div className={s.onboardingStep}>Шаг {obStep === 0 ? 1 : obStep} из {ONBOARDING_STEPS.length}</div>
            <div className={s.progressBar}>
              <div className={s.progressFill} style={{ width: `${((obStep === 0 ? 0 : obStep) / ONBOARDING_STEPS.length) * 100}%` }} />
            </div>
            <div className={s.onboardingIconWrap}>{ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.icon}</div>
            <div className={s.onboardingTitle}>{ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.title}</div>
            <div className={s.onboardingDesc}>{ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.desc}</div>
            <div className={s.onboardingActions}>
              <button className={s.btnSkip} onClick={dismissOnboarding}>Пропустить</button>
              <button className={s.btnNext} onClick={() => {
                const next = obStep + 1;
                if (next > ONBOARDING_STEPS.length) dismissOnboarding();
                else setObStep(next);
              }}>
                {obStep >= ONBOARDING_STEPS.length ? "Перейти к работе →" : "Далее →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
          onReply={() => {
            setSelectedApp(null);
            // Build a synthetic ChatSummary for direct chat with this applicant
            const existing = chatSummaries.find(c => c.application_id === selectedApp.id);
            const chat: ChatSummary = existing ?? {
              application_id: selectedApp.id,
              listing_title:  selectedApp.listing_title ?? `Объект #${selectedApp.listing_id}`,
              company_name:   "",
              user_name:      selectedApp.full_name,
              last_message:   "",
              last_message_at: "",
              is_unread:      false,
            };
            setActiveTab("messages");
            setActiveChat(chat);
          }}
        />
      )}

      {/* Add Listing Modal */}
      {showAddModal && (
        <AddListingModal
          onClose={() => setShowAddModal(false)}
          onSaved={created => {
            setListings(prev => [created, ...prev]);
          }}
        />
      )}

      {/* Edit Listing Modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={updated => {
            setListings(prev => prev.map(l => l.id === updated.id ? updated : l));
            setEditingListing(null);
          }}
        />
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", flex: 1, paddingRight: 16 }}>{selectedListing.title}</div>
              <button onClick={() => setSelectedListing(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393", flexShrink: 0 }}>×</button>
            </div>

            {selectedListing.media?.[0]?.url && (
              <img src={selectedListing.media[0].url} alt={selectedListing.title}
                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 20 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <span className={badgeClass(s, selectedListing.status)}>{listingStatusLabel(selectedListing.status)}</span>
              <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "#f5f5f5", color: "#595959" }}>
                {selectedListing.deal_type === "rent" ? "Аренда" : "Продажа"}
              </span>
            </div>

            {[
              { label: "Цена", value: `${selectedListing.price.toLocaleString("ru-RU")} ₸` },
              { label: "Город", value: selectedListing.city },
              { label: "Адрес", value: selectedListing.address || "—" },
              { label: "Тип", value: selectedListing.property_type },
              selectedListing.rooms   ? { label: "Комнат", value: String(selectedListing.rooms) } : null,
              selectedListing.area    ? { label: "Площадь", value: `${selectedListing.area} м²` } : null,
              selectedListing.floor && selectedListing.total_floors ? { label: "Этаж", value: `${selectedListing.floor} / ${selectedListing.total_floors}` } : null,
              { label: "Дата создания", value: fmtDate(selectedListing.created_at) },
            ].filter(Boolean).map((row, i, arr) => (
              <div key={row!.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <span style={{ fontSize: 13, color: "#939393" }}>{row!.label}</span>
                <span style={{ fontSize: 13, color: "#3a3a3a", fontWeight: 500 }}>{row!.value}</span>
              </div>
            ))}

            {selectedListing.status === "moderation" && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#fffbe6", borderRadius: 8, border: "1px solid #ffe58f", fontSize: 13, color: "#7c4a00" }}>
                ⏳ Объявление находится на модерации. После одобрения оно станет видно всем пользователям.
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => { handleDeleteListing(selectedListing.id); setSelectedListing(null); }}
                style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid #fed7d7", background: "#fff5f5", color: "#e53e3e", cursor: "pointer", fontWeight: 500 }}
              >
                Удалить
              </button>
              <button
                className={s.btnAdd}
                onClick={() => { setSelectedListing(null); setEditingListing(selectedListing); }}
                style={{ fontSize: 13 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Редактировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── VERIFICATION WRAPPER ─────────────────────────────────────────────────────

const AgencyDashboard: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(user?.company_id));

  useEffect(() => {
    if (!user?.company_id) return;
    adminAPI.getCompanyById(user.company_id)
      .then(company => setStatus(company.verification_status))
      .catch(() => setStatus("verified"))
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9fa" }}>
        <div style={{ fontSize: 14, color: "#939393" }}>Загрузка...</div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9fa" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 460, width: "90%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff7e6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Ожидание верификации</div>
          <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.7, marginBottom: 24 }}>
            Ваша компания зарегистрирована и ожидает проверки администратором. После одобрения вы получите полный доступ к кабинету.
          </div>
          <div style={{ padding: "14px 18px", background: "#fffbe6", borderRadius: 8, border: "1px solid #ffe58f", fontSize: 13, color: "#7c4a00", marginBottom: 24, textAlign: "left" }}>
            ⏳ Обычно проверка занимает до 24 часов. Попробуйте войти позже.
          </div>
          <button style={{ padding: "10px 24px", background: "#f5f5f5", border: "none", borderRadius: 8, fontSize: 14, color: "#595959", cursor: "pointer" }}
            onClick={() => { logout(); navigate("/"); }}>Выйти</button>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9fa" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 460, width: "90%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff1f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cf1322" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Заявка отклонена</div>
          <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.7, marginBottom: 24 }}>
            К сожалению, ваша компания не прошла верификацию. Свяжитесь с поддержкой для уточнения причины.
          </div>
          <button style={{ padding: "10px 24px", background: "#f5f5f5", border: "none", borderRadius: 8, fontSize: 14, color: "#595959", cursor: "pointer" }}
            onClick={() => { logout(); navigate("/"); }}>Выйти</button>
        </div>
      </div>
    );
  }

  return <AgencyDashboardContent />;
};

export default AgencyDashboard;
