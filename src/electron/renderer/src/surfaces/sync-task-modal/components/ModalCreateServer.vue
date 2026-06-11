<script setup lang="ts">
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel', 'onClickNext'])
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.createServer.title')" :message="$t('syncTasks.modals.createServer.message')">
    ModalContent

    <template #footer>
      <Button :primary="true" :wide="true" @click="$emit('onClickNext', SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING)">
        {{ $t('syncTasks.modals.common.next') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
