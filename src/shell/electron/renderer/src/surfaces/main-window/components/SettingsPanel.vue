<script setup lang="ts">
import { formatIgnorePatterns, parseIgnorePatterns, useMappingOperations } from '#frontend/composables/useMappingOperations.js'
import { unwrapResult } from '#src/app/operation-result.js'
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import Button from '../../shared/Button.vue'
import ConfigurationLoadError from './ConfigurationLoadError.vue'

const mappingOperations = useMappingOperations(window?.mainWindow)

const globalPatternsText = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const loadError = shallowRef(null)
let unsubscribeConfigUpdated = null

onMounted(async () => {
  unsubscribeConfigUpdated = window.mainWindow?.onConfigUpdated?.(() => {
    void loadGlobalIgnorePatterns()
  })
  await loadGlobalIgnorePatterns()
})

onUnmounted(() => {
  unsubscribeConfigUpdated?.()
})

async function loadGlobalIgnorePatterns() {
  isLoading.value = true
  const result = await window.mainWindow?.getGlobalIgnorePatterns?.()
  isLoading.value = false

  if (!result?.success) {
    globalPatternsText.value = ''
    loadError.value = result?.error || null
    return
  }

  globalPatternsText.value = formatIgnorePatterns(unwrapResult(result))
  loadError.value = null
}

async function applyGlobalPatterns() {
  if (isSubmitting.value)
    return

  const ignorePatterns = parseIgnorePatterns(globalPatternsText.value)
  isSubmitting.value = true
  try {
    const result = await mappingOperations.updateGlobalIgnorePatterns(ignorePatterns)
    if (result?.success)
      globalPatternsText.value = formatIgnorePatterns(unwrapResult(result))
  }
  finally {
    isSubmitting.value = false
  }
}

function openConfigFolder() {
  return window.mainWindow?.openConfigFolder?.()
}
</script>

<template>
  <div class="settings-panel-stage w-full h-full pr-4 pb-4 flex flex-col items-stretch gap-2 text-(--text-primary)">
    <!-- <header class="header-dock w-full flex items-center border-b border-(--surface-soft)">
      <div class="tab-patterns h-10 text-base text-(--text-primary) font-bold content-center">
        {{ $t('settingsPanel.globalPatterns.title') }}
      </div>
    </header> -->

    <header class="h-10 shrink-0 flex items-center justify-between border-b border-(--surface-soft)">
      <h1 class="text-base font-bold">
        {{ $t('settingsPanel.globalPatterns.title') }}
      </h1>
      <button
        class="clickable focusable rounded px-3 py-1 text-xs text-(--primary)"
        type="button"
        @click="openConfigFolder"
      >
        {{ $t('settingsPanel.openConfigFolder') }}
      </button>
    </header>

    <main class="content-dock flex-1 flex flex-col gap-2">
      <ConfigurationLoadError v-if="loadError" :error="loadError" />
      <template v-else>
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
      </template>
    </main>
    <footer class="footer-dock h-16 flex justify-end items-center">
      <Button
        :primary="true" :wide="true" :disabled="isLoading || isSubmitting || loadError !== null" @click="applyGlobalPatterns"
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
