<script setup>
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import ModalShell from './ModalShell.vue'
import TaskMappingForm from './TaskMappingForm.vue'

defineEmits(['onClickCancel'])

defineProps({
  task: {
    type: Object,
    default: () => ({}),
  },
})
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.editFolderMapping.title')" :message="$t('syncTasks.modals.editFolderMapping.message')">
    <TaskMappingForm :task="task" />

    <template #footer>
      <Button :primary="true" :wide="true">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
