<script setup>
import { ref } from 'vue'

defineProps({
  server: {
    type: Object,
  },
  selected: {
    type: Boolean,
  },
  hasTasks: {
    type: Boolean,
    default: false,
  },
})
const isOpened = ref(true)
function onClickArrow() {
  isOpened.value = !isOpened.value
}
</script>

<template>
  <details class="server-item-stage group cursor-default" :open="isOpened">
    <summary class="server-info-dock list-none focusable py-0.5">
      <div
        class="server-info-stage px-(--server-row-px) py-(--server-row-py) flex items-center gap-(--server-row-gap) rounded-lg"
        :class="{ 'server-item-selected': selected }"
      >
        <div
          class="arrow enlarge-click-area size-(--server-row-arrow-size) flex justify-center items-center transition-transform"
          @click.stop.prevent="onClickArrow()"
        >
          <span class="icon-[custom--arrow] text-(--text-primary)" />
        </div>
        <span class="size-(--server-icon-size) icon-[custom--server] text-(--primary)" />
        <div class="flex flex-col">
          <p class="server-name text-base text-(--text-primary) font-semibold">
            {{ server?.name }}
          </p>
          <div class="server-meta flex items-center gap-1 text-(--text-subtle)">
            <p class="server-address text-xs max-w-60 line-clamp-1 break-all">
              {{ server?.address }}
            </p>
            <div class="server-type text-[0.5rem] px-1 rounded-md border-[0.5px] border-(--text-subtle) content-center">
              {{ server?.status === 'missing' ? 'missing' : server?.type }}
            </div>
          </div>
        </div>
      </div>
    </summary>
    <div
      class="tasks-dock pl-(--task-row-pl) border-(--surface-soft) divide-y divide-(--surface-soft) flex flex-col"
      :class="{ 'border-t': hasTasks }"
    >
      <slot />
    </div>
  </details>
</template>

<style scoped>
@reference "tailwindcss";
.server-item-stage{
    --server-row-px: calc(var(--spacing) * 2.5);
    --server-row-py: calc(var(--spacing) * 2.5);
    --server-row-gap: calc(var(--spacing) * 2);
    --server-row-arrow-size: calc(var(--spacing) * 3);
    --server-icon-size: calc(var(--spacing) * 8);

    --task-row-pl: calc(var( --server-row-px) + var(--server-row-arrow-size) + var(--server-row-gap) + var(--server-icon-size) + var(--server-row-gap) - var(--server-row-px))
}
.server-item-selected{
    @apply bg-(--surface-soft);
}
.arrow{
    @apply group-open:rotate-90;
}
.enlarge-click-area{
    @apply relative before:content-[''] before:absolute before:-inset-x-3 before:-inset-y-5 group-open:before:rotate-90;
}
</style>
