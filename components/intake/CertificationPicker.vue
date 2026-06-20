<script setup lang="ts">
import type { CertificationGroupLabel } from '~/utils/certificationOptions'
import {
  buildCertSearchRows,
  certBrowseRowId,
  certCategoryOptionCount,
  certSearchRowId,
  type CertSearchRow,
} from '~/utils/certSearch'
import {
  CERTIFICATION_GROUPS,
  CERTIFICATION_GROUP_LABELS,
} from '~/utils/certificationOptions'

const props = defineProps<{
  selectedKeys: ReadonlySet<string>
  inputId?: string
}>()

const emit = defineEmits<{
  add: [cert: string]
}>()

type MenuItem =
  | { kind: 'search-group', label: string }
  | { kind: 'search-option', row: CertSearchRow, rowIndex: number }
  | { kind: 'browse-back' }
  | { kind: 'browse-heading', label: string }
  | { kind: 'browse-category', label: CertificationGroupLabel, count: number }
  | { kind: 'browse-option', value: string }

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const open = ref(false)
const activeIndex = ref(0)
const browseCategory = ref<CertificationGroupLabel | null>(null)

const inputElementId = computed(() => props.inputId || 'certification-picker')
const isSearchMode = computed(() => query.value.trim().length > 0)
const searchRows = computed(() => buildCertSearchRows(query.value, props.selectedKeys))
const listboxId = computed(() => `${inputElementId.value}-listbox`)

const menuItems = computed((): MenuItem[] => {
  if (isSearchMode.value) {
    const items: MenuItem[] = []
    let lastGroup: string | null = null

    for (const row of searchRows.value) {
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
      ...CERTIFICATION_GROUPS[category]
        .filter(value => !props.selectedKeys.has(value))
        .map(value => ({ kind: 'browse-option' as const, value })),
    ]
  }

  return CERTIFICATION_GROUP_LABELS.map(label => ({
    kind: 'browse-category' as const,
    label,
    count: certCategoryOptionCount(label),
  }))
})

const selectableMenuIndices = computed(() =>
  menuItems.value.flatMap((item, index) => {
    if (
      item.kind === 'search-option'
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
  if (item.kind === 'search-option') return certSearchRowId(item.rowIndex)
  if (
    item.kind === 'browse-back'
    || item.kind === 'browse-category'
    || item.kind === 'browse-option'
  ) {
    return certBrowseRowId(activeIndex.value)
  }
  return undefined
})

watch(menuItems, () => {
  activeIndex.value = selectableMenuIndices.value[0] ?? 0
})

watch(isSearchMode, (searching) => {
  if (searching) browseCategory.value = null
})

function addCert(cert: string) {
  emit('add', cert)
  query.value = ''
  browseCategory.value = null
  open.value = false
  inputRef.value?.blur()
}

function openBrowseCategory(label: CertificationGroupLabel) {
  browseCategory.value = label
  activeIndex.value = 0
}

function backToBrowseCategories() {
  browseCategory.value = null
  activeIndex.value = 0
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  open.value = true
}

function onFocus() {
  open.value = true
}

function onBlur() {
  window.setTimeout(() => {
    if (!rootRef.value?.contains(document.activeElement)) {
      open.value = false
      query.value = ''
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
    case 'search-option':
      addCert(item.row.value)
      break
    case 'browse-back':
      backToBrowseCategories()
      break
    case 'browse-category':
      openBrowseCategory(item.label)
      break
    case 'browse-option':
      addCert(item.value)
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
    query.value = ''
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
    if (item.kind === 'search-group' || item.kind === 'browse-heading') return
    event.preventDefault()
    activateMenuItem(item)
  }
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
    <label class="block" :for="inputElementId">
      <span class="field-label-compact">Add certification</span>
      <input
        :id="inputElementId"
        ref="inputRef"
        :value="query"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendantId"
        placeholder="Search or browse categories…"
        class="field"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      >
    </label>

    <ul
      v-if="open"
      :id="listboxId"
      role="listbox"
      class="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
    >
      <template v-if="isSearchMode">
        <template v-for="(item, index) in menuItems" :key="`search-${index}`">
          <li
            v-if="item.kind === 'search-group'"
            class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
            role="presentation"
          >
            {{ item.label }}
          </li>
          <li
            v-else-if="item.kind === 'search-option'"
            :id="certSearchRowId(item.rowIndex)"
            role="option"
            :aria-selected="activeIndex === index"
            :class="browseRowClass(index)"
            @mousedown.prevent="addCert(item.row.value)"
          >
            {{ item.row.label }}
          </li>
        </template>
        <li
          v-if="!searchRows.length"
          class="px-3 py-2 text-sm text-slate-500"
          role="presentation"
        >
          {{ selectedKeys.size ? 'No matching certifications to add.' : 'No matching certifications.' }}
        </li>
      </template>

      <template v-else>
        <template v-for="(item, index) in menuItems" :key="`browse-${index}`">
          <li
            v-if="item.kind === 'browse-back'"
            :id="certBrowseRowId(index)"
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
            :id="certBrowseRowId(index)"
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
            :id="certBrowseRowId(index)"
            role="option"
            :aria-selected="activeIndex === index"
            :class="browseRowClass(index)"
            @mousedown.prevent="addCert(item.value)"
          >
            {{ item.value }}
          </li>
        </template>
        <li
          v-if="!menuItems.some(item => item.kind === 'browse-category' || item.kind === 'browse-option')"
          class="px-3 py-2 text-sm text-slate-500"
          role="presentation"
        >
          All listed certifications are already selected.
        </li>
      </template>
    </ul>
  </div>
</template>
