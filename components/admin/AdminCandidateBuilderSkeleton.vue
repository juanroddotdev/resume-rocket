<template>
  <div class="flex min-w-0 flex-1 flex-col" aria-busy="true" aria-label="Loading candidate form">
    <div class="flex-1 space-y-10 overflow-y-auto p-6">
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

      <section class="space-y-4 border-t border-slate-100 pt-8">
        <div class="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div class="h-11 animate-pulse rounded-lg bg-slate-100" />
        <div class="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      </section>

      <section class="space-y-4 border-t border-slate-100 pt-8">
        <div class="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="n in 6" :key="n" class="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </section>
    </div>

    <div class="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
      <div class="flex flex-wrap items-center gap-4">
        <div class="h-4 w-16 animate-pulse rounded bg-slate-100" />
        <div class="h-9 min-w-0 flex-1 animate-pulse rounded-lg bg-slate-100" />
        <div class="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  </div>
</template>
