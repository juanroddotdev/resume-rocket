<script setup lang="ts">
import type { HospitalRow, HospitalSuggestion } from '~/types/hospital'

const props = defineProps<{
  modelValue: string
  inputId: string
  inputClass?: string | string[] | Record<string, boolean> | null
  suggestions?: HospitalSuggestion[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [hospital: HospitalRow | HospitalSuggestion]
}>()

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const listOpen = ref(false)
const activeIndex = ref(0)
const { query, results, searching, searchError, showNoResults } = useHospitalSearch()

const listboxId = computed(() => `${props.inputId}-listbox`)

const optionItems = computed(() => {
  if (results.value.length) return results.value
  return props.suggestions ?? []
})

const showingSuggestions = computed(
  () =>
    !results.value.length
    && Boolean(props.suggestions?.length)
    && !searching.value
    && !showNoResults.value,
)

const showEmptySearchHint = computed(
  () => showNoResults.value && !(props.suggestions?.length),
)

const showMenu = computed(() =>
  listOpen.value && (
    optionItems.value.length > 0
    || searching.value
    || showEmptySearchHint.value
    || Boolean(searchError.value)
  ),
)

watch(
  () => props.modelValue,
  (name) => {
    const next = name || ''
    if (query.value !== next) query.value = next
  },
  { immediate: true },
)

watch(optionItems, (items) => {
  if (activeIndex.value >= items.length) activeIndex.value = Math.max(0, items.length - 1)
})

function formatOptionMeta(hospital: HospitalRow | HospitalSuggestion): string {
  const location = [hospital.city, hospital.state].filter(Boolean).join(', ')
  const bits: string[] = []
  if (hospital.trauma_level) bits.push(`Trauma ${hospital.trauma_level}`)
  if (hospital.beds != null) bits.push(`${hospital.beds} beds`)
  if (hospital.teaching_status) bits.push('Teaching')
  const detail = bits.join(' · ')
  if (location && detail) return `${location} (${detail})`
  return location || detail
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  emit('update:modelValue', value)
  listOpen.value = true
  activeIndex.value = 0
}

function onFocus() {
  listOpen.value = true
}

function closeMenu() {
  listOpen.value = false
}

function selectHospital(hospital: HospitalRow | HospitalSuggestion) {
  emit('select', hospital)
  listOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (listOpen.value) {
      event.preventDefault()
      closeMenu()
    }
    return
  }

  if (!showMenu.value || !optionItems.value.length) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % optionItems.value.length
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + optionItems.value.length) % optionItems.value.length
    return
  }
  if (event.key === 'Enter') {
    const hospital = optionItems.value[activeIndex.value]
    if (!hospital) return
    event.preventDefault()
    selectHospital(hospital)
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  const root = rootRef.value
  if (!root || !(event.target instanceof Node)) return
  if (!root.contains(event.target)) closeMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

defineExpose({
  focus: () => inputRef.value?.focus(),
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <input
      :id="inputId"
      ref="inputRef"
      type="text"
      role="combobox"
      autocomplete="off"
      :value="modelValue"
      placeholder="Hospital name"
      :class="inputClass"
      :aria-expanded="showMenu"
      aria-autocomplete="list"
      :aria-controls="listboxId"
      :aria-activedescendant="showMenu && optionItems[activeIndex]
        ? `${inputId}-option-${activeIndex}`
        : undefined"
      @input="onInput"
      @focus="onFocus"
      @keydown="onKeydown"
    >
    <div
      v-if="showMenu"
      :id="listboxId"
      role="listbox"
      class="absolute z-40 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      <p v-if="searching" class="px-3 py-2 text-xs text-slate-500">
        Searching facilities…
      </p>
      <p v-else-if="searchError" class="px-3 py-2 text-xs text-red-600">
        {{ searchError }}
      </p>
      <template v-else>
        <p
          v-if="showingSuggestions"
          class="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500"
        >
          Suggested matches
        </p>
        <p
          v-else-if="showNoResults && suggestions?.length"
          class="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600"
        >
          No database hit for this search — try a suggestion:
        </p>
        <button
          v-for="(hospital, optionIndex) in optionItems"
          :id="`${inputId}-option-${optionIndex}`"
          :key="hospital.id"
          type="button"
          role="option"
          class="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
          :class="optionIndex === activeIndex ? 'bg-brand-50' : ''"
          :aria-selected="optionIndex === activeIndex"
          @mousedown.prevent="selectHospital(hospital)"
        >
          <span class="font-medium text-slate-900">{{ hospital.name }}</span>
          <span
            v-if="formatOptionMeta(hospital)"
            class="mt-0.5 block text-xs text-slate-500"
          >
            {{ formatOptionMeta(hospital) }}
          </span>
        </button>
        <div
          v-if="showEmptySearchHint"
          class="px-3 py-2 text-xs text-slate-600"
        >
          No facilities found in the database — keep the name as typed, or verify on Google below.
        </div>
      </template>
    </div>
  </div>
</template>
