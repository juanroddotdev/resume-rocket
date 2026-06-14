<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const open = ref(false)
const devOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const { hasSelectedCandidate, requestParseQa, requestDevFixture } = useAdminHubMenu()
const isDev = import.meta.dev

async function signOut() {
  open.value = false
  devOpen.value = false
  await supabase.auth.signOut()
}

function toggleMenu() {
  open.value = !open.value
  if (!open.value) devOpen.value = false
}

function onParseQa() {
  open.value = false
  devOpen.value = false
  requestParseQa()
}

function onDevFixture(mode: 'partial' | 'complete') {
  open.value = false
  devOpen.value = false
  requestDevFixture(mode)
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !menuRef.value) return
  if (!menuRef.value.contains(event.target as Node)) {
    open.value = false
    devOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="menuRef" class="relative">
    <button
      v-if="user"
      type="button"
      class="flex items-center gap-1 text-sm font-medium text-brand-700"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click.stop="toggleMenu"
    >
      Admin
      <svg
        class="h-4 w-4 transition-transform"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
    <span v-else class="text-sm font-medium text-brand-700">Admin</span>

    <div
      v-if="user && open"
      class="absolute right-0 z-50 mt-2 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      role="menu"
    >
      <button
        type="button"
        class="block w-full px-4 py-2 text-left text-sm disabled:cursor-not-allowed disabled:text-slate-400"
        :class="hasSelectedCandidate ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400'"
        role="menuitem"
        :disabled="!hasSelectedCandidate"
        :aria-disabled="!hasSelectedCandidate"
        @click="onParseQa"
      >
        Parse QA
      </button>
      <template v-if="isDev">
        <div class="my-1 border-t border-slate-100" role="separator" />
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-2 text-left text-sm disabled:cursor-not-allowed disabled:text-slate-400"
          :class="hasSelectedCandidate ? 'text-amber-900 hover:bg-amber-50' : 'text-slate-400'"
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="devOpen"
          :disabled="!hasSelectedCandidate"
          :aria-disabled="!hasSelectedCandidate"
          @click.stop="hasSelectedCandidate && (devOpen = !devOpen)"
        >
          Load parse fixture
          <svg
            class="h-3.5 w-3.5 transition-transform"
            :class="devOpen ? 'rotate-180' : ''"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <div v-if="devOpen" class="border-t border-amber-100 bg-amber-50/50 py-1">
          <button
            type="button"
            class="block w-full px-4 py-2 pl-6 text-left text-sm text-amber-950 hover:bg-amber-100"
            role="menuitem"
            @click="onDevFixture('partial')"
          >
            Partial fixture
          </button>
          <button
            type="button"
            class="block w-full px-4 py-2 pl-6 text-left text-sm text-amber-950 hover:bg-amber-100"
            role="menuitem"
            @click="onDevFixture('complete')"
          >
            Complete fixture
          </button>
        </div>
      </template>
      <div class="my-1 border-t border-slate-100" role="separator" />
      <button
        type="button"
        class="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        role="menuitem"
        @click="signOut"
      >
        Sign out
      </button>
    </div>
  </div>
</template>
