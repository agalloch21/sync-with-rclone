<script setup>
import { inject, watch } from 'vue'
import TreeNode from './TreeNode.vue'

const state = inject('state')
const selection = inject('selection')
const partialSelection = inject('partialSelection')

/*
// SELECTION STRUCTURE:
{
[path1]: true,
[path2]: false,
}

// STATE STRUCTURE:
state:{
    review: {
        summary: {
        added: 0,
        modified: 0,
        deleted: 0,
        },
        tree: [],
    },
}
// ENTRY STRUCTURE IN TREE:
{
    type: 'file',
    name,
    path: childRef.path,
    state: DIFF_STATE_LABELS[fileEntry?.state] || 'unchanged',
    size: fileEntry?.size || 0,
    mtimeMs: fileEntry?.mtimeMs || 0,
}
{
    type: 'directory',
    name,
    path: childRef.path,
    changes: getDirChangeSummary(childDirEntry),
    children: buildTree(diffSnapshot, childRef.path),
}
*/

function visitTree(nodes, visit) {
  for (const node of nodes) {
    visit(node)
    if (node.children)
      visitTree(node.children, visit)
  }
}

function initializeSelection(tree) {
  for (const key of Object.keys(selection))
    delete selection[key]

  for (const key of Object.keys(partialSelection))
    delete partialSelection[key]

  selection[tree.path] = true

  visitTree(tree.children, (node) => {
    selection[node.path] = true
    if (node.type === 'directory')
      partialSelection[node.path] = false
  })
  partialSelection[tree.path] = false
}

function recalculateSelection(node) {
  if (node.type !== 'directory')
    return selection[node.path] ? 'checked' : 'unchecked'

  if (!node.children?.length) {
    partialSelection[node.path] = false
    return selection[node.path] ? 'checked' : 'unchecked'
  }

  let hasChecked = false
  let hasUnchecked = false

  for (const child of node.children) {
    const childState = recalculateSelection(child)
    if (childState === 'checked') {
      hasChecked = true
    }
    else if (childState === 'partial') {
      hasChecked = true
      hasUnchecked = true
    }
    else {
      hasUnchecked = true
    }
  }

  selection[node.path] = hasChecked && !hasUnchecked
  partialSelection[node.path] = hasChecked && hasUnchecked

  if (partialSelection[node.path])
    return 'partial'

  return selection[node.path] ? 'checked' : 'unchecked'
}

function onSelectionChange() {
  if (state.value?.review?.tree)
    recalculateSelection(state.value.review.tree)
}

watch(() => state.value?.review, (newValue, _) => {
  if (newValue?.tree)
    initializeSelection(newValue.tree)
}, { immediate: true })
</script>

<template>
  <div class="tree-stage px-4 py-4">
    <div v-if="!(state?.review?.tree?.children)">
      Initializing trees
    </div>
    <div v-else-if="state?.review?.tree?.children.length === 0">
      No differences found.
    </div>

    <!-- tree-list root -->
    <ul v-else>
      <TreeNode
        :key="state.review.tree.path"
        :node="state.review.tree"
        :selection="selection"
        :partial-selection="partialSelection"
        :is-open="true"
        @selection-change="onSelectionChange"
      />
    </ul>
  </div>
</template>
