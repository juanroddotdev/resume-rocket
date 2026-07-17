<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'
import type { ProfessionalSnapshotKey } from '~/utils/professionalSnapshot'
import { computeMissingTemplateFields, computeEmployerLinkAdvisories } from '~/utils/vmsGapReview'
import { focusIntakeField } from '~/utils/focusIntakeField'
import { REPLACE_RESUME_CONFIRM } from '~/utils/intakeDraft'
import { ADMIN_SECTIONS, adminSectionForStep, type AdminSectionId } from '~/utils/adminCandidateForm'
import { allEmployersEmrComplete } from '~/utils/emrSystem'
import { applySupplementalValueToSnapshot } from '~/utils/professionalSnapshot'
import { buildSupplementalBucket } from '~/utils/supplementalBucket'

const props = defineProps<{
  candidate: CandidateRow
}>()

const emit = defineEmits<{
  reload: []
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
  resumeFilename,
  scheduleAutosave,
  onParsed,
  flushAutosave,
  downloadDraftDocx,
  markSubmitted,
  scrollToSection,
  authHeaders,
  reload,
} = workspace

const { fieldClasses, markParsePrefillFromApi, clearParseHighlight } = useIntakePrefillHighlight()
const hospitalAutocompleteRef = ref<{
  openEmployerField: (fieldId: string) => boolean | Promise<boolean>
  openCard: (index: number, options?: { scroll?: boolean }) => void | Promise<void>
} | null>(null)
const educationRepeaterRef = ref<{ openEducationField: (fieldId: string) => boolean } | null>(null)
const { devFixtureRequest } = useAdminHubMenu()

const actionError = ref<string | null>(null)
const actionLoading = ref(false)
const previewSaving = ref(false)
const previewSaveError = ref<string | null>(null)
const previewReloadToken = ref(0)
const previewAuthHeaders = ref<Record<string, string>>({})
const previewOpen = ref(false)
const devPrefilling = ref(false)
const markConfirmOpen = ref(false)
const skipAutosave = ref(true)
const extraDetailsOpen = ref(false)
const employersJumpOpen = ref(false)
const employersActiveIndex = ref(0)

const missingFields = computed(() => computeMissingTemplateFields(form))
const employerLinkAdvisories = computed(() => computeEmployerLinkAdvisories(form))
const employersEmrComplete = computed(() => allEmployersEmrComplete(form.employers))
const hasResumeFile = computed(() =>
  Boolean(resumeFilename.value || props.candidate.resume_storage_path),
)
const extraDetailsItems = computed(() =>
  buildSupplementalBucket({
    specialties: form.specialties,
    years_nursing_experience: form.years_nursing_experience,
    compact_license_status: form.compact_license_status,
    average_patient_ratios: form.average_patient_ratios,
    specialized_medical_equipment: form.specialized_medical_equipment,
    emr_system: form.emr_system,
    employers: form.employers,
    licenses: form.licenses,
    license_state: form.license_state,
    license_number: form.license_number,
  }),
)

const parseFieldsFound = computed(() => parseMeta.value?.fields_found ?? 0)
const parseHasWarning = computed(() =>
  Boolean(parseMeta.value?.document_scan || parseMeta.value?.partial_parse),
)
/** Happy-path prefill only — warnings keep a full canvas banner. */
const parseSuccessChip = computed(() =>
  Boolean(parseFieldsFound.value > 0 && !parseHasWarning.value),
)

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

const displayName = computed(() => {
  const name = `${form.first_name || props.candidate.first_name || ''} ${form.last_name || props.candidate.last_name || ''}`.trim()
  return name || 'Unnamed candidate'
})

const canvasRef = ref<HTMLElement | null>(null)

const scrollSpyEnabled = computed(() => !loading.value && !loadError.value && !devPrefilling.value)
const { pauseScrollSpy, syncActiveSectionFromScroll } = useAdminBuilderSectionSpy(
  canvasRef,
  activeSection,
  scrollSpyEnabled,
)

