<script setup>
defineProps({
  title: String,
  message: String,
})
</script>

<template>
  <div class="task-modal-stage h-dvh min-h-0 flex flex-col bg-(--surface-muted)">
    <header class="header-dock h-10 shrink-0 flex items-center justify-center bg-(--surface-soft) text-(--text-primary) font-semibold">
      {{ title }}
    </header>
    <main class="main-dock min-h-0 flex-1 flex flex-col">
      <div class="message-dock h-15 bg-(--primary) content-center px-5 text-(--on-primary) font-semibold">
        {{ message }}
      </div>
      <div class="content-dock min-h-0 flex-1 overflow-y-auto">
        <slot />
      </div>
    </main>
    <footer class="footer-dock h-16 shrink-0 flex items-center justify-end gap-8 px-5 py-4 bg-(--surface-footer)">
      <slot name="footer" />
    </footer>
  </div>
</template>
