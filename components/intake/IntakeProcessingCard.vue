<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    mode: 'parse' | 'generate'
    status: 'active' | 'success'
    message: string
    progress: number
    reducedMotion?: boolean
    showKeepTabOpen?: boolean
  }>(),
  {
    reducedMotion: false,
    showKeepTabOpen: false,
  },
)

const title = computed(() =>
  props.status === 'success' ? 'Enrichment Complete!' : 'Rocket Engine Active',
)

const progressWidth = computed(() =>
  `${Math.min(100, Math.max(0, props.progress))}%`,
)

const showUploadDoc = computed(() =>
  props.mode === 'parse' || props.mode === 'generate',
)

const showOutputDoc = computed(() =>
  props.mode === 'generate' && (props.status === 'success' || props.progress >= 40),
)

const uploadVisible = computed(() => {
  if (props.reducedMotion) return props.status === 'active' && props.mode === 'parse'
  if (props.mode === 'parse') return props.status === 'active'
  return props.status === 'active' && props.progress < 40
})

const spinnerVisible = computed(() => !props.reducedMotion && props.status === 'active')

const outputVisible = computed(() => {
  if (props.reducedMotion) return props.status === 'success' && props.mode === 'generate'
  if (props.mode === 'generate') {
    return props.status === 'success' || (props.status === 'active' && props.progress >= 40)
  }
  return props.status === 'success'
})
</script>

<template>
  <div
    class="mx-auto w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-xl"
    role="status"
    aria-live="polite"
    :aria-busy="status === 'active'"
  >
    <div
      v-if="!reducedMotion"
      class="relative mb-6 flex h-40 w-full items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <!-- Upload document -->
      <div
        v-if="showUploadDoc"
        class="absolute flex flex-col items-center transition-all duration-1000"
        :class="uploadVisible ? 'translate-x-0 scale-100 opacity-100' : '-translate-x-24 scale-75 opacity-0'"
      >
        <div class="relative flex h-20 w-16 animate-pulse flex-col gap-1.5 rounded-lg border-2 border-brand-600 bg-brand-50 p-2 shadow-md">
          <div class="h-2 w-full rounded bg-brand-600/30" />
          <div class="h-2 w-5/6 rounded bg-brand-50" />
          <div class="h-2 w-4/5 rounded bg-brand-50" />
          <div class="absolute inset-x-0 top-0 h-1 animate-[bounce_2s_infinite] bg-gradient-to-r from-transparent via-brand-600 to-transparent" />
        </div>
        <span class="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-600">Reading Upload</span>
      </div>

      <!-- Spinner -->
      <div
        v-if="spinnerVisible"
        class="absolute flex items-center justify-center transition-all duration-700"
        :class="status === 'active' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'"
      >
        <div class="flex h-24 w-24 animate-[spin_12s_linear_infinite] items-center justify-center rounded-full border-4 border-dashed border-slate-200">
          <div class="h-16 w-16 animate-[spin_6s_linear_infinite_reverse] rounded-full border-4 border-dotted border-brand-600" />
        </div>
      </div>

      <!-- Output document -->
      <div
        v-if="showOutputDoc || (mode === 'parse' && status === 'success')"
        class="absolute flex flex-col items-center transition-all duration-1000"
        :class="outputVisible ? 'translate-x-0 scale-100 opacity-100' : 'translate-x-24 scale-75 opacity-0'"
      >
        <div class="relative flex h-20 w-16 flex-col gap-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-2 shadow-lg">
          <div class="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-emerald-500 text-[8px] font-bold text-white">W</div>
          <div class="h-2 w-2/3 rounded bg-emerald-400" />
          <div class="h-1.5 w-full rounded bg-slate-200" />
          <div class="h-1.5 w-full rounded bg-slate-200" />
          <div class="h-1.5 w-4/5 rounded bg-slate-200" />
          <div
            v-if="status === 'success'"
            class="absolute -bottom-2 -right-2 animate-bounce rounded-full bg-emerald-500 p-0.5 text-white shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <span class="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
          {{ mode === 'parse' ? 'Fields Extracted' : 'Assembling Resume' }}
        </span>
      </div>
    </div>

    <!-- Reduced motion fallback -->
    <div v-else class="mb-6 flex flex-col items-center gap-2">
      <div
        v-if="status === 'success'"
        class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div
        v-else
        class="h-10 w-10 rounded-full border-2 border-brand-600/30 border-t-brand-600"
        aria-hidden="true"
      />
    </div>

    <div class="w-full space-y-2">
      <h3 class="text-md font-bold text-slate-800">
        {{ title }}
      </h3>

      <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-all duration-500 ease-out"
          :style="{ width: progressWidth }"
        />
      </div>

      <p class="h-4 text-xs font-medium text-slate-500 transition-all duration-300">
        {{ message }}
      </p>

      <p v-if="showKeepTabOpen && status === 'active'" class="text-xs text-slate-500">
        Please keep this tab open
      </p>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .animate-pulse,
  .animate-bounce,
  .animate-\[bounce_2s_infinite\],
  .animate-\[spin_12s_linear_infinite\],
  .animate-\[spin_6s_linear_infinite_reverse\] {
    animation: none !important;
  }
}
</style>
