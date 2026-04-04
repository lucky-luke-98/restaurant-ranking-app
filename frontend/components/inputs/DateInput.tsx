import { useState, useMemo, useRef } from 'react'
import { View, Text, Pressable, Modal, StyleSheet, Platform } from 'react-native'
import { CalendarIcon, CaretLeftIcon, CaretRightIcon } from 'phosphor-react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useTranslation } from '@/services/LanguageContext'
import { ThemeColors } from '@/constants/Colors'

interface DateInputProps {
  label: string
  value: string
  onChange: (date: string) => void
  placeholder?: string
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const DAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

export default function DateInput({ label, value, onChange, placeholder }: DateInputProps) {
  const colors = useThemeColors()
  const { language } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [visible, setVisible] = useState(false)

  const today = new Date()
  const initial = value ? parseDate(value) : today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const months = language === 'de' ? MONTHS_DE : MONTHS_EN
  const dayHeaders = language === 'de' ? DAYS_DE : DAYS

  const open = () => {
    const d = value ? parseDate(value) : today
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setVisible(true)
  }

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    onChange(formatDate(d))
    setVisible(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const selectedStr = value || ''

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.inputButton} onPress={open}>
        <CalendarIcon size={18} color={colors.textFaint} />
        <Text style={[styles.inputText, !value && styles.inputPlaceholder]}>
          {value || placeholder || 'YYYY-MM-DD'}
        </Text>
      </Pressable>

      <Modal visible={visible} animationType="fade" transparent>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.calendar} onPress={() => {}}>
            <View style={styles.calHeader}>
              <Pressable onPress={prevMonth} hitSlop={8}>
                <CaretLeftIcon size={20} color={colors.text} weight="bold" />
              </Pressable>
              <Text style={styles.calTitle}>
                {months[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={nextMonth} hitSlop={8}>
                <CaretRightIcon size={20} color={colors.text} weight="bold" />
              </Pressable>
            </View>

            <View style={styles.dayHeaderRow}>
              {dayHeaders.map((d) => (
                <Text key={d} style={styles.dayHeader}>{d}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {cells.map((day, i) => {
                if (day === null) {
                  return <View key={`empty-${i}`} style={styles.dayCell} />
                }
                const dateStr = formatDate(new Date(viewYear, viewMonth, day))
                const isSelected = dateStr === selectedStr
                const isToday = dateStr === formatDate(today)
                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => selectDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {value ? (
              <Pressable style={styles.clearButton} onPress={() => { onChange(''); setVisible(false) }}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      color: colors.textTertiary,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
    },
    inputButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.backgroundInput,
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
    },
    inputText: {
      color: colors.text,
      fontSize: 15,
    },
    inputPlaceholder: {
      color: colors.textPlaceholder,
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
      padding: 24,
    },
    calendar: {
      backgroundColor: colors.backgroundElevated,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    calHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    calTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    dayHeaderRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    dayHeader: {
      flex: 1,
      textAlign: 'center',
      color: colors.textFaint,
      fontSize: 12,
      fontWeight: '600',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 999,
    },
    dayCellSelected: {
      backgroundColor: colors.text,
    },
    dayCellToday: {
      borderWidth: 1,
      borderColor: colors.textFaint,
    },
    dayText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    dayTextSelected: {
      color: colors.background,
      fontWeight: '700',
    },
    dayTextToday: {
      fontWeight: '700',
    },
    clearButton: {
      alignItems: 'center',
      marginTop: 12,
      paddingVertical: 8,
    },
    clearButtonText: {
      color: colors.textMuted,
      fontSize: 14,
    },
  })
