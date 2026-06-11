<script setup lang="ts">
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel', 'onClickConfirm'])
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.confirmDeleteTask.title')" :message="$t('syncTasks.modals.confirmDeleteTask.message')">
    ModalContent

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
