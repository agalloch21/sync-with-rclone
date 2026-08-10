<script setup>
import FolderPath from '#frontend/surfaces/shared/FolderPath.vue'

const props = defineProps({
  side: String,
  role: String,
  content: String,
})
</script>

<template>
  <div class="bg-(--surface-elevated) rounded-2xl border border-(--border-accent-fade) drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col py-1.5 px-4 relative">
    <div class="shrink-0 text-[0.625rem] leading-4 font-extralight tracking-[0.15rem] text-(--text-subtle) overflow-hidden text-ellipsis whitespace-nowrap ">
      {{ $t(`context.${props.side}`, '') }}
    </div>
    <div class="shrink-0 text-base leading-6 font-bold text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap ">
      {{ $t(`context.${props.role}`, '') }}
    </div>
    <FolderPath
      :path="props.content"
      :max-lines="2"
      reserve-space
      class="text-[0.625rem] leading-4 font-normal text-(--primary) allow-select"
    />
    <div class="absolute top-2 right-2 size-8">
      <span v-if="props.side === 'local'" class="icon-[custom--local] text-(--text-primary) opacity-10 size-full" />
      <span v-else-if="props.side === 'remote'" class="icon-[custom--remote] text-(--text-primary) opacity-10 size-full" />
    </div>
  </div>
</template>
