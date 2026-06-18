<script setup>
import { computed, ref } from 'vue'
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import FolderCard from '../../sync-session/components/FolderCard.vue'

const props = defineProps({
  wizardState: {
    type: Object,
    default: () => ({}),
  },
  syncTask: {
    type: Object,
    default: () => ({}),
  },
})

const localBasePath = ref(props.syncTask.localBasePath || '/Users/xiaobo/NAS/ProjectsSynced')
const remoteBasePath = ref(props.syncTask.remoteBasePath || 'ProjectsSynced')
const remoteName = computed(() => props.syncTask.rcloneRemote || props.wizardState.selectedRemoteName || '')

function getBaseName(folderPath) {
  return folderPath.split(/[/\\]/).pop()
}
</script>

<template>
  <div class="content-stage h-full flex justify-center items-center">
    <div class="flex flex-col justify-center gap-8">
      <p v-if="remoteName" class="text-sm text-(--text-primary) font-semibold">
        Remote: {{ remoteName }}
      </p>
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
</template>
