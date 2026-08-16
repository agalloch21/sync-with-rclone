<script setup>
const props = defineProps({
  mode: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="flex flex-col justify-around items-center">
    <div
      class="w-14 aspect-square bg-(--primary) rounded-2xl drop-shadow-[0_2px_6px_color-mix(in_srgb,var(--primary)_50%,transparent)] flex justify-center items-center"
    >
      <span :class="props.mode === 'pull' ? 'icon-[custom--direction-pull]' : 'icon-[custom--direction-push]'" class="text-(--on-primary) size-1/2" />
    </div>
    <div class="text-xs text-(--primary) font-bold overflow-hidden text-clip whitespace-nowrap">
      {{ props.mode?.length > 0 ? $t(`context.${props.mode}`) : '-' }}
    </div>
  </div>
</template>
