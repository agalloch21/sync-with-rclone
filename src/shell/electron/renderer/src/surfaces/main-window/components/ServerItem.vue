<script setup>
import { ref } from 'vue'

defineProps({
  server: {
    type: Object,
  },
  selected: {
    type: Boolean,
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
          class="arrow enlarge-click-area size-(--server-row-arrow-size) fill-(--text-primary) flex justify-center items-center transition-transform"
          @click.stop.prevent="onClickArrow()"
        >
          <svg width="8" height="12" viewBox="0 0 8 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.4 6L1.4 12L-6.11959e-08 10.6L4.6 6L-4.63341e-07 1.4L1.4 -6.11959e-08L7.4 6Z" />
          </svg>
        </div>
        <div class="size-(--server-icon-size) fill-(--primary) flex justify-center items-center">
          <svg width="26" height="22" viewBox="0 0 26 22" xmlns="http://www.w3.org/2000/svg">
            <path d="M24.375 6.28571H1.625C0.727543 6.28571 0 5.58216 0 4.71429V1.57143C0 0.703558 0.727543 0 1.625 0H24.375C25.2725 0 26 0.703558 26 1.57143V4.71429C26 5.58216 25.2725 6.28571 24.375 6.28571ZM21.9375 1.96429C21.2644 1.96429 20.7188 2.49194 20.7188 3.14286C20.7188 3.79377 21.2644 4.32143 21.9375 4.32143C22.6106 4.32143 23.1562 3.79377 23.1562 3.14286C23.1562 2.49194 22.6106 1.96429 21.9375 1.96429ZM18.6875 1.96429C18.0144 1.96429 17.4688 2.49194 17.4688 3.14286C17.4688 3.79377 18.0144 4.32143 18.6875 4.32143C19.3606 4.32143 19.9062 3.79377 19.9062 3.14286C19.9062 2.49194 19.3606 1.96429 18.6875 1.96429ZM24.375 14.1429H1.625C0.727543 14.1429 0 13.4393 0 12.5714V9.42857C0 8.5607 0.727543 7.85714 1.625 7.85714H24.375C25.2725 7.85714 26 8.5607 26 9.42857V12.5714C26 13.4393 25.2725 14.1429 24.375 14.1429ZM21.9375 9.82143C21.2644 9.82143 20.7188 10.3491 20.7188 11C20.7188 11.6509 21.2644 12.1786 21.9375 12.1786C22.6106 12.1786 23.1562 11.6509 23.1562 11C23.1562 10.3491 22.6106 9.82143 21.9375 9.82143ZM18.6875 9.82143C18.0144 9.82143 17.4688 10.3491 17.4688 11C17.4688 11.6509 18.0144 12.1786 18.6875 12.1786C19.3606 12.1786 19.9062 11.6509 19.9062 11C19.9062 10.3491 19.3606 9.82143 18.6875 9.82143ZM24.375 22H1.625C0.727543 22 0 21.2964 0 20.4286V17.2857C0 16.4178 0.727543 15.7143 1.625 15.7143H24.375C25.2725 15.7143 26 16.4178 26 17.2857V20.4286C26 21.2964 25.2725 22 24.375 22ZM21.9375 17.6786C21.2644 17.6786 20.7188 18.2062 20.7188 18.8571C20.7188 19.5081 21.2644 20.0357 21.9375 20.0357C22.6106 20.0357 23.1562 19.5081 23.1562 18.8571C23.1562 18.2062 22.6106 17.6786 21.9375 17.6786ZM18.6875 17.6786C18.0144 17.6786 17.4688 18.2062 17.4688 18.8571C17.4688 19.5081 18.0144 20.0357 18.6875 20.0357C19.3606 20.0357 19.9062 19.5081 19.9062 18.8571C19.9062 18.2062 19.3606 17.6786 18.6875 17.6786Z" />
          </svg>
        </div>
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
      class="tasks-dock pl-(--task-row-pl) has-[*]:border-t border-(--surface-soft) divide-y divide-(--surface-soft)
    flex flex-col"
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
