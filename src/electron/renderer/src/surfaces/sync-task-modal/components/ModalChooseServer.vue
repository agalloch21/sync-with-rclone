<script setup lang="ts">
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { ref } from 'vue'

import ModalShell from './ModalShell.vue'

const emit = defineEmits(['onClickCancel', 'onClickConfirm', 'onClickNext'])
const selectedPlan = ref('choose-from-existing')
const selectedOption = ref('synology')

const options = [
  { value: 'synology', label: 'synology => http://nas.agalloch21.com:5005' },
  { value: 'synology-ftp', label: 'synology-ftp => nas.agalloch21.com' },
  { value: 'synology-sftp', label: 'synology-sftp => nas.agalloch21.com' },
  { value: 'fake-remote', label: 'fake-remote => /Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/test/fixtures/fake-remote' },
]
function onClickNext() {
  // check connection first

  // if connection is valid, go to next modal
  const nextModalName = selectedPlan.value === 'choose-from-existing' ? SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING : SYNC_TASK_MODALS.CREATE_SERVER
  emit('onClickNext', nextModalName)

  // if not, stay in this modal and show the error message
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.chooseServer.title')" :message="$t('syncTasks.modals.chooseServer.message')">
    <div class="content-stage h-full flex justify-center items-center">
      <div class="flex flex-col justify-center gap-8">
        <!-- Option 1 -->
        <label class="option-item no-select">
          <div class="option-radio-wrapper">
            <input
              v-model="selectedPlan"
              type="radio"
              value="choose-from-existing"
              name="plan"
              class="option-radio-button focusable"
            >
          </div>

          <div class="flex flex-col justify-start gap-2">
            <span class="option-text">Choose from the existing servers</span>
            <select
              id="department"
              v-model="selectedOption"
              class="from-select block w-80 rounded-md border border-gray-300 shadow-sm
              py-2 pl-3 pr-10 text-xs font-medium text-(--text-subtle)
              focus:outline-none focus:ring-(--primary)"
            >
              <option v-for="item in options" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

        </label>

        <!-- Option 2 -->
        <label class="option-item no-select">
          <div class="option-radio-wrapper">
            <input
              v-model="selectedPlan"
              type="radio"
              value="create-new"
              name="plan"
              class="option-radio-button focusable"
            >
          </div>
          <span class="option-text">Connect to a new server</span>
        </label>
      </div>
    </div>
    <template #footer>
      <Button :primary="true" :wide="true" @click="onClickNext">
        {{ $t('syncTasks.modals.common.next') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>

<style scoped>
@reference "tailwindcss";
.option-item{
  @apply flex items-start gap-3 cursor-pointer px-10 py-3 rounded-lg transition text-sm text-(--text-primary) font-medium;
}
.option-radio-wrapper{
  @apply  h-lh flex items-center;
}
.option-radio-button{
  @apply h-4 w-4 cursor-pointer text-(--primary) border-2 border-(--primary) focus:ring-0 focus:ring-offset-0 focus:outline-none;
}
</style>
