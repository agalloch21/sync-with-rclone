<script setup lang="ts">
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel', 'onClickNext'])

const protocols = [{
  type: 'ftp',
  properties: {
    name: String,
    address: String,
    port: Number,
    username: String,
    password: String,
  },
}, {
  type: 'sftp',
  properties: {
    name: String,
    address: String,
    port: Number,
    username: String,
    password: String,

  },
}]
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.createServer.title')" :message="$t('syncTasks.modals.createServer.message')">
    <div class="content-stage h-full flex justify-center items-center">
      <div class="flex flex-col justify-center gap-8">
        <div>
          <label>Protocol: </label>
          <select />
        </div>
        <div>
          <label>Name:</label>
          <input type="text">
        </div>
        <div>
          <label>Address:</label>
          <input type="text">
        </div>
      </div>
    </div>

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
