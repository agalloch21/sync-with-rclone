<script setup>
import { unwrapResult } from '#src/app/operation-result.js'
import Button from '#src/electron/renderer/src/surfaces/shared/Button.vue'
import TreeNode from '#src/electron/renderer/src/surfaces/sync-session/components/TreeNode.vue'
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

function setNodeSelection(node, selected) {
  if (selected)
    selectedPath.value = node.path
}

async function loadTree() {
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await window.folderDialog?.listTree?.()
    if (!result?.success) {
      loadError.value = result?.error?.detail || result?.error?.message || 'Failed to load server folders.'
      return
    }
    tree.value = unwrapResult(result)
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
  <div class="h-dvh min-h-0 flex flex-col bg-(--surface) text-(--text-primary) border-2 border-white cursor-default no-select no-callout">
    <header class="h-16 shrink-0 px-5 flex flex-col justify-center bg-(--surface-soft)">
      <h1 class="m-0 text-base font-bold">
        Select Folder
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
