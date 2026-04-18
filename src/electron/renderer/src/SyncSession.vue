<script setup>
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Content from './components/Content.vue'
import Context from './components/Context.vue'
import Header from './components/Header.vue'

const { t, locale } = useI18n()
locale.value = 'en'

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
  <div class="flex flex-col h-dvh min-h-0 overflow-hidden bg-white border-2 border-white">
    <header class="header-dock w-full h-14 bg-[#E5EEFF] content-center">
      <Header :state="state" />
    </header>
    <main class="main-dock min-h-0 flex-1 overflow-hidden">
      <div
        class="main-stage h-full relative
      before:content-[''] before:absolute before:left-0 before:right-0 before:top-[25%] before:bottom-[25%] before:bg-[#254CE4] before:opacity-20 before:blur-[100px]
        flex flex-col"
      >
        <div class="context-dock h-30 bg-[#F8F9FF] flex flex-col justify-center items-center">
          <Context :state="state" />
        </div>
        <div class="separator w-full h-px bg-linear-to-r from-[#81B5F680] via-[#81B5F6FF] to-[#81B5F680] opacity-30" />
        <div class="content-dock">
          <Content :state="state" />
        </div>
      </div>
    </main>
    <footer class="footer-dock w-full h-16 bg-[#EFF4FF]" />
  </div>
</template>

<style scoped>
.header-dock{
    -webkit-app-region: drag;
}
</style>
