<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import TreeNode from './components/TreeNode.vue'

const payload = ref(null)
const errorMessage = ref('')
const selection = reactive({})

const selectedCount = computed(() => Object.values(selection).filter(Boolean).length)

function visitTree(nodes, visit) {
  for (const node of nodes) {
    visit(node)
    if (node.children)
      visitTree(node.children, visit)
  }
}

function initializeSelection(tree) {
  visitTree(tree, (node) => {
    selection[node.path] = true
  })
}

async function confirm() {
  const selectedPaths = Object.entries(selection)
    .filter(([, checked]) => checked)
    .map(([entryPath]) => entryPath)

  await window.syncReview.submit({
    action: 'confirm',
    selectedPaths,
  })
}

async function cancel() {
  await window.syncReview.cancel()
}

onMounted(async () => {
  try {
    payload.value = await window.syncReview.getPayload()
    initializeSelection(payload.value.tree)
  }
  catch (error) {
    errorMessage.value = error?.message || String(error)
    console.error('Failed to initialize review renderer', error)
  }
})
</script>

<template>
  <div v-if="errorMessage" class="layout">
    <div class="header">
      <h1 class="title">Review Sync Differences</h1>
    </div>
    <div class="content">
      <div class="error-panel">
        Failed to initialize renderer: {{ errorMessage }}
      </div>
    </div>
  </div>

  <div v-else-if="payload" class="layout">
    <div class="header">
      <h1 class="title">Review Sync Differences</h1>
      <div class="roots">
        Source: {{ payload.srcRoot }}<br>
        Destination: {{ payload.dstRoot }}
      </div>
      <div class="summary">
        <span class="pill modified">Modified {{ payload.summary.modified }}</span>
        <span class="pill added">Added {{ payload.summary.added }}</span>
        <span class="pill deleted">Deleted {{ payload.summary.deleted }}</span>
      </div>
    </div>

    <div class="content">
      <div v-if="payload.tree.length === 0" class="empty">
        No differences found.
      </div>

      <ul v-else class="tree-list root">
        <TreeNode
          v-for="node in payload.tree"
          :key="node.path"
          :node="node"
          :selection="selection"
        />
      </ul>
    </div>

    <div class="footer">
      <div class="selection">
        {{ selectedCount }} item(s) selected
      </div>
      <div class="actions">
        <button class="button" @click="cancel">
          Cancel
        </button>
        <button class="button primary" @click="confirm">
          Confirm
        </button>
      </div>
    </div>
  </div>

  <div v-else class="layout">
    <div class="header">
      <h1 class="title">Review Sync Differences</h1>
    </div>
    <div class="content">
      <div class="empty">
        Loading review data...
      </div>
    </div>
  </div>
</template>
