<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'
import { computeMissingTemplateFields, computeEmployerLinkAdvisories } from '~/utils/vmsGapReview'
import { focusIntakeField } from '~/utils/focusIntakeField'
import { REPLACE_RESUME_CONFIRM } from '~/utils/intakeDraft'
import { ADMIN_SECTIONS, adminSectionForStep } from '~/utils/adminCandidateForm'
import { isEmrComplete, resolveEmrFields } from '~/utils/emrSystem'

const props = defineProps<{
  candidate: CandidateRow
}>()

const emit = defineEmits<{
  reload: []
  'open-parse-qa': []
}>()

const selected = toRef(props, 'candidate')
const workspace = useAdminCandidateWorkspace(selected)
const {
  form,
  saveStatus,
  parseMeta,
  activeSection,
  loading,
  loadError,
  isEditable,
  intakeUrl,
  resumeFilename,
  certKeys,
  scheduleAutosave,
  onParsed,
  downloadDraftDocx,
  markSubmitted,
  scrollToSection,
  authHeaders,
  reload,
} = workspace

const { fieldClasses, markParsePrefillFromApi, clearParseHighlight } = useIntakePrefillHighlight()
const hospitalAutocompleteRef = ref<{ openEmployerField: (fieldId: string) => boolean } | null>(null)

const actionError = ref<string | null>(null)
const actionLoading = ref(false)
const devPrefilling = ref(false)
const markConfirmOpen = ref(false)
const linkCopied = ref(false)
const skipAutosave = ref(true)

const missingFields = computed(() => computeMissingTemplateFields(form))
const employerLinkAdvisories = computed(() => computeEmployerLinkAdvisories(form))
const emrFields = computed(() => resolveEmrFields(form.emr_system))
const emrComplete = computed(() => isEmrComplete(emrFields.value.selection, emrFields.value.custom))

const hasExistingFormData = computed(() =>
  Boolean(
    form.first_name?.trim()
    || form.last_name?.trim()
    || form.email?.trim()
    || form.employers.length
    || form.education.length,
  ),
)

const sectionMissingCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const field of missingFields.value) {
    const section = adminSectionForStep(field.step)
    counts[section] = (counts[section] ?? 0) + 1
  }
  return counts
})

const parseUrl = computed(() =>
  props.candidate.id ? `/api/admin/candidates/${props.candidate.id}/parse` : undefined,
)

const displayName = computed(() => {
  const name = `${form.first_name || props.candidate.first_name || ''} ${form.last_name || props.candidate.last_name || ''}`.trim()
  return name || 'Unnamed candidate'
})

const sidebarName = computed(() => {
  if (loading.value) {
    const name = `${props.candidate.first_name || ''} ${props.candidate.last_name || ''}`.trim()
    return name || 'Unnamed candidate'
  }
  return displayName.value
})

async function onDownloadDraft() {
  actionError.value = null
  actionLoading.value = true
  try {
    await downloadDraftDocx()
  } catch (e: unknown) {
    actionError.value = e instanceof Error ? e.message : 'Could not download DOCX.'
  } finally {
    actionLoading.value = false
  }
}

async function onMarkSubmitted() {
  markConfirmOpen.value = false
  actionError.value = null
  actionLoading.value = true
  try {
    await markSubmitted()
    emit('reload')
  } catch (e: unknown) {
    actionError.value = e instanceof Error ? e.message : 'Could not mark submitted.'
  } finally {
    actionLoading.value = false
  }
}

async function copyInviteLink() {
  if (!intakeUrl.value) return
  linkCopied.value = false
  try {
    await navigator.clipboard.writeText(intakeUrl.value)
    linkCopied.value = true
  } catch {
    linkCopied.value = false
  }
}

async function goToField(step: number, fieldId: string) {
  scrollToSection(adminSectionForStep(step))
  await nextTick()
  if (fieldId.startsWith('employer-')) {
    hospitalAutocompleteRef.value?.openEmployerField(fieldId)
  }
  await nextTick()
  focusIntakeField(fieldId)
}

function onManualContinue() {
  scrollToSection('identity')
}

function onParsedResult(data: Record<string, unknown>) {
  onParsed(data)
  markParsePrefillFromApi(data as Parameters<typeof markParsePrefillFromApi>[0])
  emit('reload')
}