function scrollToSectionPaused(section: AdminSectionId) {
  pauseScrollSpy()
  scrollToSection(section)
}

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

async function preparePreview() {
  previewSaveError.value = null
  previewSaving.value = true
  try {
    await flushAutosave()
    previewAuthHeaders.value = await authHeaders()
  } catch {
    previewSaveError.value = 'Could not save the latest draft.'
  } finally {
    previewSaving.value = false
    previewReloadToken.value += 1
  }
}

async function openPreview() {
  previewOpen.value = true
  await preparePreview()
}

function closePreview() {
  previewOpen.value = false
}

function openExtraDetails() {
  extraDetailsOpen.value = true
  employersJumpOpen.value = false
}

function closeExtraDetails() {
  extraDetailsOpen.value = false
}

function openEmployersJump() {
  employersJumpOpen.value = true
  extraDetailsOpen.value = false
}

function closeEmployersJump() {
  employersJumpOpen.value = false
}

async function onEmployerJumpSelect(index: number) {
  employersActiveIndex.value = index
  await hospitalAutocompleteRef.value?.openCard(index, { scroll: true })
}

function applyExtraDetailToSnapshot(payload: { key: ProfessionalSnapshotKey; value: string }) {
  form.professional_snapshot = applySupplementalValueToSnapshot(
    form.professional_snapshot,
    payload.key,
    payload.value,
  )
}

async function onReviewPreview() {
  await openPreview()
}

async function onSectionSelect(sectionId: AdminSectionId) {
  closePreview()
  scrollToSectionPaused(sectionId)
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

async function goToField(step: number, fieldId: string) {
  closePreview()
  scrollToSectionPaused(adminSectionForStep(step))
  await nextTick()
  if (fieldId.startsWith('employer-')) {
    hospitalAutocompleteRef.value?.openEmployerField(fieldId)
  } else if (fieldId.startsWith('education-')) {
    educationRepeaterRef.value?.openEducationField(fieldId)
  }
  await nextTick()
  focusIntakeField(fieldId)
}

async function onDevFixture(mode: 'partial' | 'complete') {
  if (!import.meta.dev || !isEditable.value) return
  if (hasExistingFormData.value && !confirm(REPLACE_RESUME_CONFIRM)) return

  const scrollTop = canvasRef.value?.scrollTop ?? 0
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
    onParsed(payload as Record<string, unknown>, { focusIdentity: false })
    markParsePrefillFromApi(payload as Parameters<typeof markParsePrefillFromApi>[0])
    emit('reload')
    await nextTick()
    await nextTick()
    if (canvasRef.value) canvasRef.value.scrollTop = scrollTop
    await nextTick()
    syncActiveSectionFromScroll()
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
      syncActiveSectionFromScroll()
    })
  } else {
    skipAutosave.value = true
  }
})

watch(() => props.candidate.id, () => {
  extraDetailsOpen.value = false
  employersJumpOpen.value = false
  employersActiveIndex.value = 0
})

