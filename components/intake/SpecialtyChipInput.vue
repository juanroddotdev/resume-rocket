<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  label?: string
  placeholder?: string
  fieldId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const draft = ref('')

const { fieldClasses, clearParseHighlight, isParseHighlighted } = useIntakePrefillHighlight()

const specialtiesFieldId = computed(() => props.fieldId || 'specialties')

function clearSpecialtiesHighlight() {
  clearParseHighlight(specialtiesFieldId.value)
}

function addChip() {
  const value = draft.value.trim()
  if (!value) return
  clearSpecialtiesHighlight()
  const next = [...props.modelValue]
  if (!next.some(s => s.toLowerCase() === value.toLowerCase())) {
    next.push(value)
    emit('update:modelValue', next)
  }
  draft.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addChip()
    return
  }
  if (e.key === ',' || e.key === ' ') {
    const value = draft.value.trim()
    if (value) {
      e.preventDefault()
      addChip()
    }
  }
}

function removeChip(index: number) {
  clearSpecialtiesHighlight()
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>

<template>
  <div
    :class="isParseHighlighted(specialtiesFieldId) ? 'rounded-lg bg-brand-50/50 p-2 ring-1 ring-brand-600/20' : null"
  >
    <label v-if="label" class="field-label">{{ label }}</label>
    <div class="flex gap-2">
      <input
        :id="fieldId ? `intake-field-${fieldId}` : undefined"
        v-model="draft"
        type="text"
        :placeholder="placeholder || 'Add specialty (Enter, comma, or space)'"
        :class="fieldClasses(specialtiesFieldId, 'min-w-0 flex-1')"
        @keydown="onKeydown"
        @input="clearSpecialtiesHighlight"
      >
      <button type="button" class="rounded-lg border px-3 py-2 text-sm" @click="addChip">
        Add
      </button>
    </div>
    <div v-if="modelValue.length" class="mt-2 flex flex-wrap gap-2">
      <span
        v-for="(chip, index) in modelValue"
        :key="`${chip}-${index}`"
        class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-900"
      >
        {{ chip }}
        <button type="button" class="text-brand-700" aria-label="Remove" @click="removeChip(index)">×</button>
      </span>
    </div>
    <p v-else class="mt-1 text-xs text-slate-500">Add units you have worked in (e.g. ICU, ER, Med-Surg).</p>
  </div>
</template>
