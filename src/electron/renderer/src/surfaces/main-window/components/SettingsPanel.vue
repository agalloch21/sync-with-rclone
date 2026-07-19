<script setup lang="ts">
import Button from '../../shared/Button.vue'
</script>

<template>
  <div class="settings-panel-stage w-full h-full pr-4 pb-4 flex flex-col items-stretch gap-2">
    <header class="header-dock w-full flex items-center border-b border-(--surface-soft)">
      <div class="tab-patterns h-10 text-base text-(--text-primary) font-bold content-center">
        {{ $t('settingsPanel.globalPatterns.title') }}
      </div>
    </header>
    <main class="content-dock flex-1 flex flex-col gap-2">
      <textarea
        class="pattern-area w-full h-full"
        placeholder="Type patterns here..."
        autofocus
      >
        .DS_Store,
Thumbs.db,
*.swp,
*.swo,
~$*,
*.tmp,
.vscode/,
.idea/,
.git/,
node_modules/
      </textarea>
      <p class="description">
        {{ $t('settingsPanel.globalPatterns.description') }}
      </p>
    </main>
    <footer class="footer-dock h-16 flex justify-end items-center">
      <Button
        :primary="true" :wide="true"
      >
        {{ $t('settingsPanel.common.apply') }}
      </Button>
    </footer>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.pattern-area{
  @apply row-start-2 text-xs text-(--text-subtle) resize-none box-border
  rounded-lg border border-gray-300 bg-white px-4 py-2 placeholder-gray-400
  block shadow-sm transition duration-200 ease-in-out

  hover:border-gray-400 focus:border-(--primary) focus:outline-none focus:ring-2 focus:ring-blue-500/20
  disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
}
.description{
  @apply text-xs text-(--text-subtle);
}
</style>
