<script setup>
import { SYNC_TASK_MODALS } from '#src/app/sync-task/modal-contract.js'
import {
  createDefaultProtocolForm,
  createProtocolFormForSwitch,
  createProtocolFormFromRemote,
  getDefaultProtocolType,
  getProtocolDefinition,
  validateProtocolForm,
} from '#src/app/sync-task/protocol-registry.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import {
  closeMessageBox,
  showErrorMessage,
  showProgressMessage,
  showWarningMessage,
} from '#src/electron/renderer/src/shared/message-box.js'
import { computed, onMounted, ref, watch } from 'vue'
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
const initialRemote = computed(() => isEditing.value ? props.context?.remote || null : null)
const unsupportedInitialProtocol = computed(() => {
  const type = initialRemote.value?.type
  return Boolean(isEditing.value && type && !getProtocolDefinition(type))
})
const selectedProtocol = ref(getInitialProtocolType())
const form = ref(createInitialForm())
const isSubmitting = ref(false)

watch(selectedProtocol, (newProtocol) => {
  if (!getProtocolDefinition(newProtocol)) {
    form.value = {}
    return
  }

  form.value = createProtocolFormForSwitch(newProtocol, {
    name: initialRemote.value?.name,
    ...form.value,
  })
})

function createInitialForm() {
  return isEditing.value
    ? createProtocolFormFromRemote(selectedProtocol.value, initialRemote.value)
    : createDefaultProtocolForm(selectedProtocol.value)
}

function getInitialProtocolType() {
  const type = initialRemote.value?.type
  if (!isEditing.value)
    return getDefaultProtocolType()

  return getProtocolDefinition(type) ? type : ''
}

function formatErrorDetails(errors = {}) {
  return Object.values(errors)
    .filter(Boolean)
    .join('\n')
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

onMounted(() => {
  if (!unsupportedInitialProtocol.value)
    return

  window.setTimeout(() => {
    showWarningMessage({
      title: 'Unsupported Protocol',
      message: `This server uses the unsupported rclone protocol "${initialRemote.value.type}".`,
      detail: 'Choose a supported protocol before saving changes.',
    })
  })
})
</script>

<template>
  <ModalShell :title="$t(`syncTasks.modals.${modalName}.title`)" :message="$t(`syncTasks.modals.${modalName}.message`)">
    <div class="content-stage flex justify-center items-center">
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
