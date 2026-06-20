<script setup lang="ts">
import type { EmrChartingGroupLabel } from '~/utils/emrChartingSystems'
import {
  buildEmrSearchRows,
  emrBrowseRowId,
  emrCategoryOptionCount,
  emrSearchRowId,
  type EmrSearchRow,
} from '~/utils/emrSearch'
import {
  EMR_CHARTING_GROUPS,
  EMR_CHARTING_GROUP_LABELS,
  commitEmrValue,
  resolveStoredEmrLabel,
} from '~/utils/emrSystem'

const props = defineProps<{
  modelValue: string
  inputId: string
  inputClass?: string | string[] | Record<string, boolean> | null
  parseHighlighted?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

type MenuItem =
  | { kind: 'search-custom', row: EmrSearchRow & { type: 'custom' }, rowIndex: number }
  | { kind: 'search-option', row: EmrSearchRow & { type: 'option' }, rowIndex: number }
  | { kind: 'search-group', label: string }
  | { kind: 'browse-back' }
  | { kind: 'browse-heading', label: string }
  | { kind: 'browse-category', label: EmrChartingGroupLabel, count: number }
  | { kind: 'browse-option', value: string }

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const open = ref(false)
const activeIndex = ref(0)
const editing = ref(false)
const browseCategory = ref<EmrChartingGroupLabel | null>(null)

const displayValue = computed(() => resolveStoredEmrLabel(props.modelValue))
const isSearchMode = computed(() => query.value.trim().length > 0)
const searchRows = computed(() => buildEmrSearchRows(query.value))

const listboxId = computed(() => `${props.inputId}-listbox`)

const menuItems = computed((): MenuItem[] => {
  if (isSearchMode.value) {
    const items: MenuItem[] = []
    let lastGroup: string | null = null

    for (const row of searchRows.value) {
      if (row.type === 'custom') {
        items.push({ kind: 'search-custom', row, rowIndex: searchRows.value.indexOf(row) })
        continue
      }
      if (row.group !== lastGroup) {
        items.push({ kind: 'search-group', label: row.group })
        lastGroup = row.group
      }
      items.push({ kind: 'search-option', row, rowIndex: searchRows.value.indexOf(row) })
    }

    return items
  }

  if (browseCategory.value) {
    const category = browseCategory.value
    return [
      { kind: 'browse-back' },
      { kind: 'browse-heading', label: category },
      ...EMR_CHARTING_GROUPS[category].map(value => ({ kind: 'browse-option' as const, value })),
    ]
  }

  return EMR_CHARTING_GROUP_LABELS.map(label => ({
    kind: 'browse-category' as const,
    label,
    count: emrCategoryOptionCount(label),
  }))
})

const selectableMenuIndices = computed(() =>
  menuItems.value.flatMap((item, index) => {
    if (
      item.kind === 'search-custom'
      || item.kind === 'search-option'
      || item.kind === 'browse-back'
      || item.kind === 'browse-category'
      || item.kind === 'browse-option'
    ) {
      return [index]
    }
    return []
  }),
)

const activeMenuItem = computed(() => menuItems.value[activeIndex.value])

const activeDescendantId = computed(() => {
  if (!open.value) return undefined
  const item = activeMenuItem.value
  if (!item) return undefined
  if (item.kind === 'search-custom' || item.kind === 'search-option') {
    return emrSearchRowId(item.rowIndex)
  }
  if (
    item.kind === 'browse-back'
    || item.kind === 'browse-category'
    || item.kind === 'browse-option'
  ) {
    return emrBrowseRowId(activeIndex.value)
  }
  return undefined
})

watch(menuItems, () => {
  activeIndex.value = selectableMenuIndices.value[0] ?? 0
})

watch(isSearchMode, (searching) => {
  if (searching) {
    browseCategory.value = null
  }
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
  browseCategory.value = null
}

function selectSearchRow(row: EmrSearchRow) {
  selectValue(row.value)
  inputRef.value?.blur()
}

function selectBrowseOption(value: string) {
  selectValue(value)
  inputRef.value?.blur()
}

function openBrowseCategory(label: EmrChartingGroupLabel) {
  browseCategory.value = label
  activeIndex.value = 0
}

function backToBrowseCategories() {
  browseCategory.value = null
  activeIndex.value = 0
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
  if (!query.value.trim()) {
    browseCategory.value = null
  }
}

function onBlur() {
  window.setTimeout(() => {
    if (!rootRef.value?.contains(document.activeElement)) {
      open.value = false
      editing.value = false
      query.value = displayValue.value
      browseCategory.value = null
    }
  }, 0)
}

function moveActive(delta: number) {
  const indices = selectableMenuIndices.value
  if (!indices.length) return
  const currentPos = indices.indexOf(activeIndex.value)
  const nextPos = currentPos === -1
    ? 0
    : (currentPos + delta + indices.length) % indices.length
  activeIndex.value = indices[nextPos]!
}

function activateMenuItem(item: MenuItem) {
  switch (item.kind) {
    case 'search-custom':
    case 'search-option':
      selectSearchRow(item.row)
      break
    case 'browse-back':
      backToBrowseCategories()
      break
    case 'browse-category':
      openBrowseCategory(item.label)
      break
    case 'browse-option':
      selectBrowseOption(item.value)
      break
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    open.value = true
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    if (!isSearchMode.value && browseCategory.value) {
      backToBrowseCategories()
      return
    }
    open.value = false
    editing.value = false
    query.value = displayValue.value
    browseCategory.value = null
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
    const item = activeMenuItem.value
    if (!open.value || !item) return
    if (
      item.kind === 'search-group'
      || item.kind === 'browse-heading'
    ) {
      return
    }
    event.preventDefault()
    activateMenuItem(item)
  }
}

function searchRowClass(rowIndex: number, row: EmrSearchRow) {
  const item = activeMenuItem.value
  const isActive =
    (item?.kind === 'search-custom' || item?.kind === 'search-option')
    && item.rowIndex === rowIndex

  return [
    'cursor-pointer px-3 py-2 text-sm',
    isActive ? 'bg-brand-50 text-brand-900' : 'text-slate-800',
    row.type === 'custom' ? 'border-b border-slate-100 font-medium text-brand-800' : '',
  ]
}

function browseRowClass(index: number) {
  return [
    'cursor-pointer px-3 py-2 text-sm',
    index === activeIndex.value ? 'bg-brand-50 text-brand-900' : 'text-slate-800',
  ]
}
</script>

<template>
  <div ref="rootRef" class="relative">
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
        :aria-activedescendant="activeDescendantId"
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
        <template v-if="isSearchMode">
          <template v-for="(item, index) in menuItems" :key="`search-${index}`">
            <li
              v-if="item.kind === 'search-custom'"
              :id="emrSearchRowId(item.rowIndex)"
              role="option"
              :aria-selected="activeIndex === index"
              :class="searchRowClass(item.rowIndex, item.row)"
              @mousedown.prevent="selectSearchRow(item.row)"
            >
              ➕ {{ item.row.label }}
            </li>
            <li
              v-else-if="item.kind === 'search-group'"
              class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
              role="presentation"
            >
              {{ item.label }}
            </li>
            <li
              v-else-if="item.kind === 'search-option'"
              :id="emrSearchRowId(item.rowIndex)"
              role="option"
              :aria-selected="activeIndex === index"
              :class="searchRowClass(item.rowIndex, item.row)"
              @mousedown.prevent="selectSearchRow(item.row)"
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
        </template>

        <template v-else>
          <template v-for="(item, index) in menuItems" :key="`browse-${index}`">
            <li
              v-if="item.kind === 'browse-back'"
              :id="emrBrowseRowId(index)"
              role="option"
              :aria-selected="activeIndex === index"
              class="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm font-medium text-brand-800"
              :class="index === activeIndex ? 'bg-brand-50' : ''"
              @mousedown.prevent="backToBrowseCategories()"
            >
              ← All categories
            </li>
            <li
              v-else-if="item.kind === 'browse-heading'"
              class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
              role="presentation"
            >
              {{ item.label }}
            </li>
            <li
              v-else-if="item.kind === 'browse-category'"
              :id="emrBrowseRowId(index)"
              role="option"
              :aria-selected="activeIndex === index"
              class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-slate-800"
              :class="index === activeIndex ? 'bg-brand-50 text-brand-900' : ''"
              @mousedown.prevent="openBrowseCategory(item.label)"
            >
              <span>{{ item.label }}</span>
              <span class="shrink-0 text-xs text-slate-500">{{ item.count }}</span>
            </li>
            <li
              v-else-if="item.kind === 'browse-option'"
              :id="emrBrowseRowId(index)"
              role="option"
              :aria-selected="activeIndex === index"
              :class="browseRowClass(index)"
              @mousedown.prevent="selectBrowseOption(item.value)"
            >
              {{ item.value }}
            </li>
          </template>
        </template>
      </ul>
  </div>
</template>
