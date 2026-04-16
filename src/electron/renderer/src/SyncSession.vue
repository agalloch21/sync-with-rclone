<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TreeNode from './components/TreeNode.vue'

const { t, locale } = useI18n()
locale.value = 'zh-CN'
console.log(t('review.title'))

const state = ref(null)
const errorMessage = ref('')
const selection = reactive({})

const reviewPayload = computed(() => state.value?.review || null)
const progressEvent = computed(() => state.value?.phase || null)
const progressMessage = computed(() => progressEvent.value?.message || 'Waiting for execution...')
const progressPhase = computed(() => progressEvent.value?.name || '')
const progressStatus = computed(() => progressEvent.value?.status || 'idle')
const selectedCount = computed(() => Object.values(selection).filter(Boolean).length)

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

  visitTree(tree, (node) => {
    selection[node.path] = true
  })
}

let disposeProgressListener = null
onMounted(() => {
  window.syncSession.getState()
    .then((fullState) => {
      state.value = fullState
      if (fullState?.review?.tree)
        initializeSelection(fullState.review.tree)
    })
    .catch((error) => {
      errorMessage.value = error?.message || String(error)
    })

  disposeProgressListener = window.syncSession.onReceiveProgressEvent((patchState) => {
    state.value = { ...state.value, ...patchState }
    if (patchState.review?.tree)
      initializeSelection(patchState.review.tree)
  })
})

onBeforeUnmount(() => {
  disposeProgressListener?.()
})

function cancel() {
  window.syncSession.cancelSync()
}

function confirm() {
  const selectedPaths = Object.entries(selection)
    .filter(([, checked]) => checked)
    .map(([entryPath]) => entryPath)
  window.syncSession.confirmSync(selectedPaths)
}
</script>

<template>
  <div class="fixed bottom-0 right-0 w-1/2 h-1/2 text-xs overflow-auto">
    <div>{{ $t('review.title') }}</div>
    <pre>{{ JSON.stringify(state, null, 4) }}</pre>
  </div>
  <div v-if="errorMessage" class="layout">
    <div class="header">
      <h1 class="title">
        Sync Session
      </h1>
    </div>
    <div class="content">
      <div class="error-panel">
        Failed to initialize session renderer: {{ errorMessage }}
      </div>
    </div>
  </div>

  <div v-else-if="state?.screen === 'review' && reviewPayload" class="layout">
    <div class="header">
      <h1 class="title">
        Review Sync Differences
      </h1>
      <div class="roots">
        Source: {{ reviewPayload.srcRoot }}<br>
        Destination: {{ reviewPayload.dstRoot }}
      </div>
      <div class="summary">
        <span class="pill modified">Modified {{ reviewPayload.summary.modified }}</span>
        <span class="pill added">Added {{ reviewPayload.summary.added }}</span>
        <span class="pill deleted">Deleted {{ reviewPayload.summary.deleted }}</span>
      </div>
    </div>

    <div class="content">
      <div v-if="reviewPayload.tree.length === 0" class="empty">
        No differences found.
      </div>

      <ul v-else class="tree-list root">
        <TreeNode
          v-for="node in reviewPayload.tree"
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

  <div v-else class="layout progress-layout">
    <div class="header">
      <h1 class="title">
        Sync Progress
      </h1>
      <div class="roots">
        {{ progressPhase || 'Preparing sync session' }}
      </div>
    </div>

    <div class="content progress-content">
      <div class="progress-meta">
        {{ progressStatus }}
      </div>
      <div class="progress-current">
        {{ progressMessage }}
      </div>
    </div>
  </div>
</template>
