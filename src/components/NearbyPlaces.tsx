import { useState, useEffect } from "react";

interface POI {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface PlaceItem { name: string; dist: number }
interface PlaceGroup { key: string; label: string; emoji: string; places: PlaceItem[] }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const r = (d: number) => d * Math.PI / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2
    + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number) { return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`; }
function walkMin(m: number) { const t = Math.max(1, Math.round(m / 80)); return `${t} мин`; }

const CATS = [
  { key: "school",       label: "Школы",       emoji: "🏫", match: (t: Record<string,string>) => t.amenity === "school",       radius: 1500 },
  { key: "kindergarten", label: "Детсады",      emoji: "🧒", match: (t: Record<string,string>) => t.amenity === "kindergarten", radius: 1500 },
  { key: "park",         label: "Парки",        emoji: "🌳", match: (t: Record<string,string>) => t.leisure === "park",         radius: 1500 },
  { key: "hospital",     label: "Больницы",     emoji: "🏥", match: (t: Record<string,string>) => t.amenity === "hospital",     radius: 2000 },
  { key: "pharmacy",     label: "Аптеки",       emoji: "💊", match: (t: Record<string,string>) => t.amenity === "pharmacy",     radius: 1000 },
  { key: "supermarket",  label: "Супермаркеты", emoji: "🛒", match: (t: Record<string,string>) => t.shop === "supermarket",     radius: 1000 },
  { key: "bus_stop",     label: "Остановки",    emoji: "🚌", match: (t: Record<string,string>) => t.highway === "bus_stop",     radius: 500  },
];

function buildSummary(groups: PlaceGroup[]): string {
  const has = (key: string) => groups.find(g => g.key === key)?.places.length ?? 0;
  const schools = has("school");
  const kg      = has("kindergarten");
  const parks   = has("park");
  const shops   = has("supermarket");
  const bus     = has("bus_stop");
  const total   = groups.filter(g => g.places.length > 0).length;

  if (total === 0) return "";

  const parts: string[] = [];

  if (schools > 0 || kg > 0) {
    if (schools > 0 && kg > 0) parts.push(`${schools} школ${schools > 1 ? "ы" : "а"} и ${kg} детск${kg > 1 ? "их сада" : "ий сад"}`);
    else if (schools > 0)      parts.push(`${schools} школ${schools > 1 ? "ы" : "а"}`);
    else                       parts.push(`${kg} детск${kg > 1 ? "их сада" : "ий сад"}`);
  }
  if (parks > 0)  parts.push(`${parks} парк${parks > 1 ? "а" : ""}`);
  if (shops > 0)  parts.push(`${shops} супермаркет${shops > 1 ? "а" : ""}`);
  if (bus > 0)    parts.push("остановки рядом");

  const familyFriendly = schools > 0 || kg > 0;
  const rich = total >= 4;

  let intro = "";
  if (familyFriendly && parks > 0) intro = "Отличный выбор для семей — ";
  else if (rich)                    intro = "Развитая инфраструктура — ";
  else                              intro = "В шаговой доступности: ";

  return intro + parts.join(", ") + ".";
}

export default function NearbyPlaces({ lat, lng }: { lat: number; lng: number }) {
  const [groups, setGroups] = useState<PlaceGroup[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build Overpass QL query for all categories
    const lines = CATS.map(c => {
      const key = c.key === "bus_stop" ? `node["highway"="bus_stop"]` :
                  c.key === "park"     ? `node["leisure"="park"]` :
                  c.key === "supermarket" ? `node["shop"="supermarket"]` :
                  `node["amenity"="${c.key}"]`;
      return `${key}(around:${c.radius},${lat},${lng});`;
    }).join("\n  ");

    const query = `[out:json][timeout:15];\n(\n  ${lines}\n);\nout body;`;

    fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query })
      .then(r => r.json())
      .then((data: { elements: POI[] }) => {
        const els = data.elements ?? [];
        const result: PlaceGroup[] = CATS.map(cat => {
          const matches: PlaceItem[] = els
            .filter(e => cat.match(e.tags ?? {}))
            .map(e => ({
              name: e.tags?.["name:ru"] || e.tags?.name || e.tags?.["name:kk"] || cat.label.replace(/ы$/, ""),
              dist: haversine(lat, lng, e.lat, e.lon),
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);
          return { key: cat.key, label: cat.label, emoji: cat.emoji, places: matches };
        });
        setGroups(result);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (loading) {
    return (
      <div style={{ padding: "12px 0", color: "#939393", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #d0d9ff", borderTopColor: "#70a0ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        Загружаем инфраструктуру...
      </div>
    );
  }

  const active = (groups ?? []).filter(g => g.places.length > 0);
  if (active.length === 0) return null;

  const summary = buildSummary(active);

  return (
    <div>
      {summary && (
        <div style={{ background: "linear-gradient(135deg,#eef3ff,#f0f7ff)", border: "1px solid #d0e4ff", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
          <p style={{ margin: 0, fontSize: 14, color: "#2d5be3", fontWeight: 500, lineHeight: 1.55 }}>{summary}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {active.map(group => (
          <div key={group.key}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#3a3a3a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{group.emoji}</span>{group.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {group.places.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8f9fa", borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: "#3a3a3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{p.name}</span>
                  <span style={{ color: "#939393", flexShrink: 0, marginLeft: 8 }}>{fmtDist(p.dist)} · {walkMin(p.dist)} пешком</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
