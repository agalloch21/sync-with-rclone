<script setup lang="ts">
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel'])
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.editFolderMapping.title')" :message="$t('syncTasks.modals.editFolderMapping.message')">
    ModalContent

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
