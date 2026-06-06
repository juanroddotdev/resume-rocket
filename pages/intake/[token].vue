<script setup lang="ts">
import { computeMissingTemplateFields } from '~/utils/vmsGapReview'

const route = useRoute()
const token = computed(() => String(route.params.token))

const {
  validate,
  inviteValid,
  inviteError,
  candidateId: inviteCandidateId,
  prefilledEmail,
} = useIntakeInvite()
const {
  candidateId,
  form,
  currentStep,
  saveStatus,
  certKeys,
  resetWizard,
  ensureDraft,
  scheduleAutosave,
  applyParseResult,
  finalizeAndDownload,
  downloadDocxOnly,
  restoreLocal,
  persistLocal,
  clearLocal,
} = useCandidateForm()

const loading = ref(true)
const submitting = ref(false)
const prefillMessage = ref<string | null>(null)
const submitError = ref<string | null>(null)
const confirmationEmailSent = ref(false)
const redownloading = ref(false)
const redownloadError = ref<string | null>(null)

const STEP_LABELS: Record<number, string> = {
  0: 'Upload resume',
  1: 'Your details',
  2: 'Employment',
  3: 'Credentials & education',
  4: 'Review',
}

const stepIndicator = computed(() => {
  if (typeof currentStep.value !== 'number') return null
  return `Step ${currentStep.value + 1} of 5 · ${STEP_LABELS[currentStep.value]}`
})

const missingFields = computed(() => computeMissingTemplateFields(form.value))

async function bootstrapInvite(routeToken: string) {
  resetWizard()
  const ok = await validate(routeToken)
  if (!ok) return false

  restoreLocal(routeToken)

  if (inviteCandidateId.value) {
    if (candidateId.value && candidateId.value !== inviteCandidateId.value) {
      clearLocal(routeToken)
      resetWizard()
    }
    candidateId.value = inviteCandidateId.value
  } else if (candidateId.value) {
    clearLocal(routeToken)
    resetWizard()
  }

  if (prefilledEmail.value && !form.value.email) {
    form.value.email = prefilledEmail.value
  }

  return true
}

onMounted(async () => {
  loading.value = true
  await bootstrapInvite(token.value)
  loading.value = false
})

watch(token, async (newToken, oldToken) => {
  if (!newToken || newToken === oldToken) return
  loading.value = true
  await bootstrapInvite(newToken)
  loading.value = false
})

watch(
  () => form.value,
  () => {
    if (currentStep.value !== 0 && currentStep.value !== 'success') {
      scheduleAutosave({})
    }
  },
  { deep: true },
)

async function onParsed(data: Record<string, unknown>) {
  if (!candidateId.value && data.candidateId) {
    candidateId.value = String(data.candidateId)
  }
  if (!candidateId.value) await ensureDraft()

  const fieldsFound = applyParseResult(data as Parameters<typeof applyParseResult>[0])
  const partialNote = data.partial_parse
    ? ' Some fields were filled with basic detection — please review everything.'
    : ''
  prefillMessage.value =
    fieldsFound > 0
      ? data.document_scan
        ? `We scanned ${fieldsFound} field${fieldsFound === 1 ? '' : 's'} from your resume. Review and edit anything that looks off.${partialNote}`
        : `We pulled ${fieldsFound} field${fieldsFound === 1 ? '' : 's'} from your resume. Review and edit anything that looks off.${partialNote}`
      : null

  currentStep.value = 1
  persistLocal(token.value)
}

async function onManual() {
  prefillMessage.value = null
  await ensureDraft()
  currentStep.value = 1
  persistLocal(token.value)
}

function canAdvanceStep1() {
  return form.value.first_name && form.value.last_name && form.value.email && form.value.phone
}

function canAdvanceStep2() {
  return form.value.employers.length > 0
}

function goToStep(step: number) {
  currentStep.value = step
  persistLocal(token.value)
}

