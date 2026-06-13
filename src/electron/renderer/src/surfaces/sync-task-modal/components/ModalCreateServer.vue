<script setup>
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import { createDefaultProtocolForm, createRemotePayload, getDefaultProtocolType, getProtocolDefinition, REMOTE_PROTOCOLS } from '#src/app/sync-task/protocol-registry.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { computed, ref, watch } from 'vue'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['onClickCancel', 'onClickNext'])

const selectedProtocol = ref(getDefaultProtocolType())
const form = ref(createDefaultProtocolForm(selectedProtocol.value))
const fieldErrors = ref({})
const statusMessage = ref('')
const createdRemoteName = ref('')
const isSubmitting = ref(false)

const protocol = computed(() => getProtocolDefinition(selectedProtocol.value))

watch(selectedProtocol, (newProtocol) => {
  form.value = createDefaultProtocolForm(newProtocol)
  fieldErrors.value = {}
  statusMessage.value = ''
  createdRemoteName.value = ''
})

function resetCreatedRemote() {
  createdRemoteName.value = ''
  statusMessage.value = ''
}

async function submitServer({ advance }) {
  if (createdRemoteName.value) {
    if (advance) {
      emit('onClickNext', SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING, {
        selectedRemoteName: createdRemoteName.value,
      })
    }
    return
  }

  statusMessage.value = ''
  fieldErrors.value = {}

  const payload = createRemotePayload(selectedProtocol.value, form.value)
  if (!payload.success) {
    fieldErrors.value = payload.errors
    return
  }

  isSubmitting.value = true
  const result = await window.syncTaskModal?.createRemote?.(payload.value)
  isSubmitting.value = false

  if (!result?.success) {
    fieldErrors.value = result?.errors || {}
    statusMessage.value = result?.error || 'Failed to create or test the remote.'
    return
  }

  createdRemoteName.value = result.remote?.name || payload.value.name
  statusMessage.value = 'Connection tested and remote saved.'

  if (advance) {
    emit('onClickNext', SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING, {
      selectedRemoteName: createdRemoteName.value,
    })
  }
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.createServer.title')" :message="$t('syncTasks.modals.createServer.message')">
    <div class="content-stage h-full flex justify-center items-center">
      <div class="server-form-grid">
        <label class="field-label" for="protocol">Protocol</label>
        <select id="protocol" v-model="selectedProtocol" class="field-control field-select focusable">
          <option v-for="item in REMOTE_PROTOCOLS" :key="item.type" :value="item.type">
            {{ item.label }}
          </option>
        </select>

        <template v-for="field in protocol.fields" :key="field.name">
          <label class="field-label" :for="field.name">{{ field.label }}</label>
          <div class="field-control-dock">
            <input
              :id="field.name"
              v-model="form[field.name]"
              :type="field.type"
              class="field-control focusable"
              @input="resetCreatedRemote"
            >
            <p v-if="fieldErrors[field.name]" class="field-error">
              {{ fieldErrors[field.name] }}
            </p>
          </div>
        </template>

        <div class="col-start-2 flex justify-end">
          <Button :disabled="isSubmitting || Boolean(createdRemoteName)" @click="submitServer({ advance: false })">
            Test Connection
          </Button>
        </div>
        <p v-if="statusMessage" class="col-start-2 text-xs" :class="createdRemoteName ? 'text-green-700' : 'text-red-600'">
          {{ statusMessage }}
        </p>
      </div>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting" @click="submitServer({ advance: true })">
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
.server-form-grid{
  @apply grid grid-cols-[7rem_20rem] items-start gap-x-4 gap-y-4 text-sm text-(--text-primary);
}
.field-label{
  @apply text-right font-medium leading-9;
}
.field-control-dock{
  @apply min-w-0;
}
.field-control{
  @apply w-full border-0 border-b border-(--text-subtle) bg-transparent px-2 py-1.5 text-center text-sm text-(--text-subtle) outline-none;
}
.field-select{
  @apply text-center;
}
.field-error{
  @apply mt-1 text-xs text-red-600;
}
</style>
