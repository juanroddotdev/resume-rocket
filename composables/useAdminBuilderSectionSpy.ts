import type { Ref } from 'vue'
import { ADMIN_SECTIONS, type AdminSectionId } from '~/utils/adminCandidateForm'

const SECTION_IDS = ADMIN_SECTIONS.map(section => section.id)

export function useAdminBuilderSectionSpy(
  canvasRef: Ref<HTMLElement | null>,
  activeSection: Ref<AdminSectionId>,
  enabled: Ref<boolean>,
) {
  let pauseUntil = 0
  let removeListener: (() => void) | null = null

  function pauseScrollSpy(durationMs = 900) {
    pauseUntil = Date.now() + durationMs
  }

  function resolveActiveSection(root: HTMLElement): AdminSectionId {
    const anchor = root.getBoundingClientRect().top + 12
    let current = SECTION_IDS[0]!

    for (const id of SECTION_IDS) {
      const el = document.getElementById(`admin-section-${id}`)
      if (!el) continue
      if (el.getBoundingClientRect().top <= anchor) current = id
      else break
    }

    return current
  }

  function syncActiveSectionFromScroll() {
    if (Date.now() < pauseUntil || !enabled.value) return
    const root = canvasRef.value
    if (!root) return

    const next = resolveActiveSection(root)
    if (next !== activeSection.value) activeSection.value = next
  }

  watch(
    () => [canvasRef.value, enabled.value] as const,
    ([root, isEnabled]) => {
      removeListener?.()
      removeListener = null
      if (!root || !isEnabled) return

      root.addEventListener('scroll', syncActiveSectionFromScroll, { passive: true })
      removeListener = () => root.removeEventListener('scroll', syncActiveSectionFromScroll)
      nextTick(() => syncActiveSectionFromScroll())
    },
    { immediate: true },
  )

  onUnmounted(() => {
    removeListener?.()
  })

  return { pauseScrollSpy, syncActiveSectionFromScroll }
}
