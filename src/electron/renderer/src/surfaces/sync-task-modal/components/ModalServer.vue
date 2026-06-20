<script setup>
import { createRcloneRemoteFromServer } from '#src/app/app-model.js'
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import {
  createDefaultProtocolForm,
  createProtocolFormFromRemote,
  getDefaultProtocolType,
  validateProtocolForm,
} from '#src/app/sync-task/protocol-registry.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import {
  closeMessageBox,
  showErrorMessage,
  showProgressMessage,
  showWarningMessage,
} from '#src/electron/renderer/src/shared/message-box.js'
import { computed, ref, watch } from 'vue'
import ModalShell from './ModalShell.vue'
import ServerForm from './ServerForm.vue'

const props = defineProps({
  modalName: {
    type: String,
    required: true,
  },
  context: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['onClickCancel', 'onClickNext'])

const isEditing = computed(() => props.modalName === SYNC_TASK_MODALS.EDIT_SERVER)
const activeServer = computed(() => props.context?.server || {})
const initialRemote = computed(() => isEditing.value ? createRcloneRemoteFromServer(activeServer.value) : null)
const selectedProtocol = ref(initialRemote.value?.type || getDefaultProtocolType())
const form = ref(createInitialForm())
const isSubmitting = ref(false)

watch(selectedProtocol, (newProtocol) => {
  const baseForm = isEditing.value
    ? createProtocolFormFromRemote(newProtocol, initialRemote.value)
    : createDefaultProtocolForm(newProtocol)
  form.value = preserveOverlappingFields(baseForm, form.value)
})

function createInitialForm() {
  return isEditing.value
    ? createProtocolFormFromRemote(selectedProtocol.value, initialRemote.value)
    : createDefaultProtocolForm(selectedProtocol.value)
}

function formatErrorDetails(errors = {}) {
  return Object.values(errors)
    .filter(Boolean)
    .join('\n')
}

function preserveOverlappingFields(nextForm, currentForm = {}) {
  return Object.fromEntries(Object.entries(nextForm).map(([fieldName, defaultValue]) => [
    fieldName,
    Object.hasOwn(currentForm, fieldName) ? currentForm[fieldName] : defaultValue,
  ]))
}

function updateField({ name, value }) {
  form.value = {
    ...form.value,
    [name]: value,
  }
}

function createRemoteFromProtocolForm(type, protocolForm) {
  return {
    type,
    ...protocolForm,
  }
}

async function runRemoteRequest(remote) {
  return isEditing.value
    ? window.syncTaskModal?.updateRemote?.(remote)
    : window.syncTaskModal?.createRemote?.(remote)
}

async function submitServer() {
  if (isSubmitting.value)
    return

  const validationErrors = validateProtocolForm(selectedProtocol.value, form.value)
  if (Object.keys(validationErrors).length > 0) {
    await showWarningMessage({
      title: 'Check Server Settings',
      message: 'Some server fields need attention.',
      detail: formatErrorDetails(validationErrors),
    })
    return
  }

  const remote = createRemoteFromProtocolForm(selectedProtocol.value, form.value)
  const remoteName = typeof remote.name === 'string' ? remote.name.trim() : remote.name

  isSubmitting.value = true
  showProgressMessage({
    title: 'Testing Connection',
    message: `Testing ${remoteName}...`,
    detail: isEditing.value
      ? 'The edited server will be saved only after this connection test succeeds.'
      : 'The server will be saved only after this connection test succeeds.',
  })

  let result
  try {
    result = await runRemoteRequest(remote)
  }
  catch (error) {
    result = {
      success: false,
      code: 'ipc.remote_request_failed',
      message: 'Remote request failed.',
      detail: error?.message || 'Unknown IPC error.',
    }
  }
  isSubmitting.value = false

  if (!result?.success) {
    await showErrorMessage({
      title: 'Connection Failed',
      message: result?.message || (isEditing.value ? 'The server settings were not saved.' : 'The server was not saved.'),
      detail: formatErrorDetails(result?.fieldErrors) || result?.detail || (isEditing.value ? 'Failed to test or update the remote.' : 'Failed to create or test the remote.'),
    })
    return
  }

  await closeMessageBox('success')

  if (isEditing.value) {
    emit('onClickCancel')
    return
  }

  emit('onClickNext', SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING, {
    selectedRemoteName: result.remote?.name || remoteName,
  })
}
</script>

<template>
  <ModalShell :title="$t(`syncTasks.modals.${modalName}.title`)" :message="$t(`syncTasks.modals.${modalName}.message`)">
    <div class="content-stage h-full flex justify-center items-center">
      <ServerForm
        :form="form"
        :protocol-type="selectedProtocol"
        :readonly-name="isEditing"
        @update:protocol-type="selectedProtocol = $event"
        @update:field="updateField"
      />
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting" @click="submitServer">
        {{ $t('syncTasks.modals.common.next') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
