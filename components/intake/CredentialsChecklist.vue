<script setup lang="ts">
import type { CredentialsMap } from '~/types/candidate'
import {
  CREDENTIAL_EXPIRY_PLACEHOLDER,
  displayCredentialExpiry,
  formatCredentialExpiryInput,
  isCompleteCredentialExpiry,
} from '~/utils/credentialExpiry'

const compactLicenseStatus = defineModel<string>('compactLicenseStatus', { default: '' })

const props = defineProps<{
  credentials: CredentialsMap
  licenses: import('~/types/candidate').LicenseEntry[]
  certKeys: readonly string[]
}>()

const emit = defineEmits<{
  'update:credentials': [value: CredentialsMap]
  'update:licenses': [value: import('~/types/candidate').LicenseEntry[]]
}>()

const { fieldClasses, clearParseHighlight, isParseHighlighted } = useIntakePrefillHighlight()

const expiryErrors = ref<Record<string, string>>({})

function isActive(cert: string) {
  return props.credentials[cert]?.active === true
}

function toggle(cert: string) {
  clearParseHighlight(`credential-${cert}`)
  const next = { ...props.credentials }
  if (isActive(cert)) {
    delete next[cert]
    delete expiryErrors.value[cert]
  } else {
    next[cert] = { active: true }
  }
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
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cert in certKeys"
          :key="cert"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-medium transition"
          :class="[
            isActive(cert) ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700',
            isParseHighlighted(`credential-${cert}`) && isActive(cert) ? 'ring-2 ring-brand-600/30 ring-offset-1' : null,
          ]"
          @click="toggle(cert)"
        >
          {{ cert }}
        </button>
      </div>
    </div>

    <div v-if="certKeys.some(isActive)" class="space-y-2">
      <p class="text-sm font-medium text-slate-700">Certification expiration (optional)</p>
      <div
        v-for="cert in certKeys.filter(isActive)"
        :key="`exp-${cert}`"
        class="grid grid-cols-[4rem_1fr] items-start gap-2"
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
