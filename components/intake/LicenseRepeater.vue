<script setup lang="ts">
import type { LicenseEntry } from '~/types/candidate'
import {
  CREDENTIAL_EXPIRY_PLACEHOLDER,
  displayCredentialExpiry,
  formatCredentialExpiryInput,
  isCompleteCredentialExpiry,
} from '~/utils/credentialExpiry'

const props = defineProps<{
  modelValue: LicenseEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LicenseEntry[]]
}>()

const { fieldClasses, clearParseHighlight } = useIntakePrefillHighlight()
const expiryErrors = ref<Record<number, string>>({})

function licenseFieldId(index: number, suffix: string) {
  return `license-${index}-${suffix}`
}

function addRow() {
  emit('update:modelValue', [...props.modelValue, {}])
}

function removeRow(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
  const errors = { ...expiryErrors.value }
  delete errors[index]
  expiryErrors.value = errors
}

function patchRow(index: number, partial: Partial<LicenseEntry>) {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...partial } : row))
  emit('update:modelValue', next)
}

function patchLicenseField(index: number, suffix: string, partial: Partial<LicenseEntry>) {
  clearParseHighlight(licenseFieldId(index, suffix))
  patchRow(index, partial)
}

function setExpiry(index: number, value: string) {
  const formatted = formatCredentialExpiryInput(value)
  patchLicenseField(index, 'expiry', { expiry: formatted || undefined })
  if (!formatted || isCompleteCredentialExpiry(formatted)) {
    const errors = { ...expiryErrors.value }
    delete errors[index]
    expiryErrors.value = errors
  }
}

function validateExpiry(index: number) {
  const value = displayCredentialExpiry(props.modelValue[index]?.expiry)
  if (!value) {
    const errors = { ...expiryErrors.value }
    delete errors[index]
    expiryErrors.value = errors
    return
  }
  if (!isCompleteCredentialExpiry(value)) {
    expiryErrors.value = {
      ...expiryErrors.value,
      [index]: `Use ${CREDENTIAL_EXPIRY_PLACEHOLDER} (e.g. 06/2027).`,
    }
    return
  }
  const errors = { ...expiryErrors.value }
  delete errors[index]
  expiryErrors.value = errors
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-slate-700">Active licenses</p>
      <button type="button" class="text-sm text-brand-700" @click="addRow">+ Add license</button>
    </div>

    <p v-if="!modelValue.length" class="text-xs text-slate-500">
      Add your RN license(s) — state, number, and optional expiration.
    </p>
    <button
      v-if="!modelValue.length"
      id="intake-field-licenses"
      type="button"
      class="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-brand-700"
      @click="addRow"
    >
      + Add your first license
    </button>

    <div
      v-for="(row, index) in modelValue"
      :key="index"
      class="space-y-2 rounded-lg border border-slate-200 p-3"
    >
      <div class="flex justify-end">
        <button type="button" class="text-xs text-red-600" @click="removeRow(index)">Remove</button>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label class="block" :for="`intake-field-${licenseFieldId(index, 'state')}`">
          <span class="field-label-compact">State</span>
          <input
            :id="`intake-field-${licenseFieldId(index, 'state')}`"
            :value="row.state || ''"
            maxlength="2"
            placeholder="CA"
            :class="fieldClasses(licenseFieldId(index, 'state'), 'uppercase')"
            @input="patchLicenseField(index, 'state', { state: ($event.target as HTMLInputElement).value.toUpperCase() })"
          >
        </label>
        <label class="block sm:col-span-1" :for="`intake-field-${licenseFieldId(index, 'number')}`">
          <span class="field-label-compact">License #</span>
          <input
            :id="`intake-field-${licenseFieldId(index, 'number')}`"
            :value="row.number || ''"
            :class="fieldClasses(licenseFieldId(index, 'number'))"
            @input="patchLicenseField(index, 'number', { number: ($event.target as HTMLInputElement).value })"
          >
        </label>
        <label class="block" :for="`intake-field-${licenseFieldId(index, 'expiry')}`">
          <span class="field-label-compact">Expiration (optional)</span>
          <input
            :id="`intake-field-${licenseFieldId(index, 'expiry')}`"
            :value="displayCredentialExpiry(row.expiry)"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            :placeholder="CREDENTIAL_EXPIRY_PLACEHOLDER"
            maxlength="7"
            :aria-invalid="Boolean(expiryErrors[index])"
            :class="fieldClasses(licenseFieldId(index, 'expiry'))"
            @input="setExpiry(index, ($event.target as HTMLInputElement).value)"
            @blur="validateExpiry(index)"
          >
          <p v-if="expiryErrors[index]" class="mt-1 text-xs text-amber-800" role="status">
            {{ expiryErrors[index] }}
          </p>
        </label>
      </div>
    </div>
  </div>
</template>
