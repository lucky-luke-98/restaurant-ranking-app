import { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { MagnifyingGlassIcon, CheckIcon, PlusIcon, XIcon } from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  TAG_FACETS,
  DEFAULT_TAGS,
  MAX_TAGS_PER_RESTAURANT,
  normalizeTag,
  tagLabel,
  isDefaultTag,
} from '@/constants/Tags'
import { createStyles } from './TagPicker.styles'

interface TagPickerProps {
  selected: string[]
  onChange: (tags: string[]) => void
  /** Tags already in use across the app, so admin-created ones stay selectable by everyone. */
  knownTags?: string[]
  /** Only admins may bring a new tag into existence; everyone can apply an existing one. */
  canCreate?: boolean
  /** Tags the user may not deselect — removal is restricted to the restaurant's creator. */
  lockedTags?: string[]
  /** Defaults to the per-restaurant cap; pass Infinity when picking filters rather than tags. */
  maxSelected?: number
  disabled?: boolean
}

export default function TagPicker({
  selected,
  onChange,
  knownTags = [],
  canCreate = false,
  lockedTags = [],
  maxSelected = MAX_TAGS_PER_RESTAURANT,
  disabled = false,
}: TagPickerProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [query, setQuery] = useState('')

  const customTags = useMemo(
    () => Array.from(new Set(knownTags.filter((tag) => !isDefaultTag(tag)))).sort(),
    [knownTags],
  )

  const sections = useMemo(() => {
    const base: { key: string; label: string; tags: readonly string[] }[] = TAG_FACETS.map((facet) => ({
      key: facet.key,
      label: t[facet.labelKey] as string,
      tags: facet.tags as readonly string[],
    }))
    if (customTags.length > 0) {
      base.push({ key: 'custom', label: t.tagFacetCustom, tags: customTags })
    }
    return base
  }, [customTags, t])

  // Match on the localized label as well as the slug, so a German user typing
  // "Türkisch" or "Kebap" finds the `turkish` / `kebab` chips.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return null
    const all = [...DEFAULT_TAGS, ...customTags]
    return all.filter(
      (tag) => tag.includes(needle) || tagLabel(tag, t).toLowerCase().includes(needle),
    )
  }, [query, customTags, t])

  const atLimit = selected.length >= maxSelected
  const pendingSlug = normalizeTag(query)
  const canOfferCreate =
    canCreate &&
    pendingSlug.length > 0 &&
    !DEFAULT_TAGS.includes(pendingSlug) &&
    !customTags.includes(pendingSlug) &&
    !selected.includes(pendingSlug) &&
    !atLimit

  const toggle = (tag: string) => {
    if (disabled) return
    if (selected.includes(tag)) {
      if (lockedTags.includes(tag)) return
      onChange(selected.filter((s) => s !== tag))
    } else if (!atLimit) {
      onChange([...selected, tag])
    }
  }

  const create = () => {
    if (!canOfferCreate) return
    onChange([...selected, pendingSlug])
    setQuery('')
  }

  const renderChip = (tag: string) => {
    const active = selected.includes(tag)
    const locked = active && lockedTags.includes(tag)
    const blocked = (!active && atLimit) || locked
    return (
      <Pressable
        key={tag}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipActive,
          blocked && styles.chipBlocked,
          pressed && !blocked && styles.chipPressed,
        ]}
        onPress={() => toggle(tag)}
        disabled={disabled || blocked}
      >
        {active && <CheckIcon size={13} color="#fff" weight="bold" />}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{tagLabel(tag, t)}</Text>
      </Pressable>
    )
  }

  return (
    <View>
      {selected.length > 0 && (
        <View style={styles.selectedRow}>
          {selected.map((tag) => {
            const locked = lockedTags.includes(tag)
            return (
              <Pressable
                key={tag}
                style={({ pressed }) => [styles.selectedChip, pressed && !locked && styles.chipPressed]}
                onPress={() => toggle(tag)}
                disabled={disabled || locked}
              >
                <Text style={styles.selectedChipText}>{tagLabel(tag, t)}</Text>
                {!locked && <XIcon size={12} color="#fff" weight="bold" />}
              </Pressable>
            )
          })}
        </View>
      )}

      <View style={styles.searchRow}>
        <MagnifyingGlassIcon size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchTags}
          placeholderTextColor={colors.textPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={6}>
            <XIcon size={14} color={colors.textMuted} weight="bold" />
          </Pressable>
        )}
      </View>

      {Number.isFinite(maxSelected) && (
        <Text style={styles.limitHint}>
          {atLimit ? t.tagLimitReached(maxSelected) : `${selected.length}/${maxSelected}`}
        </Text>
      )}

      {matches ? (
        <>
          {matches.length > 0 && <View style={styles.chipsWrap}>{matches.map(renderChip)}</View>}
          {canOfferCreate && (
            <Pressable
              style={({ pressed }) => [styles.createRow, pressed && styles.chipPressed]}
              onPress={create}
              disabled={disabled}
            >
              <PlusIcon size={14} color={colors.text} weight="bold" />
              <Text style={styles.createText}>{t.createTagNamed(pendingSlug)}</Text>
            </Pressable>
          )}
          {matches.length === 0 && !canOfferCreate && (
            <Text style={styles.emptyHint}>
              {canCreate ? t.noTagsFound : `${t.noTagsFound} ${t.tagCreateAdminOnly}`}
            </Text>
          )}
        </>
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.chipsWrap}>{section.tags.map(renderChip)}</View>
          </View>
        ))
      )}
    </View>
  )
}
