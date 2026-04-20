<script setup>
import { computed } from 'vue'
import Direction from './Direction.vue'
import FolderCard from './FolderCard.vue'

const props = defineProps({
  state: Object,
})
const mode = computed(() => props.state?.context?.mode || '')
const localPath = computed(() => props.state?.context?.localFolderPath || '')
const remotePath = computed(() => props.state?.context?.remoteFolderPath || '')
</script>

<template>
  <div class="context-stage w-11/12 h-3/4 grid grid-cols-10 place-items-stretch">
    <FolderCard
      class="col-span-4"
      side="local" :role="mode === 'push' ? 'source' : 'target'" :content="localPath"
    />
    <Direction class="col-span-2" :mode="mode" />
    <FolderCard
      class="col-span-4"
      side="remote" :role="mode === 'push' ? 'target' : 'source'" :content="remotePath"
    />
  </div>
</template>
