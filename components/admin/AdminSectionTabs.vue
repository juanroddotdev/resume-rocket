<script setup lang="ts">
import type { AdminSectionId } from '~/utils/adminCandidateForm'

defineProps<{
  sections: Array<{ id: AdminSectionId; label: string }>
  activeSection: AdminSectionId
  sectionMissingCounts: Record<string, number>
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [sectionId: AdminSectionId]
}>()
</script>

<template>
  <nav
    class="shrink-0 border-b border-slate-100 bg-white"
    role="tablist"
    aria-label="Builder sections"
  >
    <div class="flex items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
    <template v-for="(section, index) in sections" :key="section.id">
      <span
        v-if="index > 0"
        class="hidden shrink-0 text-slate-300 sm:inline"
        aria-hidden="true"
      >
        →
      </span>
      <button
        type="button"
        role="tab"
        class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition"
        :class="activeSection === section.id
          ? 'bg-brand-50 font-medium text-brand-800 ring-1 ring-brand-200'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
        :aria-selected="activeSection === section.id"
        :disabled="disabled"
        @click="emit('select', section.id)"
      >
        <span>{{ section.label }}</span>
        <span
          v-if="sectionMissingCounts[section.id]"
          class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
        >
          {{ sectionMissingCounts[section.id] }}
        </span>
      </button>
    </template>
    </div>
  </nav>
</template>
