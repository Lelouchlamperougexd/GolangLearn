// Password policy mirrored from the backend's custom `password` validator:
// 8–72 chars with an uppercase letter, a lowercase letter, a digit and a special character.

export interface PasswordChecks {
  len: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

export function checkPassword(pw: string): PasswordChecks {
  return {
    len: pw.length >= 8 && pw.length <= 72,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export function isStrongPassword(pw: string): boolean {
  const c = checkPassword(pw);
  return c.len && c.upper && c.lower && c.digit && c.special;
}
