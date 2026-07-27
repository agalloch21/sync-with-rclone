<script setup>
import {
  OPERATION_REPORT_LEVEL,
  OPERATION_REPORT_MODE,
} from '#src/app/operations/operation-report-contract.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveMessageBoxIconClass, resolveMessageBoxPresentation } from './MessageBox.presentation.js'

const { t, te } = useI18n()

const state = ref({
  mode: OPERATION_REPORT_MODE.MESSAGE,
  level: OPERATION_REPORT_LEVEL.INFO,
  text: {
    message: '',
  },
})

let unsubscribe = null

const presentation = computed(() => resolveMessageBoxPresentation(state.value, { t, te }))

watchEffect(() => {
  document.title = presentation.value.title
})

const iconClass = computed(() => resolveMessageBoxIconClass(state.value))

const buttons = computed(() => {
  if (state.value.mode === OPERATION_REPORT_MODE.CONFIRM) {
    return [
      { key: 'confirm', label: t('common.confirm'), primary: true, onClick: () => window.messageBox?.onClickConfirm?.() },
      { key: 'cancel', label: t('common.cancel'), primary: false, onClick: () => window.messageBox?.onClickCancel?.() },
    ]
  }
  if (state.value.mode === OPERATION_REPORT_MODE.MESSAGE) {
    return [
      { key: 'ok', label: t('common.ok'), primary: true, onClick: () => window.messageBox?.onClickConfirm?.() },
    ]
  }
  return []
})

onMounted(async () => {
  state.value = await window.messageBox?.getState?.() || state.value
  unsubscribe = window.messageBox?.onState?.((payload) => {
    if (payload)
      state.value = payload
  })
  await document.fonts.ready
  window.messageBox?.ready?.()
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="message-box-stage h-dvh min-h-0 flex flex-col bg-(--surface-muted) text-(--text-primary)">
    <header class="h-10 shrink-0 flex items-center justify-center bg-(--surface-soft) font-semibold">
      {{ presentation.title }}
    </header>
    <main class="min-h-0 flex-1 px-6 py-5 flex gap-4 items-center">
      <div class="shrink-0 pt-0.5">
        <span :class="iconClass" class="block size-8" />
      </div>
      <div class="min-w-0 flex-1 flex flex-col gap-2">
        <p class="text-sm font-semibold leading-5 break-words">
          {{ presentation.message }}
        </p>
        <p v-if="presentation.detail" class="max-h-20 overflow-auto whitespace-pre-wrap break-words text-xs leading-4 text-(--text-subtle)">
          {{ presentation.detail }}
        </p>
      </div>
    </main>
    <footer class="h-16 shrink-0 flex items-center justify-end gap-4 px-5 py-4 bg-(--surface-footer)">
      <Button
        v-for="button in buttons"
        :key="button.key"
        :primary="button.primary"
        :wide="button.primary"
        @click="button.onClick"
      >
        {{ button.label }}
      </Button>
    </footer>
  </div>
</template>
