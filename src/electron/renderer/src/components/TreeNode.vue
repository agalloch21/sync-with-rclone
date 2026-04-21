<script setup>
import { formatBytes } from '../utils/format-bytes.js'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selection: {
    type: Object,
    required: true,
  },
})

function setNodeSelection(node, checked) {
  props.selection[node.path] = checked
  if (node.children) {
    for (const child of node.children)
      setNodeSelection(child, checked)
  }
}

function onToggle(event) {
  setNodeSelection(props.node, event.target.checked)
}
</script>

<template>
  <li class="px-6 text-(--text-primary) text-sm">
    <details
      v-if="node.type === 'directory'" closed
      class="open:[&_>_summary_.arrow]:rotate-90"
    >
      <summary class="flex items-center list-none cursor-pointer">
        <div class="row">
          <input
            type="checkbox"
            :checked="selection[node.path]"
            @change="onToggle"
          >
          <div class="information">
            <div class="icon arrow fill-(--text-subtle) transition-transform">
              <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.69999 6L3.69999 12L2.29999 10.6L6.89999 6L2.29999 1.4L3.69999 0L9.69999 6Z" />
              </svg>
            </div>
            <span class="name">{{ node.name }}/</span>
          </div>
        </div>
        <!-- <span class="folder-badges">
          <span v-if="node.changes.modified" class="folder-badge">modified {{ node.changes.modified }}</span>
          <span v-if="node.changes.added" class="folder-badge">added {{ node.changes.added }}</span>
          <span v-if="node.changes.deleted" class="folder-badge">deleted {{ node.changes.deleted }}</span>
        </span> -->
      </summary>

      <ul class="ml-2 border-l-2 border-(--border-accent-fade)">
        <TreeNode
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :selection="selection"
        />
      </ul>
    </details>

    <!-- row node-toggle -->
    <label v-else class="row">
      <input
        type="checkbox"
        :checked="selection[node.path]"
        @change="onToggle"
      >
      <div class="information">
        <div class="icon" :class="`${node.state}`" />
        <span class="">{{ node.name }}</span>
        <div>
          <span class="meta">{{ formatBytes(node.size) }}</span>
          <span class="">{{ node.state }}</span>
        </div>
      </div>

    </label>
  </li>
</template>

<style scoped>
@reference "tailwindcss";
:root{
--icon-w:0.75rem;
--ul-margin-to-align-with-icon: calc(var(--icon-w) * 0.5);
}
.icon{
  @apply w-3 h-auto aspect-square;
background-size: 100% 100%;
  background-repeat: no-repeat;
}

.added{
  background-image: url("data:image/svg+xml;utf8,<svg width='11' height='11' viewBox='0 0 11 11' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M5.66325 2.16622L8.56125 5.05956C8.52925 5.07823 8.48058 5.09689 8.44658 5.13089C7.00792 6.55356 5.56792 7.97556 4.13725 9.40556C3.96151 9.58618 3.74047 9.71626 3.49725 9.78223C2.51592 10.0609 1.53792 10.3536 0.559251 10.6402C0.340585 10.7042 0.169251 10.6469 0.0599179 10.4769C-0.0120821 10.3662 -0.0120821 10.2436 0.0225846 10.1222C0.335918 9.05223 0.649251 7.98223 0.966585 6.91223C0.992206 6.83212 1.03681 6.75939 1.09658 6.70023C2.58858 5.22022 4.08258 3.74356 5.57525 2.26689C5.60858 2.23356 5.63525 2.19689 5.66192 2.16622H5.66325ZM1.67258 7.37423C1.65792 7.41889 1.64592 7.45089 1.63658 7.48356C1.50325 7.93156 1.38792 8.38623 1.23392 8.82689C1.15392 9.05623 1.17592 9.21889 1.37658 9.35489C1.41325 9.38023 1.44525 9.41489 1.47325 9.45089C1.51658 9.50889 1.56525 9.50956 1.62992 9.49089C1.99658 9.38023 2.36458 9.27289 2.73258 9.16423L3.29725 8.99889C3.26658 8.96356 3.24925 8.93623 3.22592 8.91889C3.15468 8.8711 3.09793 8.80468 3.06184 8.72686C3.02575 8.64904 3.01171 8.56281 3.02125 8.47756C3.02658 8.40756 3.01658 8.33756 3.01258 8.26623C3.00125 8.07089 2.98792 7.87556 2.97525 7.67556C2.70658 7.65356 2.45058 7.62689 2.19525 7.61423C2.00858 7.60489 1.83192 7.58556 1.71725 7.41156C1.71058 7.39956 1.69725 7.39356 1.67258 7.37423ZM9.97525 3.43422C9.06192 2.52289 8.15058 1.61156 7.23058 0.692225C7.45192 0.490225 7.63058 0.226891 7.92125 0.0868915C8.27192 -0.0817752 8.70792 -0.00244193 9.01925 0.303558C9.47213 0.747325 9.92037 1.19579 10.3639 1.64889C10.7726 2.06822 10.7659 2.63422 10.3586 3.05356C10.2313 3.18556 10.0993 3.31089 9.97525 3.43356V3.43422ZM9.60192 3.97289L8.97592 4.55956L6.10925 1.69289C6.31925 1.49689 6.53125 1.29756 6.73458 1.10622C7.69192 2.06156 8.64325 3.01289 9.60258 3.97289H9.60192Z' fill='%23FF9D00'/></svg>");
}

input[type="checkbox"]{
  @apply w-4 aspect-square h-auto bg-(--surface-elevated) border border-(--text-primary) rounded
        focus:ring-0 focus:ring-offset-0
        checked:bg-(--primary) checked:border-none
        relative after:content-[''] after:absolute after:-inset-y-2 after:-inset-x-4;
}

.row{
  @apply flex py-1 flex-row items-center gap-4;
}
.information{
@apply flex items-center gap-4;
}
</style>
