import type { HospitalRow } from '~/types/hospital'

export function useHospitalSearch() {
  const query = ref('')
  const results = ref<HospitalRow[]>([])
  const searching = ref(false)
  const searchError = ref<string | null>(null)

  const showNoResults = computed(
    () => query.value.trim().length >= 2 && !searching.value && !searchError.value && results.value.length === 0,
  )

  let debounce: ReturnType<typeof setTimeout> | null = null

  watch(query, (q) => {
    if (debounce) clearTimeout(debounce)
    searchError.value = null
    if (q.length < 2) {
      results.value = []
      return
    }
    debounce = setTimeout(async () => {
      searching.value = true
      try {
        const res = await $fetch<{ hospitals: HospitalRow[] }>('/api/hospitals/search', {
          query: { query: q },
        })
        results.value = res.hospitals
      } catch {
        searchError.value = 'Could not search facilities. Check your connection and try again.'
        results.value = []
      } finally {
        searching.value = false
      }
    }, 300)
  })

  function clearSearch() {
    query.value = ''
    results.value = []
    searchError.value = null
  }

  return {
    query,
    results,
    searching,
    searchError,
    showNoResults,
    clearSearch,
  }
}
