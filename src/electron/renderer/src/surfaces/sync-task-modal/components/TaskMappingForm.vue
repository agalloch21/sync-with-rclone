<script setup>
import Button from '#src/electron/renderer/src/shared/components/Button.vue'
import { computed, ref } from 'vue'
import FolderCard from '../../sync-session/components/FolderCard.vue'
import FolderSelection from './FolderSelection.vue'

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
  <div class="content-stage h-full flex justify-center items-center gap-5">
    <div class="folder-selection-dock">
      <FolderSelection side="local" :path="localBasePath" />
    </div>
    <span class="icon-[lucide--link] text-2xl" />
    <div class="folder-selection-dock">
      <FolderSelection side="remote" :path="localBasePath" />
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.folder-selection-dock{
  @apply w-60;
}
</style>
