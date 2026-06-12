<script setup>
const props = defineProps({
  primary: {
    type: Boolean,
    default: false,
  },
  wide: {
    type: Boolean,
    defalut: false,
  },
})
</script>

<template>
  <button
    class="flex justify-center items-center gap-1.5 px-4 py-2 text-base text-(--text-primary) no-select clickable focusable"
    :class="[props.primary ? 'primary-button' : 'secondary-button', props.wide ? 'button-wide' : 'button-narrow']"
  >
    <slot />
  </button>
</template>

<style scoped>
@reference "tailwindcss";
button{
    @apply py-2 rounded text-sm font-semibold;
}
.button-narrow{
    @apply px-4;
}
.button-wide{
    @apply px-6;
}
.primary-button{
    @apply bg-(--primary) text-(--on-primary) fill-(--on-primary)
    drop-shadow-[0_4px_6px_color-mix(in_srgb,var(--primary)_40%,transparent)];
}

.secondary-button{
    @apply bg-(--surface-soft) text-(--text-primary) fill-(--text-primary);
}
</style>
