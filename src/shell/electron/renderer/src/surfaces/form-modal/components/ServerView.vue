<script setup>
import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'
import { useServerOperations } from '#frontend/composables/useServerOperations.js'
import { createDefaultProtocolForm, getDefaultProtocolType, getProtocolDefinition, REMOTE_PROTOCOLS } from '#src/app/contracts/server-protocols.js'
import { unwrapResult } from '#src/app/operation-result.js'
import { ref } from 'vue'
import Button from '../../shared/Button.vue'
import ModalLayout from './ModalLayout.vue'

const props = defineProps({
  view: {
    type: String,
    required: true,
  },
  context: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['onClickCancel', 'onClickConfirm', 'onClickNext'])

const serverOperations = useServerOperations(window.formModal)

const ACTION_MODE = {
  EDIT: 'edit',
  CREATE: 'create',
}
const mode = ref(props.view === FORM_MODAL_VIEW.EDIT_SERVER ? ACTION_MODE.EDIT : ACTION_MODE.CREATE)

const serverName = ref((mode.value === ACTION_MODE.EDIT && props.context?.selectedServer?.name) || '')
const protocolType = ref((mode.value === ACTION_MODE.EDIT && props.context?.selectedServer?.type) || getDefaultProtocolType())
const protocolForm = ref(
  mode.value === ACTION_MODE.EDIT
    ? replaceExistingProperties(createDefaultProtocolForm(protocolType.value), props.context?.selectedServer?.config || {})
    : createDefaultProtocolForm(protocolType.value),
)
const formFields = ref(getProtocolDefinition(protocolType.value)?.fields || {})

const isSubmitting = ref(false)

function replaceExistingProperties(baseObj, newObj) {
  // only replace the property values in baseObj that newObj has and are not null
  return Object.fromEntries(Object.entries(baseObj).map(([fieldName, fieldValue]) =>
    [fieldName, Object.hasOwn(newObj, fieldName) && newObj[fieldName] ? newObj[fieldName] : fieldValue]))
}

function updateProtocolType(type) {
  protocolType.value = type
  protocolForm.value = replaceExistingProperties(protocolForm.value, createDefaultProtocolForm(type))
}

function updateField(fieldName, fieldValue) {
  protocolForm.value = {
    ...protocolForm.value,
    [fieldName]: fieldValue,
  }
}

async function submitServer() {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  let result
  try {
    result = mode.value === ACTION_MODE.EDIT
      ? await serverOperations.updateServer(serverName.value, protocolType.value, protocolForm.value)
      : await serverOperations.createServer(serverName.value, protocolType.value, protocolForm.value)
  }
  finally {
    isSubmitting.value = false
  }

  if (result.success) {
    if (mode.value === ACTION_MODE.EDIT) {
      emit('onClickConfirm')
    }
    else {
      const result = await serverOperations.getServer(serverName.value)
      if (!result.success)
        return

      emit('onClickNext', FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING, {
        selectedServer: unwrapResult(result),
      })
    }
  }
}
</script>

<template>
  <ModalLayout :view="view">
    <div class="content-stage flex justify-center items-center">
      <div class="protocol-form-grid">
        <!-- Name -->
        <label class="field-label" for="server-name">Name</label>
        <input
          id="server-name"
          class="field-control"
          :disabled="mode === ACTION_MODE.EDIT"
          :value="serverName"
          @input="serverName = $event.target.value"
        >
        <!-- Protocol Type Selection -->
        <label class="field-label" for="protocol">Protocol</label>
        <div class="field-control-dock">
          <select
            id="protocol"
            :value="protocolType"
            class="field-control field-select focusable"
            @change="updateProtocolType($event.target.value)"
          >
            <option disabled value="">
              Select the type of the protocol
            </option>
            <option v-for="item in REMOTE_PROTOCOLS" :key="item.type" :value="item.type">
              {{ item.label }}
            </option>
          </select>
        </div>

        <!-- Protocol Properties Form -->
        <template v-for="field in formFields" :key="field.name">
          <label class="field-label" :for="field.name">{{ field.label }}</label>
          <div class="field-control-dock">
            <input
              :id="field.name"
              :value="protocolForm.hasOwnProperty(field.name) ? protocolForm[field.name] : ''"
              :type="field.type"
              class="field-control focusable"
              @input="updateField(field.name, $event.target.value)"
            >
          </div>
        </template>
      </div>
      <!-- <ServerForm
        :protocol-form="protocolForm"
        :protocol-type="protocolType"
        @update:protocol-type="updateProtocolType"
        @update:field="updateField"
      /> -->
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting" @click="submitServer">
        {{ mode === ACTION_MODE.EDIT ? $t('formModal.common.confirm') : $t('formModal.common.next') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('formModal.common.cancel') }}
      </Button>
    </template>
  </ModalLayout>
</template>

<style scoped>
@reference "tailwindcss";
.protocol-form-grid{
  @apply grid grid-cols-[7rem_20rem] items-center gap-x-4 text-xs text-(--text-primary);
}
.field-label{
  @apply text-right font-medium leading-4;
}
.field-control-dock{
  @apply min-w-0;
}
.field-control{
  @apply w-full border-0 border-b border-(--text-subtle) bg-transparent px-2 py-2 text-center text-sm text-(--text-subtle) outline-none;
}
.field-control:disabled{
  @apply opacity-70;
}
.field-select{
  @apply text-center;
}
</style>
