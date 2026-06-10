import api from './index';
import type { User } from '../context/AuthContext';

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
  phone: string;
}

export interface RegisterCompanyPayload {
  city: string;
  company_email: string;
  company_name: string;
  company_phone: string;
  company_type: 'agency' | 'developer';
  first_name: string;
  invite_token?: string;
  job_title: string;
  last_name: string;
  password: string;
  password_confirmation: string;
  registration_number: string;
  document: File;
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

// Backend wraps ALL successful responses in { data: ... }
interface BackendEnvelope<T> {
  data: T;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Register returns UserWithToken — user fields + token at top level (also in data envelope)
export interface RegisterResponse {
  token: string;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: User['role'];
  company_id?: number;
  role_id?: number;
  phone?: string;
  job_title?: string;
  country?: string;
  is_active?: boolean;
  push_opt_in?: boolean;
  created_at?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/** POST /authentication/token — universal login for all roles */
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<BackendEnvelope<AuthResponse>>('/authentication/token', payload);
  return res.data.data;
}

/** POST /authentication/admin/token — admin / moderator login */
export async function loginAdmin(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<BackendEnvelope<AuthResponse>>('/authentication/admin/token', payload);
  return res.data.data;
}

/** POST /authentication/user — register regular user */
export async function registerUser(payload: RegisterUserPayload): Promise<RegisterResponse> {
  const res = await api.post<BackendEnvelope<RegisterResponse>>('/authentication/user', payload);
  return res.data.data;
}

/** POST /authentication/company — register agency / developer (multipart, with document) */
export async function registerCompany(payload: RegisterCompanyPayload): Promise<RegisterResponse> {
  const form = new FormData();
  form.append('company_name', payload.company_name);
  form.append('registration_number', payload.registration_number);
  form.append('city', payload.city);
  form.append('company_email', payload.company_email);
  form.append('company_phone', payload.company_phone);
  form.append('company_type', payload.company_type);
  form.append('first_name', payload.first_name);
  form.append('last_name', payload.last_name);
  form.append('job_title', payload.job_title);
  form.append('password', payload.password);
  form.append('password_confirmation', payload.password_confirmation);
  if (payload.invite_token) form.append('invite_token', payload.invite_token);
  form.append('document', payload.document);

  const res = await api.post<BackendEnvelope<RegisterResponse>>('/authentication/company', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/** PUT /users/activate/:token — confirm email by activation token */
export async function activateUser(token: string): Promise<void> {
  await api.put(`/users/activate/${encodeURIComponent(token)}`);
}

/** POST /authentication/resend-activation — resend confirmation email */
export async function resendActivation(email: string): Promise<void> {
  await api.post('/authentication/resend-activation', { email });
}

/** POST /authentication/password-reset/request — send reset code to email */
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/authentication/password-reset/request', { email });
}

/** PUT /authentication/password-reset/confirm — confirm code and set new password */
export async function confirmPasswordReset(payload: {
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await api.put('/authentication/password-reset/confirm', payload);
}

/** GET /authentication/me — get current user profile */
export async function getMe(): Promise<User> {
  const res = await api.get<BackendEnvelope<User>>('/authentication/me');
  return res.data.data;
}

// ─── Error Handling ───────────────────────────────────────────────────────────

type ErrLang = 'ru' | 'kz' | 'en';

const ERR_MESSAGES: Record<ErrLang, Record<string, string>> = {
  ru: {
    server: 'Ошибка сервера. Попробуйте позже',
    unauthorized: 'Неверный email или пароль',
    forbidden: 'Доступ запрещён',
    notFound: 'Пользователь не найден',
    duplicate: 'Пользователь с таким email уже существует',
    badFields: 'Проверьте правильность заполненных полей',
    tooMany: 'Слишком много попыток. Подождите немного',
    network: 'Нет соединения с сервером. Проверьте подключение',
    generic: 'Произошла ошибка. Попробуйте ещё раз.',
    pwPolicy: 'Пароль не подходит. Нужно 8–72 символа: заглавная и строчная буквы, цифра и спецсимвол (!@#$%…)',
    emailInvalid: 'Введите корректный email, например name@example.com',
    phoneInvalid: 'Введите корректный номер телефона, например +7 700 000 00 00',
    required: 'Заполните все обязательные поля (отмечены *)',
  },
  kz: {
    server: 'Сервер қатесі. Кейінірек қайталаңыз',
    unauthorized: 'Email немесе құпиясөз қате',
    forbidden: 'Қол жеткізуге тыйым салынған',
    notFound: 'Пайдаланушы табылмады',
    duplicate: 'Мұндай email-мен пайдаланушы бұрыннан бар',
    badFields: 'Толтырылған өрістердің дұрыстығын тексеріңіз',
    tooMany: 'Тым көп әрекет. Сәл күтіңіз',
    network: 'Сервермен байланыс жоқ. Қосылымды тексеріңіз',
    generic: 'Қате пайда болды. Қайталап көріңіз.',
    pwPolicy: 'Құпиясөз жарамсыз. 8–72 таңба қажет: бас және кіші әріп, сан және арнайы таңба (!@#$%…)',
    emailInvalid: 'Дұрыс email енгізіңіз, мысалы name@example.com',
    phoneInvalid: 'Дұрыс телефон нөмірін енгізіңіз, мысалы +7 700 000 00 00',
    required: 'Барлық міндетті өрістерді толтырыңыз (* белгісі)',
  },
  en: {
    server: 'Server error. Please try again later',
    unauthorized: 'Incorrect email or password',
    forbidden: 'Access denied',
    notFound: 'User not found',
    duplicate: 'A user with this email already exists',
    badFields: 'Please check the entered fields',
    tooMany: 'Too many attempts. Please wait a moment',
    network: 'No connection to the server. Check your connection',
    generic: 'Something went wrong. Please try again.',
    pwPolicy: 'Password is invalid. Use 8–72 characters with an uppercase and lowercase letter, a digit and a special character (!@#$%…)',
    emailInvalid: 'Enter a valid email, e.g. name@example.com',
    phoneInvalid: 'Enter a valid phone number, e.g. +7 700 000 00 00',
    required: 'Please fill in all required fields (marked *)',
  },
};

/** Turn a Go-validator dump ("...failed on the 'password' tag") into a friendly message. */
function humanizeValidatorError(raw: string, m: Record<string, string>): string | null {
  if (!/failed on the '.*' tag|validation for/i.test(raw)) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("'password'") || lower.includes('.password')) return m.pwPolicy;
  if (lower.includes("'email'") || lower.includes('.email')) return m.emailInvalid;
  if (lower.includes('phone')) return m.phoneInvalid;
  if (lower.includes("'required'")) return m.required;
  return m.badFields;
}

/** Extract a human-readable error message from axios / backend errors. */
export function getErrorMessage(err: unknown, lang: ErrLang = 'ru'): string {
  const m = ERR_MESSAGES[lang] ?? ERR_MESSAGES.ru;

  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    const data = axiosErr.response?.data;
    const status = axiosErr.response?.status;

    // Always show friendly message for server errors — never leak raw backend text
    if (status === 500) return m.server;

    // Backend error format: { "error": "some message" }
    if (data && typeof data === 'object' && 'error' in data) {
      const msg = String((data as { error: unknown }).error);
      // Humanize Go validator dumps first so we never show raw "failed on the 'X' tag".
      const validator = humanizeValidatorError(msg, m);
      if (validator) return validator;
      if (msg === 'unauthorized') return m.unauthorized;
      if (msg === 'forbidden') return m.forbidden;
      if (msg === 'not found') return m.notFound;
      if (msg.includes('duplicate') || msg.includes('already exists')) return m.duplicate;
      if (/password/i.test(msg) && /(weak|invalid|strong|complex|requirement)/i.test(msg)) return m.pwPolicy;
      // Only surface short, non-technical backend messages verbatim.
      if (msg.length > 0 && msg.length < 160 && !/key:|\btag\b|panic|sql|nil pointer/i.test(msg)) return msg;
    }

    // Fallback by status code
    if (status === 401) return m.unauthorized;
    if (status === 403) return m.forbidden;
    if (status === 400) return m.badFields;
    if (status === 429) return m.tooMany;
  }

  // Network error (no response at all)
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    if (msg.includes('Network Error') || msg.includes('ERR_')) {
      return m.network;
    }
  }

  return m.generic;
}
