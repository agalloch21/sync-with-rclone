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
const task = computed(() => props.context?.task || null)

async function deleteTask() {
  if (isSubmitting.value || !task.value)
    return

  isSubmitting.value = true
  const result = await window.syncTaskModal?.deleteSyncTask?.({
    name: task.value.name,
    rcloneRemote: task.value.rcloneRemote,
    localBasePath: task.value.localBasePath,
  })
  isSubmitting.value = false

  if (result?.success)
    emit('onClickCancel')
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.confirmDeleteTask.title')" :message="$t('syncTasks.modals.confirmDeleteTask.message')">
    <div class="h-full flex items-center justify-center px-8 text-center text-sm text-(--text-primary)">
      <p>
        {{ task ? `Prepare to delete task "${task.name}".` : 'No sync task is selected.' }}
      </p>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting || !task" @click="deleteTask">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
