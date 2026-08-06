const DEV_TOOLS_KEY = 'rr-admin-dev-tools'
const SHOW_ALL_KEY = 'rr-admin-show-all-candidates'

/**
 * Platform admin (PLATFORM_ADMIN_EMAILS) can opt into Dev tools:
 * Show all recruiters, Parse QA, parse fixtures.
 */
export function usePlatformDevTools() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isPlatformAdmin = useState('platform-is-admin', () => false)
  const devToolsEnabled = useState('platform-dev-tools', () => false)
  const capsLoaded = useState('platform-caps-loaded', () => false)

  const platformToolsActive = computed(
    () => isPlatformAdmin.value && devToolsEnabled.value,
  )

  function readStoredDevTools(): boolean {
    try {
      return localStorage.getItem(DEV_TOOLS_KEY) === '1'
    } catch {
      return false
    }
  }

  function persistDevTools(on: boolean) {
    try {
      localStorage.setItem(DEV_TOOLS_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function clearShowAllPreference() {
    try {
      localStorage.setItem(SHOW_ALL_KEY, '0')
    } catch {
      /* ignore */
    }
  }

  async function refreshCapabilities() {
    if (!user.value) {
      isPlatformAdmin.value = false
      devToolsEnabled.value = false
      capsLoaded.value = true
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        isPlatformAdmin.value = false
        devToolsEnabled.value = false
        capsLoaded.value = true
        return
      }

      const res = await $fetch<{ isPlatformAdmin: boolean }>('/api/admin/capabilities', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      isPlatformAdmin.value = res.isPlatformAdmin
      if (res.isPlatformAdmin) {
        devToolsEnabled.value = readStoredDevTools()
      } else {
        devToolsEnabled.value = false
        clearShowAllPreference()
      }
    } catch {
      isPlatformAdmin.value = false
      devToolsEnabled.value = false
    } finally {
      capsLoaded.value = true
    }
  }

  function setDevToolsEnabled(on: boolean) {
    if (!isPlatformAdmin.value) return
    devToolsEnabled.value = on
    persistDevTools(on)
    if (!on) clearShowAllPreference()
  }

  return {
    isPlatformAdmin,
    devToolsEnabled,
    capsLoaded,
    platformToolsActive,
    refreshCapabilities,
    setDevToolsEnabled,
    SHOW_ALL_KEY,
  }
}
