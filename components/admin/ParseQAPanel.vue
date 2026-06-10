<script setup lang="ts">
import type { ParseAuditViewResponse } from '~/types/parse'

const props = defineProps<{
  open: boolean
  candidateId: string | null
  candidateName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const supabase = useSupabaseClient()
const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<ParseAuditViewResponse | null>(null)

watch(
  () => [props.open, props.candidateId] as const,
  async ([open, candidateId]) => {
    if (!open || !candidateId) {
      data.value = null
      error.value = null
      return
    }
    await loadAudit(candidateId)
  },
)

async function loadAudit(candidateId: string) {
  loading.value = true
  error.value = null
  data.value = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      error.value = 'Sign in required to view parse QA.'
      return
    }
    data.value = await $fetch<ParseAuditViewResponse>(`/api/admin/candidates/${candidateId}/parse-audit`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not load parse QA.'
  } finally {
    loading.value = false
  }
}

function closePanel() {
  emit('close')
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) closePanel()
}

const hasAuditContent = computed(() => {
  if (!data.value) return false
  return Boolean(
    data.value.outcome
    || data.value.audit
    || data.value.employers.length
    || data.value.facilitiesWithoutEmployer.length,
  )
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      :aria-label="`Parse QA for ${candidateName}`"
      @click="onBackdropClick"
    >
      <div class="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div class="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Parse QA</h2>
            <p class="mt-0.5 text-sm text-slate-600">{{ candidateName }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="closePanel"
          >
            Close
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div v-if="loading" class="space-y-3">
            <div class="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div class="h-20 animate-pulse rounded-lg bg-slate-100" />
            <div class="h-32 animate-pulse rounded-lg bg-slate-100" />
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {{ error }}
            <button
              type="button"
              class="ml-2 font-medium underline"
              @click="candidateId && loadAudit(candidateId)"
            >
              Retry
            </button>
          </div>

          <div v-else-if="data" class="space-y-5">
            <section v-if="data.outcome || data.parseError" class="space-y-2">
              <h3 class="text-sm font-semibold text-slate-900">Outcome</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-if="data.outcome?.document_scan"
                  class="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800"
                >
                  Visual scan
                </span>
                <span
                  v-if="data.outcome?.partial_parse"
                  class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900"
                >
                  Partial parse
                </span>
                <span
                  v-if="data.outcome && !data.outcome.parse_failed && !data.outcome.partial_parse"
                  class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                >
                  Parse OK
                </span>
                <span
                  v-if="data.outcome?.parse_failed"
                  class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                >
                  Parse failed
                </span>
                <span
                  v-if="data.outcome"
                  class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                >
                  {{ data.outcome.fields_found }} fields found
                </span>
              </div>
              <p v-if="data.parseError" class="text-sm text-amber-900">
                {{ data.parseError }}
              </p>
            </section>

            <section v-if="data.audit?.identifiedFacilitiesRaw?.length" class="space-y-2">
              <h3 class="text-sm font-semibold text-slate-900">Facilities on resume</h3>
              <ul class="space-y-1 text-sm text-slate-700">
                <li
                  v-for="facility in data.audit.identifiedFacilitiesRaw"
                  :key="facility"
                  class="rounded-md bg-slate-50 px-3 py-2"
                >
                  {{ facility }}
                </li>
              </ul>
            </section>

            <section v-if="data.facilitiesWithoutEmployer.length" class="space-y-2">
              <h3 class="text-sm font-semibold text-amber-900">Facilities not in wizard</h3>
              <ul class="space-y-1 text-sm text-amber-950">
                <li
                  v-for="facility in data.facilitiesWithoutEmployer"
                  :key="`missing-${facility}`"
                  class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  {{ facility }}
                </li>
              </ul>
            </section>

            <section v-if="data.employers.length" class="space-y-2">
              <h3 class="text-sm font-semibold text-slate-900">Employer evidence</h3>
              <div class="overflow-x-auto rounded-lg border border-slate-200">
                <table class="min-w-full text-left text-sm">
                  <thead class="border-b bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th class="px-3 py-2 font-medium">Employer</th>
                      <th class="px-3 py-2 font-medium">Snippet</th>
                      <th class="px-3 py-2 font-medium">Wizard</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="employer in data.employers"
                      :key="employer.name"
                      class="border-b last:border-0"
                      :class="employer.missingSnippet || !employer.inWizard ? 'bg-amber-50/60' : ''"
                    >
                      <td class="px-3 py-2 align-top font-medium text-slate-900">{{ employer.name }}</td>
                      <td class="px-3 py-2 align-top text-slate-700">
                        <span v-if="employer.sourceSnippet">{{ employer.sourceSnippet }}</span>
                        <span v-else class="text-amber-800">Missing snippet</span>
                      </td>
                      <td class="px-3 py-2 align-top">
                        <span
                          v-if="employer.inWizard"
                          class="text-emerald-700"
                        >
                          Yes
                        </span>
                        <span v-else class="font-medium text-amber-800">Not linked</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div
              v-if="!hasAuditContent"
              class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600"
            >
              No parse audit yet. Upload a resume through intake with Gemini enabled to capture QA evidence.
            </div>

            <p v-if="data.audit?.capturedAt" class="text-xs text-slate-500">
              Audit captured {{ new Date(data.audit.capturedAt).toLocaleString() }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
