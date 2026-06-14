export function useAdminHubMenu() {
  const hasSelectedCandidate = useState('admin-hub-has-selected', () => false)
  const parseQaTrigger = useState('admin-hub-parse-qa-trigger', () => 0)
  const devFixtureRequest = useState<'partial' | 'complete' | null>('admin-hub-dev-fixture', () => null)

  function requestParseQa() {
    if (!hasSelectedCandidate.value) return
    parseQaTrigger.value += 1
  }

  function requestDevFixture(mode: 'partial' | 'complete') {
    devFixtureRequest.value = mode
  }

  return {
    hasSelectedCandidate,
    parseQaTrigger,
    devFixtureRequest,
    requestParseQa,
    requestDevFixture,
  }
}
