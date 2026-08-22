import { useEffect } from 'react'
import type { ThemeColors } from '@/constants/Colors'
import type { ThemeMode } from '@/services/ThemeContext'

const STYLE_ID = 'maplibre-chrome-theme'

/** Themes MapLibre's own DOM (controls, attribution, popup) to the app palette. */
export function useMapChrome(colors: ThemeColors, mode: ThemeMode) {
  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = `
      .maplibregl-ctrl-group,
      .map-chrome-button {
        background: ${colors.backgroundElevated};
        border: 1px solid ${colors.border};
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        overflow: hidden;
      }
      .maplibregl-ctrl-group button,
      .map-chrome-button {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: ${colors.text};
        cursor: pointer;
        padding: 0;
      }
      .maplibregl-ctrl-group button + button {
        border-top: 1px solid ${colors.border};
      }
      .maplibregl-ctrl-group button:hover,
      .map-chrome-button:hover {
        background: ${colors.background};
      }
      .maplibregl-ctrl-group button:focus-visible,
      .map-chrome-button:focus-visible {
        outline: 2px solid ${colors.tint};
        outline-offset: -2px;
      }
      .maplibregl-ctrl-icon {
        filter: ${mode === 'dark' ? 'invert(1)' : 'none'};
      }
      .maplibregl-ctrl-attrib {
        background: ${colors.legendBackground} !important;
        border-radius: 8px;
      }
      .maplibregl-ctrl-attrib,
      .maplibregl-ctrl-attrib a {
        color: ${colors.text} !important;
        font-size: 10px;
      }
      .maplibregl-popup-content {
        background: ${colors.backgroundElevated};
        color: ${colors.text};
        border-radius: 14px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        padding: 12px 14px;
      }
      .maplibregl-popup-anchor-top .maplibregl-popup-tip,
      .maplibregl-popup-anchor-top-left .maplibregl-popup-tip,
      .maplibregl-popup-anchor-top-right .maplibregl-popup-tip {
        border-bottom-color: ${colors.backgroundElevated};
      }
      .maplibregl-popup-anchor-bottom .maplibregl-popup-tip,
      .maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip,
      .maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip {
        border-top-color: ${colors.backgroundElevated};
      }
      .maplibregl-popup-anchor-left .maplibregl-popup-tip {
        border-right-color: ${colors.backgroundElevated};
      }
      .maplibregl-popup-anchor-right .maplibregl-popup-tip {
        border-left-color: ${colors.backgroundElevated};
      }
      .maplibregl-marker { cursor: pointer; }
      .map-marker-button {
        cursor: pointer;
        outline: none;
        border-radius: 50%;
      }
      .map-marker-button:focus-visible {
        outline: 3px solid ${colors.tint};
        outline-offset: 2px;
      }
    `
  }, [colors, mode])
}
