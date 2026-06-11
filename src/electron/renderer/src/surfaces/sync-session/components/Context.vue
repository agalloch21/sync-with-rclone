<script setup>
import { computed } from 'vue'
import Direction from './Direction.vue'
import FolderCard from './FolderCard.vue'

const props = defineProps({
  state: Object,
})
const mode = computed(() => props.state?.context?.mode || props.state?.final?.context?.mode || '')
const localPath = computed(() => props.state?.context?.localFolderPath || props.state?.final?.context?.localFolderPath || '')
const remotePath = computed(() => props.state?.context?.remoteFolderPath || props.state?.final?.context?.remoteFolderPath || '')
</script>

<template>
  <div class="context-stage w-11/12 h-3/4 grid grid-cols-10 place-items-stretch">
    <div class="card-dock col-span-4">
      <FolderCard side="local" :role="mode === 'push' ? 'source' : 'target'" :content="localPath" />
    </div>

    <Direction class="col-span-2" :mode="mode" />

    <div class="card-dock col-span-4">
      <FolderCard side="remote" :role="mode === 'push' ? 'target' : 'source'" :content="remotePath" />
    </div>
  </div>
</template>
