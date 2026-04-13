const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export type ThemeColors = typeof Colors.light;
export type ThemeShadows = typeof Shadows.light;

export const Shadows = {
  light: {
    card: {
      shadowColor: '#1F241A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  },
  dark: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

export const Colors = {
  light: {
    // Text hierarchy
    text: '#1F241A',
    textSecondary: 'rgba(0,0,0,0.75)',
    textTertiary: 'rgba(0,0,0,0.55)',
    textMuted: 'rgba(0,0,0,0.45)',
    textFaint: 'rgba(0,0,0,0.35)',
    textPlaceholder: 'rgba(0,0,0,0.3)',

    // Backgrounds
    background: '#F7F6EE',
    backgroundElevated: '#FBFAF4',
    tabBarBackground: '#EBE5D2',
    gradientTop: '#F8F4E6',
    gradientMid: '#F1ECDB',
    gradientBottom: '#E7E0CB',
    backgroundCard: 'rgba(0,0,0,0.04)',
    backgroundInput: 'rgba(0,0,0,0.06)',
    backgroundButton: 'rgba(0,0,0,0.08)',
    backgroundButtonStrong: 'rgba(0,0,0,0.1)',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    overlayHeavy: 'rgba(0,0,0,0.7)',
    overlayBackdrop: 'rgba(0,0,0,0.9)',
    overlaySubmitting: 'rgba(247,246,238,0.9)',

    // Borders
    border: 'rgba(0,0,0,0.08)',
    borderActive: '#1F241A',
    borderOwnCard: 'rgba(107,127,60,0.5)',

    // Slider
    sliderTrack: 'rgba(0,0,0,0.1)',
    sliderFill: 'rgba(0,0,0,0.35)',
    sliderThumb: '#1F241A',

    // Accent / brand
    primary: '#6B7F3C',
    error: '#dc3545',
    errorBackground: 'rgba(220,53,69,0.1)',
    success: '#3B8C7A',
    warning: '#FF9800',
    link: '#0a7ea4',

    // Icons
    icon: '#6B6F5F',
    iconMuted: 'rgba(0,0,0,0.35)',

    // Tabs
    tint: tintColorLight,
    tabIconDefault: '#6B6F5F',
    tabIconSelected: tintColorLight,

    // Map
    legendBackground: 'rgba(0,0,0,0.7)',
    imageRemoveBackground: 'rgba(0,0,0,0.7)',
  },
  dark: {
    // Text hierarchy
    text: '#EDEAE0',
    textSecondary: 'rgba(255,255,255,0.8)',
    textTertiary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.5)',
    textFaint: 'rgba(255,255,255,0.4)',
    textPlaceholder: 'rgba(255,255,255,0.3)',

    // Backgrounds
    background: '#1A1E15',
    backgroundElevated: '#23291E',
    tabBarBackground: '#23291E',
    gradientTop: '#2A3024',
    gradientMid: '#1B1F15',
    gradientBottom: '#0E1109',
    backgroundCard: 'rgba(255,255,255,0.08)',
    backgroundInput: 'rgba(255,255,255,0.1)',
    backgroundButton: 'rgba(255,255,255,0.12)',
    backgroundButtonStrong: 'rgba(255,255,255,0.15)',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    overlayHeavy: 'rgba(0,0,0,0.7)',
    overlayBackdrop: 'rgba(0,0,0,0.9)',
    overlaySubmitting: 'rgba(26,30,21,0.9)',

    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderActive: '#EDEAE0',
    borderOwnCard: 'rgba(138,158,74,0.5)',

    // Slider
    sliderTrack: 'rgba(255,255,255,0.1)',
    sliderFill: 'rgba(255,255,255,0.45)',
    sliderThumb: '#EDEAE0',

    // Accent / brand
    primary: '#8A9E4A',
    error: '#ff6b6b',
    errorBackground: 'rgba(255,107,107,0.1)',
    success: '#3B8C7A',
    warning: '#FF9800',
    link: '#0a7ea4',

    // Icons
    icon: '#9FA094',
    iconMuted: 'rgba(255,255,255,0.4)',

    // Tabs
    tint: tintColorDark,
    tabIconDefault: '#9FA094',
    tabIconSelected: tintColorDark,

    // Map
    legendBackground: 'rgba(0,0,0,0.7)',
    imageRemoveBackground: 'rgba(0,0,0,0.7)',
  },
};
