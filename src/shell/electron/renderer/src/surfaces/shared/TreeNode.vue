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
              class="icon arrow transition-transform"
              role="button"
              tabindex="0"
              @click.stop.prevent="toggleDirectoryFromUserAction"
              @keydown.enter.stop.prevent="toggleDirectoryFromUserAction"
              @keydown.space.stop.prevent="toggleDirectoryFromUserAction"
            >
              <span class="icon-[custom--arrow] text-xs text-(--text-subtle)" />
            </div>
            <span class="name">{{ node.name }}/</span>
            <div v-if="node?.changes" class="meta">
              <div v-for="(value, key) in node?.changes" v-show="value > 0" :key="key" class="flex gap-1 items-center">
                <span class="icon" :class="`${key}`" />
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
          {{ $t('treeNode.loading') }}
        </li>
        <li v-else-if="node.loadState === 'error'" class="tree-status text-(--danger)">
          {{ node.loadError || $t('treeNode.loadFailed') }}
        </li>
        <li v-else-if="node.loadState === 'idle'" class="tree-status">
          {{ $t('treeNode.loadPrompt') }}
        </li>
        <li v-else-if="node.loadState === 'loaded' && node.children?.length === 0" class="tree-status">
          {{ $t('treeNode.empty') }}
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
        <span class="icon" :class="`${node.state}`" />
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
@reference "../../assets/styles.css";

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
  @apply icon-[custom--state-added] text-(--success) content-center;
  }
.modified{
  @apply icon-[custom--state-modified] text-(--warning);
  }
.deleted{
  @apply icon-[custom--state-deleted] text-(--danger);
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
