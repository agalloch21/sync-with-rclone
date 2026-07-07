<script setup>
import Button from '../../shared/Button.vue'
import ModalShell from './ModalShell.vue'
import TaskMappingForm from './TaskMappingForm.vue'

defineProps({
  syncTask: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits(['onClickCancel'])
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.editFolderMapping.title')" :message="$t('syncTasks.modals.editFolderMapping.message')">
    <TaskMappingForm :sync-task="syncTask" />

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
