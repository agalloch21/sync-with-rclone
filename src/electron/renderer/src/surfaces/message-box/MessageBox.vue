<script setup>
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const state = ref({
  mode: 'error',
  title: 'Message',
  message: '',
  detail: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  okLabel: 'OK',
})

let unsubscribe = null

const iconClass = computed(() => {
  if (state.value.mode === 'progress')
    return 'icon-[lucide--loader-circle] animate-spin text-(--primary)'
  if (state.value.mode === 'success')
    return 'icon-[lucide--circle-check] text-(--success)'
  if (state.value.mode === 'confirm' || state.value.mode === 'warning')
    return 'icon-[lucide--circle-alert] text-(--warning)'
  return 'icon-[lucide--circle-x] text-(--danger)'
})

function sendAction(action) {
  window.messageBox?.action?.(action)
}

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
      {{ state.title }}
    </header>
    <main class="min-h-0 flex-1 px-6 py-5 flex gap-4">
      <div class="shrink-0 pt-0.5">
        <span :class="iconClass" class="block size-8" />
      </div>
      <div class="min-w-0 flex-1 flex flex-col gap-2">
        <p class="text-sm font-semibold leading-5 break-words">
          {{ state.message }}
        </p>
        <p v-if="state.detail" class="max-h-20 overflow-auto whitespace-pre-wrap break-words text-xs leading-4 text-(--text-subtle)">
          {{ state.detail }}
        </p>
      </div>
    </main>
    <footer class="h-16 shrink-0 flex items-center justify-end gap-4 px-5 py-4 bg-(--surface-footer)">
      <template v-if="state.mode === 'confirm'">
        <Button :primary="true" :wide="true" @click="sendAction('confirm')">
          {{ state.confirmLabel }}
        </Button>
        <Button @click="sendAction('cancel')">
          {{ state.cancelLabel }}
        </Button>
      </template>
      <template v-else-if="state.mode !== 'progress'">
        <Button :primary="true" :wide="true" @click="sendAction('ok')">
          {{ state.okLabel }}
        </Button>
      </template>
    </footer>
  </div>
</template>
