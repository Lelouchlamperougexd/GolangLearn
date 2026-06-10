import { describe, it, expect } from "vitest";
import { extractName } from "./bin";

describe("extractName (registry response parsing)", () => {
  it("reads the name from the adata/apiba nested shape", () => {
    // Mirrors the real apiba.prgapp.kz/CompanyFullInfo response for BIN 180740015266.
    const response = {
      favorite: null,
      basicInfo: {
        isIndividual: false,
        titleRu: { value: 'ТОО "ДОДО КАЗАХСТАН"', updateDate: "2026-05-03T00:00:00+05:00" },
        registrationDate: { value: "2018-07-16T00:00:00" },
      },
    };
    expect(extractName(response)).toBe('ТОО "ДОДО КАЗАХСТАН"');
  });

  it("falls back to flat name fields from other registries", () => {
    expect(extractName({ name: "ABC LLP" })).toBe("ABC LLP");
    expect(extractName({ obj: { shortName: "XYZ" } })).toBe("XYZ");
  });

  it("returns undefined when there is no company name", () => {
    expect(extractName({})).toBeUndefined();
    expect(extractName(null)).toBeUndefined();
    expect(extractName({ basicInfo: { titleRu: { value: "" } } })).toBeUndefined();
  });
});
