<template>
  <div class="flex h-svh flex-col overflow-hidden bg-canvas">
    <header class="shrink-0 border-b border-slate-200/80 bg-transparent">
      <div class="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-brand-700">Resume Rocket</NuxtLink>
        <nav class="flex gap-4 text-sm">
          <AdminNavMenu />
        </nav>
      </div>
    </header>
    <main class="mx-auto min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden px-4 py-4">
      <slot />
    </main>
  </div>
</template>
