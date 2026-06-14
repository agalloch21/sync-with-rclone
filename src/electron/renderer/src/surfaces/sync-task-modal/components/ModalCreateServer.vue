<script setup>
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import { createDefaultProtocolForm, createRemotePayload, getDefaultProtocolType } from '#src/app/sync-task/protocol-registry.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { ref, watch } from 'vue'
import ModalShell from './ModalShell.vue'
import ServerForm from './ServerForm.vue'

const emit = defineEmits(['onClickCancel', 'onClickNext'])

const selectedProtocol = ref(getDefaultProtocolType())
const form = ref(createDefaultProtocolForm(selectedProtocol.value))
const fieldErrors = ref({})
const statusMessage = ref('')
const createdRemoteName = ref('')
const isSubmitting = ref(false)

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

function updateField({ name, value }) {
  form.value = {
    ...form.value,
    [name]: value,
  }
  resetCreatedRemote()
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
      <div class="flex flex-col gap-4">
        <ServerForm
          :form="form"
          :protocol-type="selectedProtocol"
          :field-errors="fieldErrors"
          @update:protocol-type="selectedProtocol = $event"
          @update:field="updateField"
        />
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
