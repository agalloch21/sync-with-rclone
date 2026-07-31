<script setup>
import Button from '#frontend/surfaces/shared/Button.vue'
import TreeNode from '#frontend/surfaces/shared/TreeNode.vue'
import { unwrapResult } from '#src/app/operation-result.js'
import { nextTick, onMounted, ref } from 'vue'

const state = ref({ serverName: '', currentPath: '' })
const tree = ref(null)
const selectedPath = ref('')
const isLoading = ref(true)
const loadError = ref('')
const isClosing = ref(false)

function getSelectionState(node) {
  return node.path === selectedPath.value ? 'checked' : 'unchecked'
}

function getLoadError(result) {
  return result?.error?.detail || result?.error?.message || 'Failed to load server folders.'
}

function prepareChildNode(node) {
  return {
    ...node,
    children: node.children ?? null,
    loadState: 'idle',
    loadError: '',
  }
}

function applyLoadedTree(node, loadedTree) {
  node.children = (loadedTree.children || []).map(prepareChildNode)
  node.loadState = 'loaded'
  node.loadError = ''
}

async function loadFolder(node) {
  if (node.loadState === 'loading' || node.loadState === 'loaded')
    return true

  node.loadState = 'loading'
  node.loadError = ''

  try {
    const result = await window.folderDialog?.listTree?.({ path: node.path })
    if (!result?.success) {
      node.loadState = 'error'
      node.loadError = getLoadError(result)
      return false
    }

    applyLoadedTree(node, unwrapResult(result))
    return true
  }
  catch (error) {
    node.loadState = 'error'
    node.loadError = error?.message || String(error)
    return false
  }
}

async function setNodeSelection(node, selected) {
  if (!selected)
    return

  selectedPath.value = node.path
  await loadFolder(node)
}

async function loadInitialSelection() {
  if (!selectedPath.value || !tree.value)
    return

  const pathSegments = selectedPath.value.split('/').filter(Boolean)
  let currentNode = tree.value
  let currentPath = ''

  for (const segment of pathSegments) {
    if (!await loadFolder(currentNode))
      return

    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    currentNode = currentNode.children.find(child => child.path === currentPath)
    if (!currentNode)
      return
  }

  await loadFolder(currentNode)
}

async function loadTree() {
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await window.folderDialog?.listTree?.({ path: '' })
    if (!result?.success) {
      loadError.value = getLoadError(result)
      return
    }
    const loadedTree = unwrapResult(result)
    tree.value = {
      ...loadedTree,
      loadState: 'loaded',
      loadError: '',
      children: (loadedTree.children || []).map(prepareChildNode),
    }
    await loadInitialSelection()
  }
  catch (error) {
    loadError.value = error?.message || String(error)
  }
  finally {
    isLoading.value = false
  }
}

async function confirmSelection() {
  if (isClosing.value)
    return
  isClosing.value = true
  try {
    await window.folderDialog?.confirm?.({ path: selectedPath.value })
  }
  catch (error) {
    loadError.value = error?.message || String(error)
    isClosing.value = false
  }
}

async function cancelSelection() {
  if (isClosing.value)
    return
  isClosing.value = true
  try {
    await window.folderDialog?.cancel?.()
  }
  catch (error) {
    loadError.value = error?.message || String(error)
    isClosing.value = false
  }
}

onMounted(async () => {
  state.value = await window.folderDialog?.getState?.() || { serverName: '', currentPath: '' }
  selectedPath.value = state.value.currentPath || ''

  await nextTick()
  await document.fonts.ready
  window.folderDialog?.ready?.()
  await loadTree()
})
</script>

<template>
  <div class="h-dvh min-h-0 flex flex-col bg-(--surface) text-(--text-primary) cursor-default no-select no-callout">
    <header class="h-20 shrink-0 px-10 flex flex-col gap-1 justify-center bg-(--surface-soft)">
      <h1 class="mt-4 text-base font-bold content-center">
        Select Remote Folder
      </h1>
      <span class="text-xs text-(--text-subtle)">{{ state.serverName }}:{{ selectedPath }}</span>
    </header>

    <main class="min-h-0 flex-1 overflow-auto px-4 py-4">
      <p v-if="isLoading" class="text-sm text-(--text-subtle)">
        Loading server folders...
      </p>
      <div v-else-if="loadError" class="flex flex-col items-start gap-3">
        <p class="m-0 text-sm text-(--danger) break-all">
          {{ loadError }}
        </p>
        <Button @click="loadTree">
          Retry
        </Button>
      </div>
      <ul v-else-if="tree" class="m-0 p-0">
        <TreeNode
          :node="tree"
          selection-mode="single"
          :get-selection-state="getSelectionState"
          :set-node-selection="setNodeSelection"
          :is-open="true"
        />
      </ul>
    </main>

    <footer class="h-16 shrink-0 px-5 flex justify-end items-center gap-5 bg-(--surface-footer)">
      <Button :primary="true" :wide="true" :disabled="isLoading || Boolean(loadError) || isClosing" @click="confirmSelection">
        Select
      </Button>
      <Button :disabled="isClosing" @click="cancelSelection">
        Cancel
      </Button>
    </footer>
  </div>
</template>
