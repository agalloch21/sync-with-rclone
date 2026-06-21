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
</script>

<template>
  <div
    class="folder-selection-stage w-full px-6 py-6 flex flex-col justify-center items-center gap-3 border border-(--border-accent-fade) rounded-xl
  shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
  >
    <div class="flex flex-col">
      <label class="h-lh line-clamp-1 font-bold text-base text-(--text-primary) leading-8">{{ $t(`syncTasks.modals.common.${side}`) }}</label>
      <label class="h-[3lh] line-clamp-3 text-xs text-(--primary) break-all leading-4">
        {{ path }}
      </label>
    </div>

    <InlineButton :text="$t('syncTasks.modals.common.change')" />
  </div>
</template>
