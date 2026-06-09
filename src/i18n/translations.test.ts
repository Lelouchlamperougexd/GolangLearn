import { describe, it, expect } from "vitest";
import { translations } from "./translations";

/** Collects every nested key path of an object so two language trees can be compared by shape. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
}

describe("translations", () => {
  const ruPaths = keyPaths(translations.ru).sort();

  it("exposes the three supported languages", () => {
    expect(Object.keys(translations)).toEqual(["ru", "kz", "en"]);
  });

  it("kz has the same key shape as ru (no missing translations)", () => {
    expect(keyPaths(translations.kz).sort()).toEqual(ruPaths);
  });

  it("en has the same key shape as ru (no missing translations)", () => {
    expect(keyPaths(translations.en).sort()).toEqual(ruPaths);
  });

  it("verificationDesc is a function in every language", () => {
    expect(typeof translations.ru.signup.verificationDesc).toBe("function");
    expect(typeof translations.kz.signup.verificationDesc).toBe("function");
    expect(typeof translations.en.signup.verificationDesc).toBe("function");
    expect(translations.ru.signup.verificationDesc("Qonys")).toContain("Qonys");
  });
});
