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
  <li class="tree-item">
    <details v-if="node.type === 'directory'" open>
      <summary class="row">
        <label class="node-toggle">
          <input
            type="checkbox"
            :checked="selection[node.path]"
            @change="onToggle"
          >
          <span class="name">{{ node.name }}/</span>
        </label>
        <span class="folder-badges">
          <span v-if="node.changes.modified" class="folder-badge">modified {{ node.changes.modified }}</span>
          <span v-if="node.changes.added" class="folder-badge">added {{ node.changes.added }}</span>
          <span v-if="node.changes.deleted" class="folder-badge">deleted {{ node.changes.deleted }}</span>
        </span>
      </summary>

      <ul class="tree-list">
        <TreeNode
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :selection="selection"
        />
      </ul>
    </details>

    <label v-else class="row node-toggle">
      <input
        type="checkbox"
        :checked="selection[node.path]"
        @change="onToggle"
      >
      <span class="name">{{ node.name }}</span>
      <span class="state" :class="node.state">{{ node.state }}</span>
      <span class="meta">{{ formatBytes(node.size) }}</span>
    </label>
  </li>
</template>
