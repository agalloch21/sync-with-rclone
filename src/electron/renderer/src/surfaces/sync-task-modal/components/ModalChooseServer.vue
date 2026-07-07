<script setup>
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import { unwrapResult } from '#src/app/operation-result.js'
import { useMessageBox } from '#src/electron/renderer/src/composables/useMessageBox.js'
import { useServerOperations } from '#src/electron/renderer/src/composables/useServerOperations.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import { computed, onMounted, ref } from 'vue'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['onClickCancel', 'onClickConfirm', 'onClickNext'])

const messageBox = useMessageBox(window?.syncTaskModal)
const serverOperations = useServerOperations()

const SERVER_PLAN = Object.freeze({
  CREATE_NEW: 'create-new-server',
  CHOOSE_FROM_EXISTING: 'choose-from-existing',
})

const selectedPlan = ref(SERVER_PLAN.CHOOSE_FROM_EXISTING)
const selectedServerName = ref('')
const servers = ref([])
const availableServers = ref([])
const canChooseExisting = ref(true)
const isLoading = ref(false)

onMounted(loadServers)

async function loadServers() {
  isLoading.value = true

  const result = await serverOperations.listServers()
  if (!result?.success) {
    await messageBox.showErrorMessage({
      title: 'Load Failed',
      message: 'Could not load servers.',
      detail: result?.detail || result?.message || 'Failed to load servers.',
    })
    isLoading.value = false
    return
  }

  const payload = unwrapResult(result)
  servers.value = payload.servers || []

  availableServers.value = servers.value.filter(server => server.status !== 'missing')
  canChooseExisting.value = availableServers.value.length > 0
  selectedServerName.value = availableServers.value[0]?.name || ''
  if (availableServers.value.length === 0)
    selectedPlan.value = SERVER_PLAN.CREATE_NEW

  isLoading.value = false
}

async function onClickNext() {
  if (selectedPlan.value === SERVER_PLAN.CHOOSE_FROM_EXISTING) {
    if (!selectedServerName.value) {
      await messageBox.showWarningMessage({
        title: 'Server Required',
        message: 'Choose a remote server first.',
      })
      return
    }

    emit('onClickNext', SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING, {
      selectedServer: servers.value.find(server => server.name === selectedServerName.value),
    })
    return
  }

  emit('onClickNext', SYNC_TASK_MODALS.CREATE_SERVER)
}

function getServerLabel(server) {
  return server.address ? `${server.name} - ${server.address}` : server.name
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
              :value="SERVER_PLAN.CHOOSE_FROM_EXISTING"
              name="plan"
              class="option-radio-button focusable"
            >
          </div>

          <div class="flex flex-col justify-start gap-2">
            <span class="option-text">Choose from the existing servers</span>
            <select
              id="department"
              v-model="selectedServerName"
              :disabled="isLoading || !canChooseExisting"
              class="from-select block w-80 rounded-md border border-gray-300 shadow-sm
              py-2 pl-3 pr-10 text-xs font-medium text-(--text-subtle)
              focus:outline-none focus:ring-(--primary)"
            >
              <option v-if="isLoading" value="">
                Loading servers...
              </option>
              <option v-else-if="!canChooseExisting" value="">
                No configured servers
              </option>
              <template v-else>
                <option v-for="item in availableServers" :key="item.name" :value="item.name">
                  {{ getServerLabel(item) }}
                </option>
              </template>
            </select>
          </div>

        </label>

        <!-- Option 2 -->
        <label class="option-item no-select">
          <div class="option-radio-wrapper">
            <input
              v-model="selectedPlan"
              type="radio"
              :value="SERVER_PLAN.CREATE_NEW"
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
