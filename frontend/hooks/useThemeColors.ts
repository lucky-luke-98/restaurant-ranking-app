import { Colors, ThemeColors } from '@/constants/Colors';
import { useAppTheme } from '@/services/ThemeContext';

export function useThemeColors(): ThemeColors {
  const { mode } = useAppTheme();
  return mode === 'dark' ? Colors.dark : Colors.light;
}
