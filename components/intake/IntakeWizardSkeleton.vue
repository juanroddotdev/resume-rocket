<template>
  <div class="space-y-6" aria-busy="true" aria-label="Loading intake">
    <div class="flex items-center justify-between gap-3">
      <div class="h-3 w-40 animate-pulse rounded bg-slate-200" />
      <div class="h-3 w-16 animate-pulse rounded bg-slate-100" />
    </div>

    <div class="space-y-3">
      <div class="h-7 w-48 animate-pulse rounded bg-slate-200" />
      <div class="h-4 w-full max-w-sm animate-pulse rounded bg-slate-100" />
    </div>

    <div class="space-y-4">
      <div v-for="n in 4" :key="n" class="space-y-2">
        <div class="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div class="h-11 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>

    <div class="flex gap-2 border-t border-slate-100 pt-4 lg:ml-auto lg:max-w-sm">
      <div class="h-12 flex-1 animate-pulse rounded-lg bg-slate-100" />
      <div class="h-12 flex-1 animate-pulse rounded-lg bg-slate-200" />
    </div>
  </div>
</template>
