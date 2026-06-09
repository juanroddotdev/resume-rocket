import {
  collectParsePrefillFieldIds,
  employerFacilityMetricsKey,
  mergeFieldIdMaps,
} from '~/utils/intakePrefillHighlight'

export function useIntakePrefillHighlight() {
  const route = useRoute()
  const token = String(route.params.token ?? '')

  const parseFields = useState<Record<string, true>>(`intake-prefill-parse:${token}`, () => ({}))
  const dbMetricFields = useState<Record<string, true>>(`intake-prefill-db:${token}`, () => ({}))

  function isParseHighlighted(fieldId: string) {
    return Boolean(parseFields.value[fieldId])
  }

  function isDbMetricHighlighted(fieldId: string) {
    return Boolean(dbMetricFields.value[fieldId])
  }

  function isEmployerDbMetricsHighlighted(index: number) {
    return isDbMetricHighlighted(employerFacilityMetricsKey(index))
  }

  function fieldClasses(fieldId: string, ...extra: Array<string | false | null | undefined>) {
    return [
      'field',
      ...extra,
      isParseHighlighted(fieldId) ? 'field-prefilled' : null,
    ]
  }

  function markParsePrefillFromApi(data: Parameters<typeof collectParsePrefillFieldIds>[0]) {
    parseFields.value = mergeFieldIdMaps(parseFields.value, collectParsePrefillFieldIds(data))
  }

  function clearParseHighlight(fieldId: string) {
    if (!parseFields.value[fieldId]) return
    const next = { ...parseFields.value }
    delete next[fieldId]
    parseFields.value = next
  }

  function markEmployerDbMetrics(index: number) {
    const key = employerFacilityMetricsKey(index)
    dbMetricFields.value = { ...dbMetricFields.value, [key]: true }
  }

  function clearEmployerDbMetrics(index: number) {
    const key = employerFacilityMetricsKey(index)
    if (!dbMetricFields.value[key]) return
    const next = { ...dbMetricFields.value }
    delete next[key]
    dbMetricFields.value = next
  }

  function clearAllPrefillHighlights() {
    parseFields.value = {}
    dbMetricFields.value = {}
  }

  return {
    isParseHighlighted,
    isDbMetricHighlighted,
    isEmployerDbMetricsHighlighted,
    fieldClasses,
    markParsePrefillFromApi,
    clearParseHighlight,
    markEmployerDbMetrics,
    clearEmployerDbMetrics,
    clearAllPrefillHighlights,
  }
}