watch(devFixtureRequest, (mode) => {
  if (!mode) return
  devFixtureRequest.value = null
  onDevFixture(mode)
})
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <AdminCandidateBuilderSkeleton v-if="loading" class="flex-1" />

    <div
      v-else-if="loadError"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <p class="text-sm text-red-700">{{ loadError }}</p>
      <button type="button" class="text-sm font-medium text-brand-700 underline" @click="reload()">
        Retry
      </button>
    </div>

    <div v-else class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        class="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900">
            {{ displayName }}
            <span class="font-normal capitalize text-slate-500"> · {{ candidate.status }}</span>
          </p>
          <div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span v-if="resumeFilename" class="max-w-[14rem] truncate sm:max-w-xs" :title="resumeFilename">
              {{ resumeFilename }}
            </span>
            <span v-else-if="isEditable">No resume uploaded</span>
            <span
              v-if="parseSuccessChip"
              class="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800"
              role="status"
            >
              ✨ {{ parseFieldsFound }} field{{ parseFieldsFound === 1 ? '' : 's' }}
            </span>
            <span
              v-if="resumeFilename || (!resumeFilename && isEditable) || parseSuccessChip"
              class="text-slate-300"
              aria-hidden="true"
            >|</span>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700 hover:underline disabled:opacity-50"
              :disabled="devPrefilling"
              @click="openExtraDetails"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
              View extra details{{ extraDetailsItems.length ? ` (${extraDetailsItems.length})` : '' }}
            </button>
            <template v-if="form.employers.length >= 2">
              <span class="text-slate-300" aria-hidden="true">|</span>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700 hover:underline disabled:opacity-50"
                :disabled="devPrefilling"
                @click="openEmployersJump"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
                View employers ({{ form.employers.length }})
              </button>
            </template>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <IntakeSaveStatus :status="saveStatus" />
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              :disabled="previewSaving || !isEditable || devPrefilling"
              @click="openPreview"
            >
              {{ previewSaving && previewOpen ? 'Preparing…' : 'Preview packet' }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="actionLoading || !isEditable || devPrefilling"
              @click="onDownloadDraft"
            >
              Download draft
            </button>
          </div>
        </div>
      </div>
      <p v-if="actionError" class="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600 sm:px-6">{{ actionError }}</p>

      <AdminSectionTabs
        :sections="ADMIN_SECTIONS"
        :active-section="activeSection"
        :section-missing-counts="sectionMissingCounts"
        @select="onSectionSelect"
      />

      <div
        ref="canvasRef"
        data-admin-builder-canvas
        class="relative min-h-0 flex-1 overflow-y-auto"
      >
        <!-- Padding on inner wrapper (not the scrollport) so sticky employers sit flush under section tabs. -->
        <div class="relative space-y-10 p-4 sm:p-6">
        <div
          v-if="devPrefilling"
          class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <p class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            Loading fixture…
          </p>
        </div>
          <!-- Identity (upload/parse notices live here — no Resume tab) -->
          <section id="admin-section-identity" class="scroll-mt-4 space-y-4">
            <p v-if="!resumeFilename && isEditable" class="text-sm text-slate-600">
              No resume uploaded yet. Use <span class="font-medium">Re-upload resume</span> in the sidebar, or continue manually below.
            </p>
            <ParseNoticeBanner
              :meta="parseMeta"
              :show-fields-found="parseHasWarning"
            />
            <p v-if="!isEditable" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Submitted — upload is locked. Use <span class="font-medium">Download draft</span> above if needed.
            </p>
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
            <div class="grid gap-4 md:grid-cols-2">
            <label class="block md:col-span-2">
              <span class="field-label">Home address</span>
              <input
                id="intake-field-home_address"
                v-model="form.home_address"
                autocomplete="street-address"
                class="field"
                :class="fieldClasses('home_address')"
                :disabled="!isEditable"
                @input="clearParseHighlight('home_address')"
              >
            </label>
            <label class="block">
              <span class="field-label-compact">City</span>
              <input
                id="intake-field-home_city"
                v-model="form.home_city"
                autocomplete="address-level2"
                class="field"
                :class="fieldClasses('home_city')"
                :disabled="!isEditable"
                @input="clearParseHighlight('home_city')"
              >
            </label>
            <label class="block">
              <span class="field-label-compact">State</span>
              <input
                id="intake-field-home_state"
                v-model="form.home_state"
                autocomplete="address-level1"
                maxlength="2"
                class="field"
                :class="fieldClasses('home_state')"
                :disabled="!isEditable"
                @input="clearParseHighlight('home_state')"
              >
            </label>
            </div>
          </section>

          <!-- Professional snapshot -->
          <section id="admin-section-snapshot" class="scroll-mt-4 space-y-4 border-t border-slate-100 pt-8">
            <h2 class="text-lg font-semibold text-slate-900">Professional snapshot</h2>
            <AdminProfessionalSnapshot
              v-model="form.professional_snapshot"
              :specialties="form.specialties"
              :years-nursing-experience="form.years_nursing_experience"
              :average-patient-ratios="form.average_patient_ratios"
              :specialized-medical-equipment="form.specialized_medical_equipment"
              :emr-system="form.emr_system"
              :employers="form.employers"
              :candidate-id="candidate.id"
              :get-auth-headers="authHeaders"
              :has-resume="hasResumeFile"
              :extra-details-count="extraDetailsItems.length"
              :disabled="!isEditable"
              @go-to-employment="scrollToSectionPaused('employment')"
              @open-extra-details="openExtraDetails"
            />
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
              :employers="form.employers"
              :legacy-emr-system="form.emr_system"
              deck-mode="multi"
              :sticky-chrome-offset-px="0"
              :persist-immediate="flushAutosave"
              @update:employers="form.employers = $event"
              @active-change="employersActiveIndex = $event"
            />
            <p v-if="!employersEmrComplete && form.employers.length" class="text-sm text-amber-800" role="status">
              Select an EMR / charting system on each employer card. If you choose Other, enter the system name — required before download.
            </p>
          </section>

          <!-- Credentials -->
          <section id="admin-section-credentials" class="scroll-mt-4 space-y-4 border-t border-slate-100 pt-8">
            <h2 class="text-lg font-semibold text-slate-900">Credentials & clinical</h2>
            <CredentialsChecklist
              v-model:compact-license-status="form.compact_license_status"
              :credentials="form.credentials"
              :licenses="form.licenses"
              @update:credentials="form.credentials = $event"
              @update:licenses="form.licenses = $event"
            />
            <ClinicalSummaryFields
              v-model:years-nursing-experience="form.years_nursing_experience"
              v-model:specialized-medical-equipment="form.specialized_medical_equipment"
            />
            <EducationRepeater ref="educationRepeaterRef" v-model="form.education" />
          </section>

          <!-- Review -->
          <section id="admin-section-review" class="scroll-mt-4 border-t border-slate-100 pt-8">
            <IntakeReviewPanel
              :missing="missingFields"
              :advisories="employerLinkAdvisories"
              :submitting="actionLoading"
              allow-incomplete-submit
              :present-preview="false"
              :candidate-id="candidate.id"
              :preview-headers="previewAuthHeaders"
              :preview-reload-token="previewReloadToken"
              :preview-loading="previewSaving"
              :preview-save-error="previewSaveError"
              @go-to-field="({ step, fieldId }) => goToField(step, fieldId)"
              @preview="onReviewPreview"
              @submit="onDownloadDraft"
              @back="scrollToSectionPaused('credentials')"
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
      </div>
    </div>

    <DocxPreviewSlideOver
      v-if="!loading && !loadError"
      :open="previewOpen"
      :candidate-id="candidate.id"
      :headers="previewAuthHeaders"
      :reload-token="previewReloadToken"
      :preparing="previewSaving"
      :prepare-error="previewSaveError"
      :submitting="actionLoading"
      download-label="Download draft DOCX"
      @close="closePreview"
      @download="onDownloadDraft"
    />

    <AdminExtraDetailsDrawer
      :open="extraDetailsOpen"
      :items="extraDetailsItems"
      :candidate-name="displayName"
      :has-resume="hasResumeFile"
      :disabled="!isEditable"
      @close="closeExtraDetails"
      @apply="applyExtraDetailToSnapshot"
      @go-to-snapshot="scrollToSectionPaused('snapshot')"
    />

    <EmployersJumpDrawer
      :open="employersJumpOpen"
      :employers="form.employers"
      :active-index="employersActiveIndex"
      :legacy-emr-system="form.emr_system"
      :candidate-name="displayName"
      @close="closeEmployersJump"
      @select="onEmployerJumpSelect"
    />

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
