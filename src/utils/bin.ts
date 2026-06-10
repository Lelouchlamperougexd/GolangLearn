// Validation for Kazakhstan BIN (legal entities) / IIN (individuals).
// Both are 12 digits with the same control-digit checksum algorithm.

const WEIGHTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const WEIGHTS_2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

/** Validate the 12-digit BIN/IIN control digit (catches typos and made-up numbers). */
export function isValidBin(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false;
  const digits = value.split("").map(Number);

  const sum = (weights: number[]) =>
    weights.reduce((acc, w, i) => acc + w * digits[i], 0);

  let control = sum(WEIGHTS_1) % 11;
  if (control === 10) {
    control = sum(WEIGHTS_2) % 11;
    if (control === 10) return false; // invalid per the algorithm
  }
  return control === digits[11];
}

/** Keep only digits — used to normalize pasted input like "050140 008613". */
export function normalizeBin(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}
