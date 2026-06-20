<script setup lang="ts">
import type { CredentialsMap } from '~/types/candidate'
import {
  CREDENTIAL_EXPIRY_PLACEHOLDER,
  displayCredentialExpiry,
  formatCredentialExpiryInput,
  isCompleteCredentialExpiry,
} from '~/utils/credentialExpiry'
import { orderedActiveCertificationKeys } from '~/utils/certificationOptions'

const compactLicenseStatus = defineModel<string>('compactLicenseStatus', { default: '' })

const props = defineProps<{
  credentials: CredentialsMap
  licenses: import('~/types/candidate').LicenseEntry[]
}>()

const emit = defineEmits<{
  'update:credentials': [value: CredentialsMap]
  'update:licenses': [value: import('~/types/candidate').LicenseEntry[]]
}>()

const { fieldClasses, clearParseHighlight, isParseHighlighted } = useIntakePrefillHighlight()

const expiryErrors = ref<Record<string, string>>({})

function activeCertKeys(credentials: CredentialsMap): string[] {
  return Object.keys(credentials).filter(key => credentials[key]?.active === true)
}

const selectedCertKeys = computed(() =>
  orderedActiveCertificationKeys(activeCertKeys(props.credentials)),
)

const selectedCertSet = computed(() => new Set(selectedCertKeys.value))

function isActive(cert: string) {
  return props.credentials[cert]?.active === true
}

function addCert(cert: string) {
  if (isActive(cert)) return
  clearParseHighlight(`credential-${cert}`)
  emit('update:credentials', {
    ...props.credentials,
    [cert]: { active: true },
  })
}

function removeCert(cert: string) {
  clearParseHighlight(`credential-${cert}`)
  const next = { ...props.credentials }
  delete next[cert]
  delete expiryErrors.value[cert]
  emit('update:credentials', next)
}

function expiryFor(cert: string) {
  return displayCredentialExpiry(props.credentials[cert]?.expiry)
}

function setExpiry(cert: string, value: string) {
  if (!isActive(cert)) return
  clearParseHighlight(`credential-${cert}`)
  const formatted = formatCredentialExpiryInput(value)
  const next = { ...props.credentials }
  next[cert] = { active: true, expiry: formatted || undefined }
  emit('update:credentials', next)

  if (!formatted || isCompleteCredentialExpiry(formatted)) {
    delete expiryErrors.value[cert]
  }
}

function validateExpiry(cert: string) {
  const value = expiryFor(cert)
  if (!value) {
    delete expiryErrors.value[cert]
    return
  }
  if (!isCompleteCredentialExpiry(value)) {
    expiryErrors.value = {
      ...expiryErrors.value,
      [cert]: `Use ${CREDENTIAL_EXPIRY_PLACEHOLDER} (e.g. 06/2026).`,
    }
    return
  }
  delete expiryErrors.value[cert]
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="mb-2 text-sm font-medium text-slate-700">Certifications</p>

      <div v-if="selectedCertKeys.length" class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="cert in selectedCertKeys"
          :key="cert"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition"
          :class="isParseHighlighted(`credential-${cert}`) ? 'ring-2 ring-brand-600/30 ring-offset-1' : null"
          @click="removeCert(cert)"
        >
          {{ cert }}
          <span aria-hidden="true">×</span>
          <span class="sr-only">Remove {{ cert }}</span>
        </button>
      </div>
      <p v-else class="mb-3 text-sm text-slate-600">
        No certifications selected yet — search or browse below.
      </p>

      <CertificationPicker
        input-id="intake-field-certification-picker"
        :selected-keys="selectedCertSet"
        @add="addCert"
      />
    </div>

    <div v-if="selectedCertKeys.length" class="space-y-2">
      <p class="text-sm font-medium text-slate-700">Certification expiration (optional)</p>
      <p class="text-xs text-slate-500">
        Dates appear on your VMS packet next to each certification.
      </p>
      <div
        v-for="cert in selectedCertKeys"
        :key="`exp-${cert}`"
        class="grid grid-cols-[4.5rem_1fr] items-start gap-2"
      >
        <span class="pt-2 text-sm text-slate-600">{{ cert }}</span>
        <div>
          <input
            :value="expiryFor(cert)"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            :placeholder="CREDENTIAL_EXPIRY_PLACEHOLDER"
            :aria-label="`${cert} expiration date`"
            :aria-invalid="Boolean(expiryErrors[cert])"
            maxlength="7"
            class="field"
            @input="setExpiry(cert, ($event.target as HTMLInputElement).value)"
            @blur="validateExpiry(cert)"
          >
          <p v-if="expiryErrors[cert]" class="mt-1 text-xs text-amber-800" role="status">
            {{ expiryErrors[cert] }}
          </p>
        </div>
      </div>
    </div>

    <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p class="text-sm font-medium text-slate-800">RN license</p>
      <label class="block">
        <span class="field-label-compact">Compact license status</span>
        <select
          id="intake-field-compact_license_status"
          v-model="compactLicenseStatus"
          :class="fieldClasses('compact_license_status')"
          @change="clearParseHighlight('compact_license_status')"
        >
          <option value="">Select…</option>
          <option value="Yes">Yes — compact/multistate</option>
          <option value="No">No</option>
          <option value="N/A">N/A</option>
        </select>
      </label>
      <LicenseRepeater
        :model-value="licenses"
        @update:model-value="emit('update:licenses', $event)"
      />
    </div>
  </div>
</template>
