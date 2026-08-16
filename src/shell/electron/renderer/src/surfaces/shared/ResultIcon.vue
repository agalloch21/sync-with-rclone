<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: '',
  },
})

const results = Object.freeze({
  success: {
    icon: 'icon-[custom--result-success]',
    color: '--success',
  },
  warning: {
    icon: 'icon-[custom--result-warning]',
    color: '--warning',
  },
  error: {
    icon: 'icon-[custom--result-error]',
    color: '--danger',
  },
})

const result = computed(() => results?.[props.type])
</script>

<template>
  <div class="rounded-full flex justify-center items-center" :class="`bg-(${result?.color})`">
    <span
      class="size-2/5 text-white text-2xl"
      :class="result.icon"
    />
  </div>
</template>
