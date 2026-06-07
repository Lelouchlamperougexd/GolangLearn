import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export interface LatLng { lat: number; lng: number; }

const CITY_CENTERS: Record<string, [number, number]> = {
  "Алматы": [43.238949, 76.889709],
  "Астана": [51.180117, 71.446020],
};

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`,
      { headers: { "Accept-Language": "ru" } }
    );
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.house_number,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : (data.display_name ?? "");
  } catch {
    return "";
  }
}

function ClickHandler({ onChange, onAddress }: { onChange: (pos: LatLng) => void; onAddress?: (addr: string) => void }) {
  useMapEvents({
    async click(e) {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      onChange(pos);
      if (onAddress) {
        const addr = await reverseGeocode(pos.lat, pos.lng);
        if (addr) onAddress(addr);
      }
    },
  });
  return null;
}

function RecenterOnCity({ city }: { city: string }) {
  const map = useMap();
  useEffect(() => {
    const center = CITY_CENTERS[city];
    if (center) map.setView(center, 12, { animate: true });
  }, [city, map]);
  return null;
}

interface Props {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  onAddress?: (address: string) => void;
  city?: string;
}

export default function MapPicker({ value, onChange, onAddress, city = "Алматы" }: Props) {
  const defaultCenter = CITY_CENTERS[city] ?? CITY_CENTERS["Алматы"];

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
      <MapContainer
        center={value ? [value.lat, value.lng] : defaultCenter}
        zoom={12}
        style={{ height: 260, width: "100%", cursor: "crosshair" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ClickHandler onChange={onChange} onAddress={onAddress} />
        <RecenterOnCity city={city} />
        {value && <Marker position={[value.lat, value.lng]} />}
      </MapContainer>
      <div style={{ padding: "6px 10px", background: "#f7f8fc", fontSize: 12, color: "#939393" }}>
        {value
          ? `Координаты: ${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`
          : "Кликните на карте, чтобы отметить местоположение"}
      </div>
    </div>
  );
}
