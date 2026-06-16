<script setup>
import { createProtocolFormFromServer, createRemotePayload, getDefaultProtocolType } from '#src/app/sync-task/protocol-registry.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { ref, watch } from 'vue'
import ModalShell from './ModalShell.vue'
import ServerForm from './ServerForm.vue'

const emit = defineEmits(['onClickCancel'])

const props = defineProps({
  server: {
    type: Object,
    default: () => ({}),
  },
  context: {
    type: Object,
    default: () => ({}),
  },
})

const activeServer = props.context?.server || props.server
const selectedProtocol = ref(activeServer?.type || getDefaultProtocolType())
const form = ref(createProtocolFormFromServer(selectedProtocol.value, activeServer))
const fieldErrors = ref({})
const isSubmitting = ref(false)

watch(selectedProtocol, (newProtocol) => {
  form.value = createProtocolFormFromServer(newProtocol, {
    ...activeServer,
    name: form.value.name,
  })
  fieldErrors.value = {}
})

function updateField({ name, value }) {
  form.value = {
    ...form.value,
    [name]: value,
  }
}

function validateForm() {
  const payload = createRemotePayload(selectedProtocol.value, form.value)
  fieldErrors.value = payload.success ? {} : payload.errors
  return payload
}

async function submitServer() {
  if (isSubmitting.value)
    return

  const payload = validateForm()
  if (!payload.success)
    return

  isSubmitting.value = true
  const result = await window.syncTaskModal?.updateRemote?.(payload.value)
  isSubmitting.value = false

  if (!result?.success) {
    fieldErrors.value = result?.errors || {}
    return
  }

  emit('onClickCancel')
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.editServer.title')" :message="$t('syncTasks.modals.editServer.message')">
    <div class="content-stage h-full flex justify-center items-center">
      <ServerForm
        :form="form"
        :protocol-type="selectedProtocol"
        :field-errors="fieldErrors"
        :readonly-name="true"
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
