<script setup>
import { ref } from 'vue'
import FolderSelection from './FolderSelection.vue'

const props = defineProps({
  context: {
    type: Object,
    default: () => ({}),
  },
})

const localBasePath = ref(props.context?.selectedSyncTask?.localBasePath || '')
const remoteBasePath = ref(Object.hasOwn(props.context?.selectedSyncTask || {}, 'remoteBasePath') ? props.context?.selectedSyncTask?.remoteBasePath : '')
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
