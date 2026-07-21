<script setup>
import { MESSAGE_BOX_LEVEL, MESSAGE_BOX_MODE } from '#src/app/main-window/message-box-contract.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getOperationProgressMessageKey } from './operation-progress-presentation.js'

const { t } = useI18n()

const state = ref({
  mode: MESSAGE_BOX_MODE.MESSAGE,
  level: MESSAGE_BOX_LEVEL.INFO,
  title: 'Message',
  titleKey: '',
  message: '',
  messageKey: '',
  detail: '',
  progress: null,
})

let unsubscribe = null

const displayedTitle = computed(() => state.value.titleKey ? t(state.value.titleKey) : state.value.title)
const displayedMessage = computed(() => {
  const progressKey = getOperationProgressMessageKey(state.value.progress)
  if (progressKey)
    return t(progressKey)
  if (state.value.messageKey)
    return t(state.value.messageKey)
  return state.value.message
})

const iconClass = computed(() => {
  if (state.value.mode === MESSAGE_BOX_MODE.PROGRESS)
    return 'icon-[lucide--loader-circle] animate-spin text-(--primary)'
  if (state.value.level === MESSAGE_BOX_LEVEL.SUCCESS)
    return 'icon-[lucide--circle-check] text-(--success)'
  if (state.value.level === MESSAGE_BOX_LEVEL.WARNING)
    return 'icon-[lucide--circle-alert] text-(--warning)'
  if (state.value.level === MESSAGE_BOX_LEVEL.ERROR)
    return 'icon-[lucide--circle-x] text-(--danger)'
  return 'icon-[lucide--info] text-(--primary)'
})

const buttons = computed(() => {
  if (state.value.mode === MESSAGE_BOX_MODE.CONFIRM) {
    return [
      { key: 'confirm', label: t('common.confirm'), primary: true, onClick: () => window.messageBox?.onClickConfirm?.() },
      { key: 'cancel', label: t('common.cancel'), primary: false, onClick: () => window.messageBox?.onClickCancel?.() },
    ]
  }
  if (state.value.mode === MESSAGE_BOX_MODE.MESSAGE) {
    return [
      { key: 'ok', label: t('common.ok'), primary: true, onClick: () => window.messageBox?.onClickConfirm?.() },
    ]
  }
  return []
})

onMounted(async () => {
  state.value = await window.messageBox?.getState?.() || state.value
  unsubscribe = window.messageBox?.onState?.((payload) => {
    state.value = {
      ...state.value,
      ...(payload || {}),
    }
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
      {{ displayedTitle }}
    </header>
    <main class="min-h-0 flex-1 px-6 py-5 flex gap-4 items-center">
      <div class="shrink-0 pt-0.5">
        <span :class="iconClass" class="block size-8" />
      </div>
      <div class="min-w-0 flex-1 flex flex-col gap-2">
        <p class="text-sm font-semibold leading-5 break-words">
          {{ displayedMessage }}
        </p>
        <p v-if="state.detail" class="max-h-20 overflow-auto whitespace-pre-wrap break-words text-xs leading-4 text-(--text-subtle)">
          {{ state.detail }}
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
