import { Colors, Shadows, ThemeColors, ThemeShadows } from '@/constants/Colors';
import { useAppTheme } from '@/services/ThemeContext';

export function useThemeColors(): ThemeColors {
  const { mode } = useAppTheme();
  return mode === 'dark' ? Colors.dark : Colors.light;
}

export function useThemeShadows(): ThemeShadows {
  const { mode } = useAppTheme();
  return mode === 'dark' ? Shadows.dark : Shadows.light;
}
