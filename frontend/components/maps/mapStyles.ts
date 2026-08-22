import type { ThemeMode } from '@/services/ThemeContext'

export const MAP_STYLE_URLS: Record<ThemeMode, string> = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

export const DEFAULT_CENTER = { longitude: 6.9603, latitude: 50.9375 }
export const DEFAULT_ZOOM = 12
