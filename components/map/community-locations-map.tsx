"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type DemoMarker = { lat: number; lng: number; label: string };

export interface CommunityLocationsMapProps {
  locations: Array<{
    id: string;
    name: string;
    latitude?: string | null;
    longitude?: string | null;
    mapMarkers?: string | null;
  }>;
  selectedLocationId: string | null;
}

function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function parseMarkers(raw: string | null | undefined): DemoMarker[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const o = row as { lat?: unknown; lng?: unknown; label?: unknown };
        const lat = typeof o.lat === "number" ? o.lat : parseFloat(String(o.lat));
        const lng = typeof o.lng === "number" ? o.lng : parseFloat(String(o.lng));
        const label = typeof o.label === "string" ? o.label : "Court area (demo)";
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, label };
      })
      .filter((x): x is DemoMarker => x !== null);
  } catch {
    return [];
  }
}

function FitBounds({ markers }: { markers: DemoMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, markers]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [32.78, -96.8];
const DEFAULT_ZOOM = 10;

export function CommunityLocationsMap({
  locations,
  selectedLocationId,
}: CommunityLocationsMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const selected = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  const markers = useMemo(() => {
    if (!selected) return [];
    const fromJson = parseMarkers(selected.mapMarkers);
    if (fromJson.length > 0) return fromJson;
    const lat = selected.latitude ? parseFloat(selected.latitude) : NaN;
    const lng = selected.longitude ? parseFloat(selected.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [{ lat, lng, label: `${selected.name} (center)` }];
    }
    return [];
  }, [selected]);

  const center: [number, number] = useMemo(() => {
    if (markers.length === 1) return [markers[0].lat, markers[0].lng];
    if (selected?.latitude && selected?.longitude) {
      const lat = parseFloat(selected.latitude);
      const lng = parseFloat(selected.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
    return DEFAULT_CENTER;
  }, [markers, selected]);

  const mapKey = selectedLocationId ?? "overview";

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={markers.length ? 12 : DEFAULT_ZOOM}
      className="absolute inset-0 z-0 h-full min-h-[320px] w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.length > 0 && <FitBounds markers={markers} />}
      {markers.map((m, i) => (
        <Marker key={`${m.lat}-${m.lng}-${i}`} position={[m.lat, m.lng]}>
          <Popup>
            <span className="text-sm font-medium">{m.label}</span>
            {selected && (
              <div className="mt-2">
                <Link
                  href={`/locations/${selected.id}/courts`}
                  className="text-sm font-semibold text-primary underline"
                >
                  View courts
                </Link>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
