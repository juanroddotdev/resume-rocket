import {
  EMR_CHARTING_GROUPS,
  EMR_CHARTING_GROUP_LABELS,
  type EmrChartingGroupLabel,
} from './emrChartingSystems.ts'

const ALL_EMR_PRESETS = EMR_CHARTING_GROUP_LABELS.flatMap(
  label => EMR_CHARTING_GROUPS[label],
)

export type EmrSearchRow =
  | { type: 'custom', value: string, label: string }
  | { type: 'option', group: EmrChartingGroupLabel, value: string, label: string }

/** Substrings that match common shorthand for preset labels. */
const EMR_SEARCH_ALIASES: Record<string, string[]> = {
  cerner: ['cerner', 'millennium', 'oracle health'],
  meditech: ['meditech', 'expanse', 'magic'],
  pointclickcare: ['pointclickcare', 'pcc'],
  homecare: ['homecare homebase', 'hchb'],
  epic: ['epic'],
  matrixcare: ['matrixcare'],
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function searchTokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean)
}

function tokensMatchOption(query: string, option: string): boolean {
  const normalizedOption = normalizeSearchText(option)
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true
  if (normalizedOption === normalizedQuery) return true
  if (normalizedOption.startsWith(normalizedQuery)) return true

  const queryParts = searchTokens(query)
  const optionParts = searchTokens(option)
  return queryParts.every((token) => {
    return optionParts.some(part => part.startsWith(token))
  })
}

function optionMatchesQuery(option: string, query: string): boolean {
  if (tokensMatchOption(query, option)) return true

  const normalizedOption = normalizeSearchText(option)
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  for (const [key, aliases] of Object.entries(EMR_SEARCH_ALIASES)) {
    if (!normalizedOption.includes(key) && !aliases.some(alias => normalizedOption.includes(alias))) {
      continue
    }
    if (aliases.some(alias => alias.includes(normalizedQuery) || normalizedQuery.includes(alias))) {
      return true
    }
    if (normalizedQuery.includes(key)) return true
  }

  return false
}

function groupMatchesQuery(group: EmrChartingGroupLabel, query: string): boolean {
  return tokensMatchOption(query, group)
}

/** Filter grouped presets; empty query returns all groups. */
export function filterEmrChartingGroups(query: string): Array<{
  group: EmrChartingGroupLabel
  options: string[]
}> {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return EMR_CHARTING_GROUP_LABELS.map(group => ({
      group,
      options: [...EMR_CHARTING_GROUPS[group]],
    }))
  }

  return EMR_CHARTING_GROUP_LABELS.flatMap((group) => {
    const groupMatch = groupMatchesQuery(group, query)
    const options = EMR_CHARTING_GROUPS[group].filter(
      option => groupMatch || optionMatchesQuery(option, query),
    )
    if (!options.length) return []
    return [{ group, options }]
  })
}

export function findCanonicalEmrPreset(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (ALL_EMR_PRESETS.includes(trimmed as (typeof ALL_EMR_PRESETS)[number])) {
    return trimmed
  }
  const lower = trimmed.toLowerCase()
  return ALL_EMR_PRESETS.find(option => option.toLowerCase() === lower)
}

/** Flat list for keyboard navigation: optional custom row, then grouped options. */
export function buildEmrSearchRows(query: string): EmrSearchRow[] {
  const trimmed = query.trim()
  const rows: EmrSearchRow[] = []
  const canonical = trimmed ? findCanonicalEmrPreset(trimmed) : undefined

  if (trimmed && !canonical) {
    rows.push({
      type: 'custom',
      value: trimmed,
      label: `Add "${trimmed}" as custom software`,
    })
  }

  for (const { group, options } of filterEmrChartingGroups(query)) {
    for (const option of options) {
      rows.push({ type: 'option', group, value: option, label: option })
    }
  }

  return rows
}

export function emrSearchRowId(index: number): string {
  return `emr-search-row-${index}`
}
