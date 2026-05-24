<script setup lang="ts">
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
  ensureDraft,
  scheduleAutosave,
  applyParseResult,
  finalizeAndDownload,
  restoreLocal,
  persistLocal,
} = useCandidateForm()

const loading = ref(true)
const submitting = ref(false)
const prefillMessage = ref<string | null>(null)
const submitError = ref<string | null>(null)

onMounted(async () => {
  restoreLocal()
  const ok = await validate(token.value)
  loading.value = false
  if (!ok) return
  if (inviteCandidateId.value) {
    candidateId.value = inviteCandidateId.value
  } else {
    await ensureDraft()
    inviteCandidateId.value = candidateId.value
  }
  if (prefilledEmail.value && !form.value.email) {
    form.value.email = prefilledEmail.value
  }
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
  prefillMessage.value =
    fieldsFound > 0
      ? `We pulled ${fieldsFound} field${fieldsFound === 1 ? '' : 's'} from your resume. Review and edit anything that looks off.`
      : null

  currentStep.value = 1
  persistLocal()
}

async function onManual() {
  prefillMessage.value = null
  await ensureDraft()
  currentStep.value = 1
  persistLocal()
}

function canAdvanceStep1() {
  return form.value.first_name && form.value.last_name && form.value.email && form.value.phone
}

async function goSuccess() {
  submitting.value = true
  submitError.value = null
  try {
    await finalizeAndDownload()
  } catch {
    submitError.value = 'Could not prepare your download. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto min-h-[70vh] max-w-md pb-12">
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
        <span v-else-if="saveStatus === 'error'" class="text-red-600">Save failed</span>
      </div>

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
        <input v-model="form.first_name" placeholder="First name" required class="field">
        <input v-model="form.last_name" placeholder="Last name" required class="field">
        <input v-model="form.email" type="email" placeholder="Email" required class="field">
        <input v-model="form.phone" type="tel" placeholder="Phone" required class="field">
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
        <HospitalAutocomplete
          v-model:emr="form.emr_system"
          :employers="form.employers"
          @update:employers="form.employers = $event"
        />
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 1">Back</button>
          <button type="button" class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white" @click="currentStep = 3">
            Next
          </button>
        </div>
      </section>

      <!-- Step 3 -->
      <section v-else-if="currentStep === 3" class="space-y-4">
        <h1 class="text-xl font-bold">Credentials</h1>
        <CredentialsChecklist
          :credentials="form.credentials"
          :license-number="form.license_number"
          :license-state="form.license_state"
          :cert-keys="certKeys"
          @update:credentials="form.credentials = $event"
          @update:license-number="form.license_number = $event"
          @update:license-state="form.license_state = $event"
        />
        <p
          v-if="submitError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {{ submitError }}
        </p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 2">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50"
            :disabled="submitting"
            @click="goSuccess"
          >
            {{ submitting ? 'Preparing…' : 'Download VMS-Ready Resume' }}
          </button>
        </div>
      </section>

      <!-- Success -->
      <section v-else-if="currentStep === 'success'" class="py-12 text-center">
        <div class="text-4xl text-brand-600">✓</div>
        <h1 class="mt-4 text-xl font-bold">Submitted</h1>
        <p class="mt-2 text-slate-600">
          Check your inbox at <strong>{{ form.email }}</strong> for a confirmation link.
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
