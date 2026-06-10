// Looks up a BIN/IIN in a public Kazakhstan legal-entity registry to confirm the
// company/entrepreneur is really registered. The request goes through a same-origin
// proxy (`/bin-registry`, see vite.config.ts / nginx.conf) so the browser never hits
// the third-party host directly (avoids CORS).
//
// Source endpoint and field names live here so they are easy to swap if the public
// registry changes its API.

export interface BinLookup {
  exists: boolean;
  name?: string;
}

/** Read a name out of a field that is either a plain string or a `{ value }` wrapper. */
function readName(field: unknown): string | undefined {
  if (typeof field === "string" && field.trim()) return field.trim();
  if (field && typeof field === "object") {
    const v = (field as Record<string, unknown>).value;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Pull a company name out of the registry response regardless of its exact shape. */
export function extractName(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;

  // adata / apiba.prgapp.kz shape: { basicInfo: { titleRu: { value }, titleKz, titleEn } }
  if (o.basicInfo && typeof o.basicInfo === "object") {
    const b = o.basicInfo as Record<string, unknown>;
    for (const key of ["titleRu", "titleKz", "titleEn", "title", "name"]) {
      const name = readName(b[key]);
      if (name) return name;
    }
  }

  // Generic fallbacks for other registry shapes.
  for (const key of ["name", "shortName", "fullName", "nameRu", "titleRu", "title"]) {
    const name = readName(o[key]);
    if (name) return name;
  }
  if (o.obj && typeof o.obj === "object") {
    const inner = o.obj as Record<string, unknown>;
    for (const key of ["name", "shortName", "fullName", "nameRu"]) {
      const name = readName(inner[key]);
      if (name) return name;
    }
  }
  return undefined;
}

/**
 * Verify a BIN/IIN against the public registry.
 * Resolves with `{ exists, name }`. Throws on network/registry failure so the
 * caller can distinguish "not found" from "couldn't check".
 */
export async function verifyBin(bin: string): Promise<BinLookup> {
  const res = await fetch(
    `/bin-registry/CompanyFullInfo?id=${encodeURIComponent(bin)}&lang=ru`,
    { headers: { Accept: "application/json" } }
  );

  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`registry responded ${res.status}`);

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("registry returned a non-JSON response");
  }

  const name = extractName(data);
  return { exists: Boolean(name), name };
}
