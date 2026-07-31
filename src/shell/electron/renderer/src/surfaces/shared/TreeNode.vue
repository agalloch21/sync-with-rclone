<script setup>
import { formatBytes } from '#frontend/utils/format-bytes.js'
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  getSelectionState: {
    type: Function,
    required: true,
  },
  setNodeSelection: {
    type: Function,
    required: true,
  },
  selectionMode: {
    type: String,
    default: 'multiple',
    validator: value => ['multiple', 'single'].includes(value),
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const DOUBLE_CLICK_INTERVAL_MS = 250
const detailsElement = ref(null)
let doubleClickTimer = null

function onToggle(event) {
  props.setNodeSelection(props.node, event.target.checked)
}

function clearDoubleClickWindow() {
  if (doubleClickTimer === null)
    return

  clearTimeout(doubleClickTimer)
  doubleClickTimer = null
}

function toggleDirectory() {
  if (detailsElement.value)
    detailsElement.value.open = !detailsElement.value.open
}

function toggleDirectoryFromUserAction() {
  if (props.selectionMode === 'single')
    props.setNodeSelection(props.node, true)
  toggleDirectory()
}

function onDirectoryClick(event) {
  if (props.selectionMode === 'multiple')
    return

  event.preventDefault()
  if (doubleClickTimer !== null) {
    clearDoubleClickWindow()
    toggleDirectory()
    return
  }

  props.setNodeSelection(props.node, true)
  doubleClickTimer = setTimeout(() => {
    doubleClickTimer = null
  }, DOUBLE_CLICK_INTERVAL_MS)
}

onBeforeUnmount(clearDoubleClickWindow)
</script>

<template>
  <li class="entry-root px-(--tree-indent) text-(--text-primary) text-sm">
    <details
      v-if="node.type === 'directory'" ref="detailsElement" :open="isOpen"
      class="open:[&_>_summary_.arrow]:rotate-90 open:[&_>_summary_.meta]:invisible"
    >
      <summary
        class="flex items-center list-none rounded-lg cursor-pointer focusable"
        @click="onDirectoryClick"
      >
        <div class="row" :class="{ selected: selectionMode === 'single' && getSelectionState(node) === 'checked', hovered: selectionMode === 'multiple' }">
          <input
            v-if="selectionMode === 'multiple'"
            type="checkbox"
            class="focusable"
            :checked="getSelectionState(node) === 'checked'"
            :indeterminate.prop="getSelectionState(node) === 'partial'"
            @click.stop
            @change="onToggle"
          >
          <div class="information" :class="{ 'single-information': selectionMode === 'single' }">
            <div
              class="icon arrow fill-(--text-subtle) transition-transform"
              role="button"
              tabindex="0"
              @click.stop.prevent="toggleDirectoryFromUserAction"
              @keydown.enter.stop.prevent="toggleDirectoryFromUserAction"
              @keydown.space.stop.prevent="toggleDirectoryFromUserAction"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.69999 6L3.69999 12L2.29999 10.6L6.89999 6L2.29999 1.4L3.69999 0L9.69999 6Z" />
              </svg>
            </div>
            <span class="name">{{ node.name }}/</span>
            <div v-if="node?.changes" class="meta">
              <div v-for="(value, key) in node?.changes" v-show="value > 0" :key="key" class="flex gap-1">
                <div class="icon" :class="`${key}`" />
                <span>{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
      </summary>

      <ul
        class="ml-(--edge-offset-to-align-with-checkbox)
        border-l-(length:--left-edge-w) border-(--border-accent-fade)"
      >
        <TreeNode
          v-for="child in node.children || []"
          :key="child.path"
          :node="child"
          :get-selection-state="getSelectionState"
          :set-node-selection="setNodeSelection"
          :selection-mode="selectionMode"
        />
        <li v-if="node.loadState === 'loading'" class="tree-status">
          Loading folders...
        </li>
        <li v-else-if="node.loadState === 'error'" class="tree-status text-(--danger)">
          {{ node.loadError || 'Failed to load folders. Select the folder to retry.' }}
        </li>
        <li v-else-if="node.loadState === 'idle'" class="tree-status">
          Select this folder to load its contents.
        </li>
        <li v-else-if="node.loadState === 'loaded' && node.children?.length === 0" class="tree-status">
          No subfolders.
        </li>
      </ul>
    </details>

    <!-- row node-toggle -->
    <label
      v-else class="row"
      :class="{ selected: selectionMode === 'single' && getSelectionState(node) === 'checked', hovered: selectionMode === 'multiple' }"
      @click="selectionMode === 'single' && setNodeSelection(node, true)"
    >
      <input
        v-if="selectionMode === 'multiple'"
        type="checkbox"
        class="focusable"
        :checked="getSelectionState(node) === 'checked'"
        :indeterminate.prop="false"
        @click.stop
        @change="onToggle"
      >
      <div class="information" :class="{ 'single-information': selectionMode === 'single' }">
        <div class="icon" :class="`${node.state}`" />
        <span class="name">{{ node.name }}</span>
        <div class="meta">
          <span>{{ formatBytes(node.size) }}</span>
        </div>
      </div>

    </label>
  </li>
</template>

<style scoped>
@reference "tailwindcss";
.entry-root{
  --tree-indent: calc(var(--spacing) * 3);
--row-indent: calc(var(--spacing) * 3);

--icon-w: calc(var(--spacing) * 3);
--checkbox-w: calc(var(--spacing) * 4);

--left-edge-w:2px;
--edge-offset-to-align-with-checkbox: calc((var(--checkbox-w) - var(--left-edge-w)) * 0.5  + var(--row-indent));
--arrow-offset-to-align-with-checkbox: calc(var(--tree-indent) + var(--row-indent) - (var(--checkbox-w) - var(--left-edge-w)) * 0.5 + (var(--checkbox-w) - var(--icon-w)) * 0.5);
--information-gap: var(--arrow-offset-to-align-with-checkbox);
}
.icon{
  @apply w-(--icon-w) h-auto aspect-square;
background-size: 100% 100%;
  background-repeat: no-repeat;
}

.added{
  background-image: url("data:image/svg+xml,<svg width='12' height='12' viewBox='0 0 12 12' fill='%233F9D14' xmlns='http://www.w3.org/2000/svg'><path d='M10.4975 7H1.50251C1.20101 7 1 6.6 1 6C1 5.4 1.20101 5 1.50251 5H10.4975C10.799 5 11 5.4 11 6C11 6.6 10.7487 7 10.4975 7Z'/><path d='M6 11C5.4 11 5 10.8 5 10.5V1.5C5 1.2 5.4 1 6 1C6.6 1 7 1.2 7 1.5V10.5C7 10.75 6.6 11 6 11Z'/></svg>");
}
.modified{
  background-image: url("data:image/svg+xml,<svg width='12' height='12' viewBox='0 0 12 12' fill='%23FF9D00' xmlns='http://www.w3.org/2000/svg'><path d='M6.43535 2.93734L9.33335 5.83068C9.30135 5.84934 9.25268 5.86801 9.21868 5.90201C7.78001 7.32468 6.34001 8.74668 4.90935 10.1767C4.7336 10.3573 4.51257 10.4874 4.26935 10.5533C3.28801 10.832 2.31001 11.1247 1.33135 11.4113C1.11268 11.4753 0.941346 11.418 0.832013 11.248C0.760013 11.1373 0.760013 11.0147 0.794679 10.8933C1.10801 9.82334 1.42135 8.75334 1.73868 7.68334C1.7643 7.60324 1.8089 7.53051 1.86868 7.47134C3.36068 5.99134 4.85468 4.51468 6.34735 3.03801C6.38068 3.00468 6.40735 2.96801 6.43401 2.93734H6.43535ZM2.44468 8.14534C2.43001 8.19001 2.41801 8.22201 2.40868 8.25468C2.27535 8.70268 2.16001 9.15734 2.00601 9.59801C1.92601 9.82734 1.94801 9.99001 2.14868 10.126C2.18535 10.1513 2.21735 10.186 2.24535 10.222C2.28868 10.28 2.33735 10.2807 2.40201 10.262C2.76868 10.1513 3.13668 10.044 3.50468 9.93534L4.06935 9.77001C4.03868 9.73468 4.02135 9.70734 3.99801 9.69001C3.92678 9.64222 3.87002 9.5758 3.83393 9.49798C3.79784 9.42016 3.7838 9.33393 3.79335 9.24868C3.79868 9.17868 3.78868 9.10868 3.78468 9.03734C3.77335 8.84201 3.76001 8.64668 3.74735 8.44668C3.47868 8.42468 3.22268 8.39801 2.96735 8.38534C2.78068 8.37601 2.60401 8.35668 2.48935 8.18268C2.48268 8.17068 2.46935 8.16468 2.44468 8.14534ZM10.7473 4.20534C9.83401 3.29401 8.92268 2.38268 8.00268 1.46334C8.22401 1.26134 8.40268 0.99801 8.69335 0.85801C9.04401 0.689343 9.48001 0.768676 9.79135 1.07468C10.2442 1.51844 10.6925 1.96691 11.136 2.42001C11.5447 2.83934 11.538 3.40534 11.1307 3.82468C11.0033 3.95668 10.8713 4.08201 10.7473 4.20468V4.20534ZM10.374 4.74401L9.74801 5.33068L6.88135 2.46401C7.09135 2.26801 7.30335 2.06868 7.50668 1.87734C8.46401 2.83268 9.41535 3.78401 10.3747 4.74401H10.374Z'/></svg>");
}
.deleted{
  background-image: url("data:image/svg+xml,<svg width='12' height='12' viewBox='0 0 12 12' fill='%23EF0606' xmlns='http://www.w3.org/2000/svg'><path d='M10.4975 7H1.50251C1.20101 7 1 6.6 1 6C1 5.4 1.20101 5 1.50251 5H10.4975C10.799 5 11 5.4 11 6C11 6.6 10.7487 7 10.4975 7Z'/></svg>");
}

input[type="checkbox"]{
  @apply w-(--checkbox-w) aspect-square h-auto bg-(--surface-elevated) border border-(--text-primary) rounded
        checked:bg-(--primary) checked:border-none
        relative after:content-[''] after:absolute after:-inset-y-2 after:-inset-x-4;
}

.row{
  @apply w-full flex px-(--row-indent) py-1 flex-row items-center rounded-lg;
}
.row.selected{
  @apply bg-(--primary-soft);
}
.row.hovered{
  @apply hover:bg-(--primary-soft);
}
.information{
@apply ml-(--arrow-offset-to-align-with-checkbox) flex items-center gap-(--information-gap);
}
.information.single-information{
  @apply ml-0;
}
.name{
user-select:text;
}
.meta{
  @apply ml-4 flex justify-start items-center gap-3 text-xs text-(--text-subtle);
}
.tree-status{
  @apply px-(--row-indent) py-1 text-xs text-(--text-subtle);
}
</style>
