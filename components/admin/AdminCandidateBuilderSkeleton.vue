<template>
  <div class="flex h-full min-h-0 flex-col" aria-busy="true" aria-label="Loading candidate form">
    <div class="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6">
      <div class="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div class="mt-1 h-3 w-16 animate-pulse rounded bg-slate-100" />
    </div>
    <div class="flex shrink-0 gap-2 border-b border-slate-100 px-4 py-2 sm:px-6">
      <div v-for="n in 5" :key="n" class="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
    </div>
    <div class="flex-1 space-y-10 overflow-y-auto p-4 sm:p-6">
      <section class="space-y-4">
        <div class="h-6 w-28 animate-pulse rounded bg-slate-200" />
        <div class="h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
        <div class="h-32 animate-pulse rounded-xl border border-dashed border-slate-200 bg-slate-50" />
      </section>

      <section class="space-y-4 border-t border-slate-100 pt-8">
        <div class="h-6 w-24 animate-pulse rounded bg-slate-200" />
        <div class="grid gap-4 md:grid-cols-2">
          <div v-for="n in 4" :key="n" class="space-y-2">
            <div class="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div class="h-11 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </section>
    </div>

    <div class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-6">
      <div class="h-9 animate-pulse rounded-lg bg-slate-100" />
    </div>
  </div>
</template>