async function onDevFixture(mode: 'partial' | 'complete') {
  if (!import.meta.dev || !isEditable.value) return
  if (hasExistingFormData.value && !confirm(REPLACE_RESUME_CONFIRM)) return

  devPrefilling.value = true
  actionError.value = null
  try {
    const {
      buildDevIntakeParsePayload,
      buildDevIntakeParsePayloadComplete,
    } = await import('~/utils/devIntakeFixture')
    const payload = mode === 'complete'
      ? buildDevIntakeParsePayloadComplete(props.candidate.id)
      : buildDevIntakeParsePayload(props.candidate.id)
    onParsedResult(payload as Record<string, unknown>)
    scrollToSection('identity')
  } catch (e: unknown) {
    actionError.value = e instanceof Error ? e.message : 'Could not load dev fixture.'
  } finally {
    devPrefilling.value = false
  }
}

watch(form, () => {
  if (skipAutosave.value || !isEditable.value) return
  scheduleAutosave()
}, { deep: true })

watch(loading, (isLoading) => {
  if (!isLoading) {
    nextTick(() => {
      skipAutosave.value = false
    })
  } else {
    skipAutosave.value = true
  }
})
</script>

<template>
  <div class="flex min-h-[640px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm lg:flex-row">
    <nav class="shrink-0 border-b border-slate-200 p-4 lg:w-52 lg:border-b-0 lg:border-r">
      <template v-if="loading">
        <p class="text-sm font-semibold text-slate-900">{{ sidebarName }}</p>
        <div class="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100" />
      </template>
      <template v-else>
        <p class="text-sm font-semibold text-slate-900">{{ displayName }}</p>
        <p class="mt-0.5 text-xs capitalize text-slate-500">{{ candidate.status }}</p>
      </template>
      <ul class="mt-4 space-y-1">
        <li v-for="section in ADMIN_SECTIONS" :key="section.id">
          <button
            v-if="!loading"
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition"
            :class="activeSection === section.id
              ? 'bg-brand-50 font-medium text-brand-800'
              : 'text-slate-700 hover:bg-slate-50'"
            @click="scrollToSection(section.id)"
          >
            <span>{{ section.label }}</span>
            <span
              v-if="sectionMissingCounts[section.id]"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900"
            >
              {{ sectionMissingCounts[section.id] }}
            </span>
          </button>
          <div
            v-else
            class="flex items-center justify-between rounded-lg px-3 py-2"
          >
            <div class="h-4 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        </li>
      </ul>
    </nav>

    <div class="flex min-w-0 flex-1 flex-col">
      <AdminCandidateBuilderSkeleton v-if="loading" />

      <div
        v-else-if="loadError"
        class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <p class="text-sm text-red-700">{{ loadError }}</p>
        <button type="button" class="text-sm font-medium text-brand-700 underline" @click="reload()">
          Retry
        </button>
      </div>

      <div v-else class="flex flex-1 flex-col">
        <div class="flex-1 space-y-10 overflow-y-auto p-6">
          <!-- Resume -->
          <section id="admin-section-resume" class="scroll-mt-4 space-y-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-slate-900">Resume</h2>
                <p class="mt-1 text-sm text-slate-600">Upload the candidate's emailed resume to parse and prefill.</p>
              </div>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                @click="emit('open-parse-qa')"
              >
                Parse QA
              </button>
            </div>
            <p v-if="resumeFilename" class="text-sm text-slate-600">
              Current file: <span class="font-medium">{{ resumeFilename }}</span>
            </p>
            <ParseNoticeBanner :meta="parseMeta" show-fields-found />
            <FileDropZone
              v-if="isEditable"
              variant="admin"
              :candidate-id="candidate.id"
              :parse-url="parseUrl"
              :auth-headers="authHeaders"
              :has-existing-data="hasExistingFormData"
              :disabled="devPrefilling"
              @parsed="onParsedResult"
              @manual="onManualContinue"
            />
            <DevParseFixturePanel
              v-if="isEditable"
              context="admin"
              :disabled="devPrefilling"
              @prefill="onDevFixture"
            />
            <p v-else class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Submitted — upload is locked. Download DOCX from the footer if needed.
            </p>
          </section>

          <!-- Identity -->
          <section id="admin-section-identity" class="scroll-mt-4 space-y-4 border-t border-slate-100 pt-8">
            <h2 class="text-lg font-semibold text-slate-900">Identity</h2>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="block">
                <span class="field-label">First name</span>
                <input
                  id="intake-field-first_name"
                  v-model="form.first_name"
                  autocomplete="given-name"
                  class="field"
                  :class="fieldClasses('first_name')"
                  :disabled="!isEditable"
                  @input="clearParseHighlight('first_name')"
                >
              </label>
              <label class="block">
                <span class="field-label">Last name</span>
                <input
                  id="intake-field-last_name"
                  v-model="form.last_name"
                  autocomplete="family-name"
                  class="field"
                  :class="fieldClasses('last_name')"
                  :disabled="!isEditable"
                  @input="clearParseHighlight('last_name')"
                >
              </label>
              <label class="block">
                <span class="field-label">Email</span>
                <input
                  id="intake-field-email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  class="field"
                  :class="fieldClasses('email')"
                  :disabled="!isEditable"
                  @input="clearParseHighlight('email')"
                >
              </label>
              <label class="block">
                <span class="field-label">Phone</span>
                <input
                  id="intake-field-phone"
                  v-model="form.phone"
                  type="tel"
                  autocomplete="tel"
                  class="field"
                  :class="fieldClasses('phone')"
                  :disabled="!isEditable"
                  @input="clearParseHighlight('phone')"
                >
              </label>
            </div>
          </section>

          <!-- Employment -->
          <section id="admin-section-employment" class="scroll-mt-4 space-y-4 border-t border-slate-100 pt-8">
            <h2 class="text-lg font-semibold text-slate-900">Employment</h2>
            <SpecialtyChipInput
              v-model="form.specialties"
              label="Specialties / units"
              placeholder="e.g. ICU, ER, Med-Surg"
              field-id="specialties"
            />
            <HospitalAutocomplete
              ref="hospitalAutocompleteRef"
              v-model:emr="form.emr_system"
              deck-mode="multi"
              :employers="form.employers"
              @update:employers="form.employers = $event"
            />
            <p v-if="!emrComplete && form.employers.length" class="text-sm text-amber-800" role="status">
              Select an EMR platform below. If you choose Other, enter the system name — it is required before download.
            </p>
          </section>

          <!-- Credentials -->
          <section id="admin-section-credentials" class="scroll-mt-4 space-y-4 border-t border-slate-100 pt-8">
            <h2 class="text-lg font-semibold text-slate-900">Credentials & clinical</h2>
            <CredentialsChecklist
              v-model:compact-license-status="form.compact_license_status"
              :credentials="form.credentials"
              :license-number="form.license_number"
              :license-state="form.license_state"
              :cert-keys="certKeys"
              @update:credentials="form.credentials = $event"
              @update:license-number="form.license_number = $event"
              @update:license-state="form.license_state = $event"
            />
            <ClinicalSummaryFields
              v-model:years-nursing-experience="form.years_nursing_experience"
              v-model:average-patient-ratios="form.average_patient_ratios"
              v-model:specialized-medical-equipment="form.specialized_medical_equipment"
            />
            <EducationRepeater v-model="form.education" />
          </section>

          <!-- Review -->
          <section id="admin-section-review" class="scroll-mt-4 border-t border-slate-100 pt-8">
            <IntakeReviewPanel
              :missing="missingFields"
              :advisories="employerLinkAdvisories"
              :submitting="actionLoading"
              allow-incomplete-submit
              @go-to-field="({ step, fieldId }) => goToField(step, fieldId)"
              @submit="onDownloadDraft"
              @back="scrollToSection('credentials')"
            />
            <div v-if="isEditable" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-sm font-medium text-slate-900">Finish entirely yourself?</p>
              <p class="mt-1 text-sm text-slate-600">
                Mark submitted locks the candidate invite link. Use this only when you will not ask the candidate to finish in the app.
              </p>
              <button
                type="button"
                class="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                :disabled="actionLoading"
                @click="markConfirmOpen = true"
              >
                Mark submitted
              </button>
            </div>
          </section>
        </div>

        <div class="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div class="flex flex-wrap items-center gap-4">
            <IntakeSaveStatus :status="saveStatus" />
            <div v-if="intakeUrl" class="flex min-w-0 flex-1 items-center gap-2">
              <input
                :value="intakeUrl"
                type="text"
                readonly
                class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                aria-label="Candidate intake link"
                @focus="($event.target as HTMLInputElement).select()"
              >
              <button
                type="button"
                class="shrink-0 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                @click="copyInviteLink"
              >
                {{ linkCopied ? 'Copied!' : 'Copy link' }}
              </button>
            </div>
            <button
              type="button"
              class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="actionLoading || !isEditable"
              @click="onDownloadDraft"
            >
              Download draft DOCX
            </button>
          </div>
          <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="markConfirmOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-submitted-title"
      @click.self="markConfirmOpen = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 id="mark-submitted-title" class="text-lg font-semibold text-slate-900">Mark submitted?</h3>
        <p class="mt-2 text-sm text-slate-600">
          This downloads the DOCX, sets status to submitted, and locks the intake link for editing. The candidate can no longer finish in the app unless you create a new invite.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="markConfirmOpen = false">
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            @click="onMarkSubmitted"
          >
            Mark submitted
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
