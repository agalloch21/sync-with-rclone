<script setup>
import { SESSION_STATES, STEPS } from '#src/electron/main/session-steps.js'
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import Content from './components/Content.vue'
import Context from './components/Context.vue'
import Footer from './components/Footer.vue'
import Header from './components/Header.vue'

const { t, locale } = useI18n()
locale.value = 'en'

const state = ref(null)
const selection = reactive({})

const stateFrontEnd = ref(null)
const errorMessage = ref('')
const needFinalAcknowledgement = ref(false)
const isInFinalAcknowledgement = ref(false)

provide('state', state)
provide('selection', selection)
provide('isInFinalAcknowledgement', isInFinalAcknowledgement)

let disposeProgressListener = null
onMounted(() => {
  window.syncSession.getState()
    .then((fullState) => {
      state.value = fullState
    })
    .catch((error) => {
      cancel()

      errorMessage.value = error?.message || String(error)
    })

  disposeProgressListener = window.syncSession.onReceiveProgressEvent((patchState) => {
    state.value = { ...state.value, ...patchState }
  })
})

onBeforeUnmount(() => {
  disposeProgressListener?.()
})

const isSyncCoreFinished = computed(() => state.value?.session === SESSION_STATES.COMPLETED || state.value?.session === SESSION_STATES.CANCELLED || state.value?.session === SESSION_STATES.ERROR, false)
watch(isSyncCoreFinished, (newValue, oldValue) => {
  if (newValue === true && oldValue === false) {
    if (needFinalAcknowledgement.value) {
      isInFinalAcknowledgement.value = true
    }
    else {
      acknowledgeAndClose()
    }
  }
})

function cancel() {
  if (state.value.step === STEPS.ANALYZE || state.value.step === STEPS.REVIEW) {
    needFinalAcknowledgement.value = false
  }
  else if (state.value.step === STEPS.SYNC) {
    needFinalAcknowledgement.value = true
  }

  window.syncSession.cancelSync()
}

function confirm() {
  needFinalAcknowledgement.value = true

  const selectedPaths = Object.entries(selection)
    .filter(([, checked]) => checked)
    .map(([entryPath]) => entryPath)
  window.syncSession.confirmSync(selectedPaths)
}

function acknowledgeAndClose() {
  window.syncSession.closeWindow()
}
</script>

<template>
  <!-- <div class="fixed bottom-0 right-0 w-1/2 h-1/2 text-xs overflow-auto">
    <div>{{ $t('review.title') }}</div>
    <pre>{{ JSON.stringify(state, null, 4) }}</pre>
  </div> -->
  <div class="flex flex-col h-dvh min-h-0 overflow-hidden bg-(--surface) border-2 border-white cursor-default no-select no-callout">
    <header class="header-dock w-full h-14 bg-(--surface-soft) content-center">
      <Header :state="state" />
    </header>
    <main class="main-dock min-h-0 flex-1 overflow-hidden">
      <div
        class="main-stage h-full relative z-0
      before:content-[''] before:absolute before:left-0 before:right-0 before:top-10 before:bottom-10 before:bg-(--primary) before:opacity-10 before:blur-[100px] before:pointer-events-none before:-z-1
        flex flex-col"
      >
        <div class="context-dock h-30 shrink-0 bg-(--surface-muted) flex flex-col justify-center items-center">
          <Context :state="state" />
        </div>
        <div class="separator w-full h-px shrink-0 bg-linear-to-r from-[color-mix(in_srgb,var(--border-accent)_50%,transparent)] via-(--border-accent) to-[color-mix(in_srgb,var(--border-accent)_50%,transparent)] opacity-30" />
        <div class="content-dock min-h-0 flex-1">
          <Content :state="state" />
        </div>
      </div>
    </main>
    <footer class="footer-dock w-full h-16 bg-(--surface-footer)">
      <Footer @on-click-cancel="cancel()" @on-click-confirm="confirm()" @on-click-close="acknowledgeAndClose()" />
    </footer>
  </div>
</template>

<style scoped>
.header-dock{
    -webkit-app-region: drag;
}
</style>
