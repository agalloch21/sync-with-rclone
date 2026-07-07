<script setup>
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import ModalShell from './ModalShell.vue'
import TaskMappingForm from './TaskMappingForm.vue'

defineProps({
  context: {
    type: Object,
    default: () => ({}),
  },
})
defineEmits(['onClickCancel', 'onClickConfirm'])
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.createFolderMapping.title')" :message="$t('syncTasks.modals.createFolderMapping.message')">
    <TaskMappingForm :context="context" />

    <template #footer>
      <Button :primary="true" :wide="true" @click="$emit('onClickConfirm')">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
