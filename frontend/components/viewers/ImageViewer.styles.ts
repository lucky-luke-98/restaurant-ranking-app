import { StyleSheet, Dimensions } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_W * 0.92,
    height: SCREEN_H * 0.75,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.backgroundButtonStrong,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
