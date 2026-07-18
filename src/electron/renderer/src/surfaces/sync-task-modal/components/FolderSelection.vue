<script setup>
import InlineButton from './InlineButton.vue'

defineProps({
  side: {
    type: String,
    default: 'local',
  },
  path: {
    type: String,
    default: '',
  },
})

defineEmits(['select'])
</script>

<template>
  <div
    class="folder-selection-stage w-full px-6 py-6 flex flex-col justify-center items-center gap-3 border border-(--border-accent-fade) rounded-xl
  shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
  >
    <div class="w-full flex flex-col gap-2">
      <div class="flex justify-between items-end text-(--text-primary)">
        <label class="h-lh line-clamp-1 font-bold text-base">{{ $t(`syncTasks.modals.common.${side}`) }}</label>
        <span class="opacity-10 text-3xl" :class="side === 'local' ? 'icon-[custom--local]' : 'icon-[custom--remote]'" />
      </div>

      <label class="h-[3lh] line-clamp-3 text-xs text-(--text-subtle) break-all leading-4">
        {{ path }}
      </label>
    </div>

    <InlineButton :text="$t('syncTasks.modals.common.changeFolder')" @click="$emit('select')" />
  </div>
</template>
