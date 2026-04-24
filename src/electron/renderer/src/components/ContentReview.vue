<script setup>
import { computed, inject, watch } from 'vue'
import TreeNode from './TreeNode.vue'

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

  selection[tree.path] = true

  visitTree(tree.children, (node) => {
    selection[node.path] = true
  })

  console.log(tree)
  console.log(selection)
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
        :is-open="true"
      />
    </ul>
  </div>
</template>
