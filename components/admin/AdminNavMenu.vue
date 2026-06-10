<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

async function signOut() {
  open.value = false
  await supabase.auth.signOut()
}

function toggleMenu() {
  open.value = !open.value
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !menuRef.value) return
  if (!menuRef.value.contains(event.target as Node)) {
    open.value = false
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
      class="absolute right-0 z-50 mt-2 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      role="menu"
    >
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
