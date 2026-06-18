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
const syncTask = computed(() => props.context?.syncTask || null)

async function deleteTask() {
  if (isSubmitting.value || !syncTask.value)
    return

  isSubmitting.value = true
  const result = await window.syncTaskModal?.deleteSyncTask?.({
    displayName: syncTask.value.displayName,
    rcloneRemote: syncTask.value.rcloneRemote,
    localBasePath: syncTask.value.localBasePath,
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
        {{ syncTask ? `Prepare to delete task "${syncTask.displayName || syncTask.localBasePath}".` : 'No sync task is selected.' }}
      </p>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting || !syncTask" @click="deleteTask">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
