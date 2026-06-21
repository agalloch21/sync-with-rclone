<script setup>
import { ref } from 'vue'
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

const localBasePath = ref(props.syncTask.localBasePath || '')
const remoteBasePath = ref(Object.hasOwn(props.syncTask, 'remoteBasePath') ? props.syncTask.remoteBasePath : '')
</script>

<template>
  <div class="content-stage h-full flex justify-center items-center gap-5">
    <div class="folder-selection-dock">
      <FolderSelection side="local" :path="localBasePath" />
    </div>
    <span class="icon-[custom--connection] text-3xl text-(--text-primary)" />
    <div class="folder-selection-dock">
      <FolderSelection side="remote" :path="remoteBasePath" />
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.folder-selection-dock{
  @apply w-60;
}
</style>
