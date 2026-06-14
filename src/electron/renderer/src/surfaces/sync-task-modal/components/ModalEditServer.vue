<script setup>
import { createProtocolFormFromServer, createRemotePayload, getDefaultProtocolType } from '#src/app/sync-task/protocol-registry.js'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { ref, watch } from 'vue'
import ModalShell from './ModalShell.vue'
import ServerForm from './ServerForm.vue'

defineEmits(['onClickCancel'])

const props = defineProps({
  server: {
    type: Object,
    default: () => ({}),
  },
})

const selectedProtocol = ref(props.server.type || getDefaultProtocolType())
const form = ref(createProtocolFormFromServer(selectedProtocol.value, props.server))
const fieldErrors = ref({})

watch(selectedProtocol, (newProtocol) => {
  form.value = createProtocolFormFromServer(newProtocol, {
    ...props.server,
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
      <Button :primary="true" :wide="true" @click="validateForm">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
