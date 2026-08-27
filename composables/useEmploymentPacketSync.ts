import type { Ref } from 'vue'
import {
  employmentPacketSyncMessage,
  type EmploymentPacketSyncMode,
} from '~/utils/employmentPacketSync'

const SYNC_NOTICE_MS = 4000

export function useEmploymentPacketSync(options: {
  saveStatus: Ref<'idle' | 'saving' | 'saved' | 'error'>
  mode: EmploymentPacketSyncMode
  /** When false, skip the post-save notice (preview refresh still runs). */
  isActive?: Ref<boolean>
  onPreviewRefresh?: () => void
}) {
  const syncNotice = ref<string | null>(null)
  const previewStale = ref(false)
  let noticeTimer: ReturnType<typeof setTimeout> | null = null
  let employmentFeedsPending = false

  function clearSyncNotice() {
    syncNotice.value = null
    if (noticeTimer) {
      clearTimeout(noticeTimer)
      noticeTimer = null
    }
  }

  function markEmploymentFeedsChanged() {
    employmentFeedsPending = true
    previewStale.value = true
  }

  function acknowledgePreviewFresh() {
    previewStale.value = false
  }

  function showSyncNotice(message: string) {
    syncNotice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(clearSyncNotice, SYNC_NOTICE_MS)
  }

  watch(
    () => options.saveStatus.value,
    (status, prev) => {
      if (status !== 'saved' || prev !== 'saving') return

      if (employmentFeedsPending && (options.isActive?.value ?? true)) {
        employmentFeedsPending = false
        showSyncNotice(employmentPacketSyncMessage(options.mode))
      }

      options.onPreviewRefresh?.()
    },
  )

  onBeforeUnmount(clearSyncNotice)

  return {
    syncNotice,
    previewStale,
    markEmploymentFeedsChanged,
    acknowledgePreviewFresh,
    clearSyncNotice,
  }
}
