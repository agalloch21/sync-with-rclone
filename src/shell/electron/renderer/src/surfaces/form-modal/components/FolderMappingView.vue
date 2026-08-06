<script setup>
import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'
import { useMappingOperations } from '#frontend/composables/useMappingOperations.js'
import Button from '#frontend/surfaces/shared/Button.vue'
import { unwrapResult } from '#src/app/operation-result.js'
import { computed, ref } from 'vue'
import FolderSelection from './FolderSelection.vue'
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

const emit = defineEmits(['onClickCancel', 'onClickConfirm'])
const mappingOperations = useMappingOperations(window.formModal)

const ACTION_MODE = {
  EDIT: 'edit',
  CREATE: 'create',
}
const mode = ref(props.view === FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING ? ACTION_MODE.EDIT : ACTION_MODE.CREATE)
const initialMapping = mode.value === ACTION_MODE.EDIT ? props.context?.selectedMapping : null

const localBasePath = ref(initialMapping?.localBasePath ?? '')
const remoteBasePath = ref(initialMapping?.remoteBasePath ?? '')
const isSelectingFolder = ref(false)
const isSubmitting = ref(false)

const selectedServerName = computed(() => props.context?.selectedServer?.name || props.context?.selectedMapping?.rcloneRemote || '')

async function selectLocalFolder() {
  if (isSelectingFolder.value)
    return

  isSelectingFolder.value = true
  const result = await mappingOperations.selectLocalFolder(localBasePath.value)
  if (result?.success) {
    const selectedPath = unwrapResult(result)
    if (typeof selectedPath === 'string')
      localBasePath.value = selectedPath
  }
  isSelectingFolder.value = false
}

async function selectRemoteFolder() {
  if (isSelectingFolder.value)
    return

  isSelectingFolder.value = true
  const result = await mappingOperations.selectRemoteFolder(selectedServerName.value, remoteBasePath.value)
  if (result?.success) {
    const selectedPath = unwrapResult(result)
    if (typeof selectedPath === 'string')
      remoteBasePath.value = selectedPath
  }
  isSelectingFolder.value = false
}

async function submitMapping() {
  if (isSubmitting.value)
    return

  const expectedMapping = {
    rcloneRemote: selectedServerName.value,
    localBasePath: localBasePath.value,
    remoteBasePath: remoteBasePath.value,
  }

  isSubmitting.value = true
  const result = mode.value === ACTION_MODE.EDIT
    ? await mappingOperations.updateMapping(props.context?.selectedMapping, expectedMapping)
    : await mappingOperations.createMapping(expectedMapping)
  isSubmitting.value = false

  if (result?.success)
    emit('onClickConfirm')
}
</script>

<template>
  <ModalLayout :view="view">
    <div class="content-stage h-full flex justify-center items-center gap-5">
      <div class="folder-selection-dock">
        <FolderSelection side="local" :path="localBasePath" @select="selectLocalFolder" />
      </div>
      <span class="icon-[custom--connection] text-3xl text-(--text-primary)" />
      <div class="folder-selection-dock">
        <FolderSelection side="remote" :path="`${selectedServerName}:${remoteBasePath}`" @select="selectRemoteFolder" />
      </div>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting || isSelectingFolder" @click="submitMapping">
        {{ $t('formModal.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('formModal.common.cancel') }}
      </Button>
    </template>
  </ModalLayout>
</template>

<style scoped>
@reference "tailwindcss";
.folder-selection-dock{
  @apply w-60;
}
</style>
