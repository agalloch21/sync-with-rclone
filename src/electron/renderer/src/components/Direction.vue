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
      <svg
        v-if="props.mode.length > 0" :class="{ '-scale-x-100': props.mode === 'pull' }"
        width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <path class="fill-(--on-primary)" d="M14.4317 7.27652V0L26 11.25L14.4317 22.5V15.0638C0.972971 14.7567 1.55024 23.9639 4.97639 30C-3.48029 21.1109 -1.68443 6.86807 14.4317 7.27652Z" />
      </svg>
    </div>
    <div class="text-xs text-(--primary) font-bold overflow-hidden text-clip whitespace-nowrap">
      {{ props.mode?.length > 0 ? $t(`context.${props.mode}`) : '-' }}
    </div>
  </div>
</template>
