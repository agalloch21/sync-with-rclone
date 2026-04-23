<script setup>
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed } from 'vue'
import ContentAnalyze from './ContentAnalyze.vue'
import ContentReview from './ContentReview.vue'
import ContentSync from './ContentSync.vue'

const props = defineProps({
  state: Object,
})

// const step = computed(() => props.state?.step?.length > 0 ? props.state.step : '')
const step = STEPS.SYNC
</script>

<template>
  <div class="content-stage h-full overflow-auto">
    <Transition name="fade" mode="out-in">
      <ContentAnalyze v-if="step === STEPS.ANALYZE" />
      <ContentReview v-else-if="step === STEPS.REVIEW" />
      <ContentSync v-else-if="step === STEPS.SYNC" />
      <div v-else>
        Default
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Active states define the duration and easing */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

/* From/To states define the starting and ending opacity */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
