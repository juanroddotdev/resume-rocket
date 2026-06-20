<script setup lang="ts">
import {
  buildEmrSearchRows,
  emrSearchRowId,
  type EmrSearchRow,
} from '~/utils/emrSearch'
import { EMR_QUICK_PRESETS, commitEmrValue, resolveStoredEmrLabel } from '~/utils/emrSystem'

const props = defineProps<{
  modelValue: string
  inputId: string
  inputClass?: string | string[] | Record<string, boolean> | null
  parseHighlighted?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

type ListItem =
  | { kind: 'custom', row: EmrSearchRow & { type: 'custom' }, index: number }
  | { kind: 'group', label: string }
  | { kind: 'option', row: EmrSearchRow & { type: 'option' }, index: number }

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const open = ref(false)
const activeIndex = ref(0)
const editing = ref(false)

const displayValue = computed(() => resolveStoredEmrLabel(props.modelValue))

const searchRows = computed(() => buildEmrSearchRows(query.value))

const listItems = computed((): ListItem[] => {
  const items: ListItem[] = []
  let lastGroup: string | null = null

  searchRows.value.forEach((row, index) => {
    if (row.type === 'custom') {
      items.push({ kind: 'custom', row, index })
      return
    }
    if (row.group !== lastGroup) {
      items.push({ kind: 'group', label: row.group })
      lastGroup = row.group
    }
    items.push({ kind: 'option', row, index })
  })

  return items
})

const selectableIndices = computed(() =>
  searchRows.value.map((_, index) => index),
)

const listboxId = computed(() => `${props.inputId}-listbox`)

watch(searchRows, () => {
  activeIndex.value = 0
})

watch(
  () => props.modelValue,
  () => {
    if (!editing.value) {
      query.value = displayValue.value
    }
  },
  { immediate: true },
)

function selectValue(raw: string) {
  const next = commitEmrValue(raw)
  emit('update:modelValue', next)
  query.value = next
  editing.value = false
  open.value = false
}

function selectRow(row: EmrSearchRow) {
  selectValue(row.value)
  inputRef.value?.blur()
}

function onPresetClick(preset: string) {
  selectValue(preset)
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  editing.value = true
  open.value = true
}

function onFocus() {
  editing.value = true
  open.value = true
  query.value = displayValue.value
}

function onBlur() {
  window.setTimeout(() => {
    if (!rootRef.value?.contains(document.activeElement)) {
      open.value = false
      editing.value = false
      query.value = displayValue.value
    }
  }, 0)
}

function moveActive(delta: number) {
  const indices = selectableIndices.value
  if (!indices.length) return
  const currentPos = indices.indexOf(activeIndex.value)
  const nextPos = currentPos === -1
    ? 0
    : (currentPos + delta + indices.length) % indices.length
  activeIndex.value = indices[nextPos]!
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    open.value = true
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    open.value = false
    editing.value = false
    query.value = displayValue.value
    inputRef.value?.blur()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }

  if (event.key === 'Enter') {
    if (!open.value || !searchRows.value.length) return
    event.preventDefault()
    selectRow(searchRows.value[activeIndex.value]!)
  }
}

function rowClass(index: number, row: EmrSearchRow) {
  return [
    'cursor-pointer px-3 py-2 text-sm',
    index === activeIndex.value ? 'bg-brand-50 text-brand-900' : 'text-slate-800',
    row.type === 'custom' ? 'border-b border-slate-100 font-medium text-brand-800' : '',
  ]
}
</script>

<template>
  <div ref="rootRef" class="space-y-2">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="preset in EMR_QUICK_PRESETS"
        :key="preset"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm"
        :class="
          displayValue === preset
            ? 'bg-brand-600 text-white'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        "
        @click="onPresetClick(preset)"
      >
        {{ preset }}
      </button>
    </div>

    <div class="relative">
      <input
        :id="inputId"
        ref="inputRef"
        :value="editing ? query : displayValue"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listboxId"
        :aria-activedescendant="
          open && searchRows.length ? emrSearchRowId(activeIndex) : undefined
        "
        placeholder="Search or type system name…"
        :class="[
          inputClass,
          parseHighlighted ? 'ring-2 ring-brand-600/30 ring-offset-1' : null,
        ]"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      >

      <ul
        v-if="open"
        :id="listboxId"
        role="listbox"
        class="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      >
        <template v-for="(item, itemIndex) in listItems" :key="`${item.kind}-${itemIndex}`">
          <li
            v-if="item.kind === 'custom'"
            :id="emrSearchRowId(item.index)"
            role="option"
            :aria-selected="item.index === activeIndex"
            :class="rowClass(item.index, item.row)"
            @mousedown.prevent="selectRow(item.row)"
          >
            ➕ {{ item.row.label }}
          </li>
          <li
            v-else-if="item.kind === 'group'"
            class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
            role="presentation"
          >
            {{ item.label }}
          </li>
          <li
            v-else
            :id="emrSearchRowId(item.index)"
            role="option"
            :aria-selected="item.index === activeIndex"
            :class="rowClass(item.index, item.row)"
            @mousedown.prevent="selectRow(item.row)"
          >
            {{ item.row.label }}
          </li>
        </template>

        <li
          v-if="!searchRows.length"
          class="px-3 py-2 text-sm text-slate-500"
          role="presentation"
        >
          No matching systems.
        </li>
      </ul>
    </div>
  </div>
</template>
