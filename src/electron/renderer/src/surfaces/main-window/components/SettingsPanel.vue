<script setup lang="ts">
import { unwrapResult } from '#src/app/operation-result.js'
import { formatIgnorePatterns, parseIgnorePatterns, useTaskOperations } from '#src/electron/renderer/src/composables/useTaskOperations.js'
import { onMounted, onUnmounted, ref } from 'vue'
import { useMessageBox } from '../../../composables/useMessageBox.js'
import Button from '../../shared/Button.vue'

const messageBox = useMessageBox(window?.mainWindow)
const taskOperations = useTaskOperations(window?.mainWindow)

const globalPatternsText = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)

let unsubscribeConfigUpdated = null

onMounted(async () => {
  isLoading.value = true
  const result = await window.mainWindow?.getMainWindowData?.()
  applyMainWindowData(result)
  isLoading.value = false

  unsubscribeConfigUpdated = window.mainWindow?.onConfigUpdated?.((result) => {
    applyMainWindowData(result)
  })
})

onUnmounted(() => {
  unsubscribeConfigUpdated?.()
})

function applyMainWindowData(result) {
  if (!result?.success) {
    globalPatternsText.value = ''
    messageBox.showErrorMessage({
      title: 'Load Failed',
      message: 'Could not load global ignore patterns.',
      detail: result?.error?.detail || result?.error?.message || 'Failed to load configuration.',
    })
    return
  }

  const payload = unwrapResult(result)
  globalPatternsText.value = formatIgnorePatterns(payload?.globalIgnorePatterns)
}

async function applyGlobalPatterns() {
  if (isSubmitting.value)
    return

  const ignorePatterns = parseIgnorePatterns(globalPatternsText.value)
  isSubmitting.value = true
  try {
    const result = await taskOperations.updateGlobalIgnorePatterns(ignorePatterns)
    if (result?.success)
      globalPatternsText.value = formatIgnorePatterns(unwrapResult(result))
  }
  finally {
    isSubmitting.value = false
  }
}
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
        v-model="globalPatternsText"
        class="pattern-area w-full h-full"
        placeholder="Type patterns here..."
        :disabled="isLoading || isSubmitting"
        autofocus
      />
      <p class="description">
        {{ $t('settingsPanel.globalPatterns.description') }}
      </p>
    </main>
    <footer class="footer-dock h-16 flex justify-end items-center">
      <Button
        :primary="true" :wide="true" :disabled="isLoading || isSubmitting" @click="applyGlobalPatterns"
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
