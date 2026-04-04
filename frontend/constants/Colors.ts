const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export type ThemeColors = typeof Colors.light;

export const Colors = {
  light: {
    // Text hierarchy
    text: '#11181C',
    textSecondary: 'rgba(0,0,0,0.75)',
    textTertiary: 'rgba(0,0,0,0.55)',
    textMuted: 'rgba(0,0,0,0.45)',
    textFaint: 'rgba(0,0,0,0.35)',
    textPlaceholder: 'rgba(0,0,0,0.3)',

    // Backgrounds
    background: '#fff',
    backgroundElevated: '#ffffff',
    backgroundCard: 'rgba(0,0,0,0.04)',
    backgroundInput: 'rgba(0,0,0,0.06)',
    backgroundButton: 'rgba(0,0,0,0.08)',
    backgroundButtonStrong: 'rgba(0,0,0,0.1)',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    overlayHeavy: 'rgba(0,0,0,0.7)',
    overlayBackdrop: 'rgba(0,0,0,0.9)',
    overlaySubmitting: 'rgba(255,255,255,0.9)',

    // Borders
    border: 'rgba(0,0,0,0.08)',
    borderActive: '#11181C',
    borderOwnCard: 'rgba(0,0,0,0.25)',

    // Slider
    sliderTrack: 'rgba(0,0,0,0.1)',
    sliderFill: 'rgba(0,0,0,0.35)',
    sliderThumb: '#11181C',

    // Accent / brand
    primary: 'rgba(140,50,110,0.85)',
    error: '#dc3545',
    errorBackground: 'rgba(220,53,69,0.1)',
    success: '#4CAF50',
    warning: '#FF9800',
    link: '#0a7ea4',

    // Icons
    icon: '#687076',
    iconMuted: 'rgba(0,0,0,0.35)',

    // Tabs
    tint: tintColorLight,
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    // Map
    legendBackground: 'rgba(0,0,0,0.7)',
    imageRemoveBackground: 'rgba(0,0,0,0.7)',
  },
  dark: {
    // Text hierarchy
    text: '#ECEDEE',
    textSecondary: 'rgba(255,255,255,0.8)',
    textTertiary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.5)',
    textFaint: 'rgba(255,255,255,0.4)',
    textPlaceholder: 'rgba(255,255,255,0.3)',

    // Backgrounds
    background: '#151718',
    backgroundElevated: '#1c1c1e',
    backgroundCard: 'rgba(255,255,255,0.08)',
    backgroundInput: 'rgba(255,255,255,0.1)',
    backgroundButton: 'rgba(255,255,255,0.12)',
    backgroundButtonStrong: 'rgba(255,255,255,0.15)',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    overlayHeavy: 'rgba(0,0,0,0.7)',
    overlayBackdrop: 'rgba(0,0,0,0.9)',
    overlaySubmitting: 'rgba(28,28,30,0.9)',

    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderActive: '#fff',
    borderOwnCard: 'rgba(255,255,255,0.4)',

    // Slider
    sliderTrack: 'rgba(255,255,255,0.1)',
    sliderFill: 'rgba(255,255,255,0.45)',
    sliderThumb: '#fff',

    // Accent / brand
    primary: 'rgba(140,50,110,0.85)',
    error: '#ff6b6b',
    errorBackground: 'rgba(255,107,107,0.1)',
    success: '#4CAF50',
    warning: '#FF9800',
    link: '#0a7ea4',

    // Icons
    icon: '#9BA1A6',
    iconMuted: 'rgba(255,255,255,0.4)',

    // Tabs
    tint: tintColorDark,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    // Map
    legendBackground: 'rgba(0,0,0,0.7)',
    imageRemoveBackground: 'rgba(0,0,0,0.7)',
  },
};
