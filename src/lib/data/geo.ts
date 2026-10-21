import type { GeoPoint } from "./types"

/** Jari-jari rata-rata bumi (km). */
const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180

/**
 * Jarak garis lurus dua titik (rumus haversine), dalam km. Cukup akurat untuk
 * mengurutkan SPPG terdekat; jarak tempuh jalan biasanya lebih jauh.
 */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Tautan petunjuk arah Google Maps ke `point` (dibuka di aplikasi Maps pada ponsel). */
export function directionsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`
}

/** `true` bila `point` berisi lintang/bujur WGS84 yang valid. */
export function isValidGeoPoint(point: GeoPoint): boolean {
  const { lat, lng } = point
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  )
}
