<script setup lang="ts">
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { computed, ref } from 'vue'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['onClickCancel'])

const props = defineProps({
  context: {
    type: Object,
    default: () => ({}),
  },
})

const isSubmitting = ref(false)
const serverName = computed(() => props.context?.server?.name || '')

async function deleteServer() {
  if (isSubmitting.value || !serverName.value)
    return

  isSubmitting.value = true
  const result = await window.syncTaskModal?.deleteRemote?.(serverName.value)
  isSubmitting.value = false

  if (result?.success)
    emit('onClickCancel')
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.confirmDeleteServer.title')" :message="$t('syncTasks.modals.confirmDeleteServer.message')">
    <div class="h-full flex items-center justify-center px-8 text-center text-sm text-(--text-primary)">
      <p>
        {{ serverName ? `Prepare to delete server "${serverName}".` : 'No server is selected.' }}
      </p>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting || !serverName" @click="deleteServer">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
