<script setup lang="ts">
import type { CredentialsMap } from '~/types/candidate'

const props = defineProps<{
  credentials: CredentialsMap
  licenseNumber: string
  licenseState: string
  certKeys: readonly string[]
}>()

const emit = defineEmits<{
  'update:credentials': [value: CredentialsMap]
  'update:licenseNumber': [value: string]
  'update:licenseState': [value: string]
}>()

const { fieldClasses, clearParseHighlight, isParseHighlighted } = useIntakePrefillHighlight()

function isActive(cert: string) {
  return props.credentials[cert]?.active === true
}

function toggle(cert: string) {
  clearParseHighlight(`credential-${cert}`)
  const next = { ...props.credentials }
  if (isActive(cert)) {
    delete next[cert]
  } else {
    next[cert] = { active: true }
  }
  emit('update:credentials', next)
}

function expiryFor(cert: string) {
  return props.credentials[cert]?.expiry || ''
}

function setExpiry(cert: string, value: string) {
  if (!isActive(cert)) return
  clearParseHighlight(`credential-${cert}`)
  const next = { ...props.credentials }
  next[cert] = { active: true, expiry: value.trim() || undefined }
  emit('update:credentials', next)
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
        class="grid grid-cols-[4rem_1fr] items-center gap-2"
      >
        <span class="text-sm text-slate-600">{{ cert }}</span>
        <input
          :value="expiryFor(cert)"
          type="text"
          placeholder="YYYY-MM or date"
          class="field"
          @input="setExpiry(cert, ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div>
      <label class="field-label">License number</label>
      <input
        id="intake-field-license_number"
        :value="licenseNumber"
        type="text"
        :class="fieldClasses('license_number')"
        @input="clearParseHighlight('license_number'); emit('update:licenseNumber', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <div>
      <label class="field-label">License state</label>
      <input
        id="intake-field-license_state"
        :value="licenseState"
        type="text"
        maxlength="2"
        placeholder="e.g. CA"
        :class="fieldClasses('license_state', 'uppercase')"
        @input="clearParseHighlight('license_state'); emit('update:licenseState', ($event.target as HTMLInputElement).value)"
      >
    </div>
  </div>
</template>
