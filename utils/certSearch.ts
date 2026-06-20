import {
  CERTIFICATION_GROUPS,
  CERTIFICATION_GROUP_LABELS,
  CERTIFICATION_OPTIONS,
  type CertificationGroupLabel,
} from './certificationOptions.ts'

export type CertSearchRow = {
  type: 'option'
  group: CertificationGroupLabel
  value: string
  label: string
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
  return queryParts.every(token => optionParts.some(part => part.startsWith(token)))
}

function optionMatchesQuery(option: string, query: string): boolean {
  return tokensMatchOption(query, option)
}

function groupMatchesQuery(group: CertificationGroupLabel, query: string): boolean {
  return tokensMatchOption(query, group)
}

export function filterCertificationGroups(query: string): Array<{
  group: CertificationGroupLabel
  options: string[]
}> {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return CERTIFICATION_GROUP_LABELS.map(group => ({
      group,
      options: [...CERTIFICATION_GROUPS[group]],
    }))
  }

  return CERTIFICATION_GROUP_LABELS.flatMap((group) => {
    const groupMatch = groupMatchesQuery(group, query)
    const options = CERTIFICATION_GROUPS[group].filter(
      option => groupMatch || optionMatchesQuery(option, query),
    )
    if (!options.length) return []
    return [{ group, options }]
  })
}

export function buildCertSearchRows(query: string, selectedKeys: ReadonlySet<string>): CertSearchRow[] {
  const rows: CertSearchRow[] = []
  for (const { group, options } of filterCertificationGroups(query)) {
    for (const option of options) {
      if (selectedKeys.has(option)) continue
      rows.push({ type: 'option', group, value: option, label: option })
    }
  }
  return rows
}

export function certCategoryOptionCount(group: CertificationGroupLabel): number {
  return CERTIFICATION_GROUPS[group].length
}

export function certBrowseRowId(index: number): string {
  return `cert-browse-row-${index}`
}

export function certSearchRowId(index: number): string {
  return `cert-search-row-${index}`
}

export function findCertSearchIndex(rows: CertSearchRow[], value: string): number {
  return rows.findIndex(row => row.value === value)
}

export { CERTIFICATION_OPTIONS }
