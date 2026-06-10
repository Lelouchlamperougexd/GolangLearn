import { describe, it, expect } from "vitest";
import { isValidBin, normalizeBin } from "./bin";

describe("isValidBin", () => {
  it("rejects anything that is not 12 digits", () => {
    expect(isValidBin("")).toBe(false);
    expect(isValidBin("12345")).toBe(false);
    expect(isValidBin("12345678901")).toBe(false); // 11 digits
    expect(isValidBin("1234567890123")).toBe(false); // 13 digits
    expect(isValidBin("05014000861a")).toBe(false); // non-digit
  });

  it("rejects a 12-digit number with a wrong control digit", () => {
    // base 05014000861 → control digit is 1, so any other last digit is invalid
    expect(isValidBin("050140008613")).toBe(false);
    expect(isValidBin("050140008610")).toBe(false);
  });

  it("accepts a number whose control digit matches the checksum", () => {
    expect(isValidBin("050140008611")).toBe(true);
    expect(isValidBin("000000000000")).toBe(true); // all-zero checksum is 0 — algorithmically valid
  });
});

describe("normalizeBin", () => {
  it("strips non-digits and caps at 12 chars", () => {
    expect(normalizeBin("050140 008613")).toBe("050140008613");
    expect(normalizeBin("БИН: 050140008613999")).toBe("050140008613");
  });
});
