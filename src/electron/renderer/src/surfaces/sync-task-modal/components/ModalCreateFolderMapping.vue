<script setup>
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { ref } from 'vue'
import FolderCard from '../../sync-session/components/FolderCard.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel', 'onClickConfirm'])

const localBasePath = ref('/Users/xiaobo/NAS/ProjectsSynced')
const remoteBasePath = ref('ProjectsSynced')

function getBaseName(folderPath) {
  return folderPath.split(/[/\\]/).pop()
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.createFolderMapping.title')" :message="$t('syncTasks.modals.createFolderMapping.message')">
    <div class="content-stage h-full flex justify-center items-center">
      <div class="flex flex-col justify-center gap-8">
        <div>
          <FolderCard side="local" :role="getBaseName(localBasePath)" :content="localBasePath" />
          <Button>Choose Folder</Button>
        </div>
      </div>
      <div>
        <div>
          <FolderCard side="local" :role="getBaseName(remoteBasePath)" :content="remoteBasePath" />
          <Button>Choose Folder</Button>
        </div>
      </div>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" @click="$emit('onClickConfirm')">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>
