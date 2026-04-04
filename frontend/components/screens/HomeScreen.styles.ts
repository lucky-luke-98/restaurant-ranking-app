import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  greeting: {
    color: colors.textTertiary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
  },
  menu: {
    gap: 16,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  logoutText: {
    color: colors.textFaint,
    fontSize: 14,
  },
})