async function goSuccess() {
  submitting.value = true
  submitError.value = null
  try {
    const result = await finalizeAndDownload()
    confirmationEmailSent.value = result.confirmationEmailSent
  } catch (e) {
    submitError.value =
      e instanceof Error ? e.message : 'Could not prepare your download. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}

async function onDownloadAgain() {
  redownloading.value = true
  redownloadError.value = null
  try {
    await downloadDocxOnly()
  } catch (e) {
    redownloadError.value =
      e instanceof Error ? e.message : 'Could not download your packet. Check your connection and try again.'
  } finally {
    redownloading.value = false
  }
}
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-md pb-12">
    <div v-if="loading" class="py-20 text-center text-slate-500">Loading…</div>

    <div v-else-if="!inviteValid" class="py-16 text-center">
      <h1 class="text-xl font-semibold text-slate-900">Link unavailable</h1>
      <p class="mt-2 text-slate-600">
        <template v-if="inviteError === 'expired'">This link has expired.</template>
        <template v-else-if="inviteError === 'completed'">This application was already submitted.</template>
        <template v-else-if="inviteError === 'unavailable'">We could not verify this link. Check your connection and try again.</template>
        <template v-else>Ask your recruiter for a new intake link.</template>
      </p>
    </div>

    <template v-else>
      <div v-if="saveStatus !== 'idle'" class="mb-2 text-right text-xs text-slate-500">
        <span v-if="saveStatus === 'saving'">Saving…</span>
        <span v-else-if="saveStatus === 'saved'">Saved</span>
        <span v-else-if="saveStatus === 'error'" class="text-red-600">
          Save failed —
          <button type="button" class="underline" @click="scheduleAutosave({})">Retry</button>
        </span>
      </div>

      <p
        v-if="stepIndicator"
        class="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {{ stepIndicator }}
      </p>

      <!-- Step 0 -->
      <section v-if="currentStep === 0">
        <h1 class="text-xl font-bold text-slate-900">Upload resume</h1>
        <FileDropZone
          class="mt-4"
          :candidate-id="candidateId"
          @parsed="onParsed"
          @manual="onManual"
        />
      </section>

      <!-- Step 1 -->
      <section v-else-if="currentStep === 1" class="space-y-4">
        <h1 class="text-xl font-bold">Your details</h1>
        <p
          v-if="prefillMessage"
          class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
        >
          {{ prefillMessage }}
        </p>
        <button type="button" class="text-sm text-brand-700" @click="currentStep = 0">
          Replace resume
        </button>
        <input v-model="form.first_name" autocomplete="given-name" placeholder="First name" required class="field">
        <input v-model="form.last_name" autocomplete="family-name" placeholder="Last name" required class="field">
        <input v-model="form.email" type="email" autocomplete="email" placeholder="Email" required class="field">
        <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="Phone" required class="field">
        <div class="flex gap-2 pt-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 0">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white disabled:opacity-50"
            :disabled="!canAdvanceStep1()"
            @click="currentStep = 2"
          >
            Next
          </button>
        </div>
      </section>

      <!-- Step 2 -->
      <section v-else-if="currentStep === 2" class="space-y-4">
        <h1 class="text-xl font-bold">Employment</h1>
        <SpecialtyChipInput
          v-model="form.specialties"
          label="Specialties / units"
          placeholder="e.g. ICU, ER, Med-Surg"
        />
        <HospitalAutocomplete
          v-model:emr="form.emr_system"
          :employers="form.employers"
          @update:employers="form.employers = $event"
        />
        <p
          v-if="!canAdvanceStep2()"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Add at least one hospital where you worked before continuing.
        </p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 1">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white disabled:opacity-50"
            :disabled="!canAdvanceStep2()"
            @click="currentStep = 3"
          >
            Next
          </button>
        </div>
      </section>

      <!-- Step 3 -->
      <section v-else-if="currentStep === 3" class="space-y-4">
        <h1 class="text-xl font-bold">Credentials & education</h1>
        <CredentialsChecklist
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
          v-model:compact-license-status="form.compact_license_status"
          v-model:average-patient-ratios="form.average_patient_ratios"
          v-model:specialized-medical-equipment="form.specialized_medical_equipment"
        />
        <EducationRepeater v-model="form.education" />
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 2">Back</button>
          <button type="button" class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white" @click="currentStep = 4">
            Review
          </button>
        </div>
      </section>

      <!-- Step 4 -->
      <section v-else-if="currentStep === 4" class="space-y-4">
        <IntakeReviewPanel
          :missing="missingFields"
          :submitting="submitting"
          @back="currentStep = 3"
          @go-to-step="goToStep"
          @submit="goSuccess"
        />
        <p
          v-if="submitError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {{ submitError }}
          <button type="button" class="ml-1 underline" @click="goSuccess">Retry</button>
        </p>
      </section>

      <!-- Success -->
      <section v-else-if="currentStep === 'success'" class="py-12 text-center">
        <div class="text-4xl text-brand-600">✓</div>
        <h1 class="mt-4 text-xl font-bold">Submitted</h1>
        <p class="mt-2 text-slate-600">
          Your VMS-ready placement packet (DOCX) was downloaded. Your recruiter receives the same file for hospital submission.
        </p>
        <p v-if="confirmationEmailSent" class="mt-2 text-slate-600">
          Check your inbox at <strong>{{ form.email }}</strong> for a confirmation link.
        </p>
        <button
          type="button"
          class="mt-6 rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 disabled:opacity-50"
          :disabled="redownloading"
          @click="onDownloadAgain"
        >
          {{ redownloading ? 'Preparing…' : 'Download again' }}
        </button>
        <p
          v-if="redownloadError"
          class="mt-2 text-sm text-red-600"
        >
          {{ redownloadError }}
          <button type="button" class="ml-1 underline" @click="onDownloadAgain">Retry</button>
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.field {
  @apply w-full rounded-lg border border-slate-300 px-3 py-3 text-base;
}
</style>
