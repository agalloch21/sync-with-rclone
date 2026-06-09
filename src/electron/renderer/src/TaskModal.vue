<script setup>
const state = window.taskModal?.getState?.() || { action: '', title: 'Task' }

function closeModal() {
  window.taskModal?.close?.()
}
</script>

<template>
  <div class="task-modal-stage h-dvh min-h-0 flex flex-col bg-(--surface-muted) text-(--text-primary)">
    <header class="h-16 shrink-0 flex items-center justify-center bg-(--surface-soft)">
      <h1 class="text-lg font-semibold">
        {{ state.title }}
      </h1>
    </header>
    <main class="min-h-0 flex-1">
      <section class="h-20 flex items-center px-10 bg-(--primary) text-(--on-primary)">
        <h2 class="text-xl font-semibold">
          {{ state.title }}
        </h2>
      </section>
      <section class="min-h-0 h-[calc(100%-5rem)] bg-(--surface-muted)" />
    </main>
    <footer class="h-24 shrink-0 flex items-center justify-end gap-8 px-10 bg-(--surface-footer)">
      <button
        class="min-w-28 rounded bg-(--primary) px-8 py-3 text-base font-semibold text-(--on-primary)
          drop-shadow-[0_4px_6px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
        type="button"
      >
        Next
      </button>
      <button
        class="min-w-28 rounded bg-(--surface-soft) px-8 py-3 text-base font-semibold text-(--text-subtle)"
        type="button"
        @click="closeModal"
      >
        Cancel
      </button>
    </footer>
  </div>
</template>
