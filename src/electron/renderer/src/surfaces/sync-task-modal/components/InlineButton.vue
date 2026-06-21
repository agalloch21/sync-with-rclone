<script setup>
defineProps({
  text: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <button
    class="inline-button-stage px-3 py-1 text-xs text-(--primary) font-semibold border-2 border-(--primary) rounded-lg inline-flex justify-center
    shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_20%,transparent)]
    cursor-pointer"
  >
    {{ text }}
  </button>
</template>
