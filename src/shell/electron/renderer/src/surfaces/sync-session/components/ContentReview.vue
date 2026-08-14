<script setup>
import TreeNode from '#frontend/surfaces/shared/TreeNode.vue'
import { inject, watch } from 'vue'

const state = inject('state')
const selection = inject('selection')

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
    path,
    state,
    size,
    mtimeMs,
}
{
    type: 'directory',
    name,
    path,
    changes,
    children,
}
*/

function visitFileNodes(node, visit) {
  if (node.type === 'file') {
    visit(node)
    return
  }

  for (const child of node.children || [])
    visitFileNodes(child, visit)
}

function initializeSelection(tree) {
  for (const key of Object.keys(selection))
    delete selection[key]

  visitFileNodes(tree, (node) => {
    selection[node.path] = true
  })
}

function getSelectionState(node) {
  if (node.type !== 'directory')
    return selection[node.path] ? 'checked' : 'unchecked'

  if (!node.children?.length)
    return 'unchecked'

  let hasChecked = false
  let hasUnchecked = false

  for (const child of node.children) {
    const childState = getSelectionState(child)
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

  if (hasChecked && hasUnchecked)
    return 'partial'

  return hasChecked ? 'checked' : 'unchecked'
}

function setNodeSelection(node, checked) {
  if (node.type === 'file') {
    if (checked)
      selection[node.path] = true
    else
      delete selection[node.path]
  }
  else {
    visitFileNodes(node, (fileNode) => {
      if (checked)
        selection[fileNode.path] = true
      else
        delete selection[fileNode.path]
    })
  }
}

watch(() => state.value?.sessionState?.review, (newValue, _) => {
  if (newValue?.tree)
    initializeSelection(newValue.tree)
}, { immediate: true })
</script>

<template>
  <div class="tree-stage px-4 py-4">
    <div v-if="!(state?.sessionState?.review?.tree?.children)">
      Initializing trees
    </div>
    <div v-else-if="state?.sessionState?.review?.tree?.children.length === 0">
      No differences found.
    </div>

    <!-- tree-list root -->
    <ul v-else>
      <TreeNode
        :key="state.sessionState.review.tree.path"
        :node="state.sessionState.review.tree"
        :get-selection-state="getSelectionState"
        :set-node-selection="setNodeSelection"
        :is-open="true"
      />
    </ul>
  </div>
</template>
