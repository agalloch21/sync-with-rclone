<script setup>
import { STEP_META, STEPS } from '#src/electron/main/sync-session/steps.js'
import { computed, inject } from 'vue'

const state = inject('state')

const currentPhaseIndex = computed(() => {
  if (!state.value || STEP_META[STEPS.ANALYZE]?.phases?.length === 0) {
    return 0
  }

  if (state.value.step === STEPS.ANALYZE) {
    return STEP_META[STEPS.ANALYZE]?.phases.findIndex(phase => phase === state.value.phase)
  }

  return STEP_META[STEPS.ANALYZE]?.phases?.length
})
</script>

<template>
  <div class="analyze-stage w-full h-full grid grid-rows-6 justify-center place-items-center">
    <div class="row-start-2 font-medium text-3xl text-(--text-primary)">
      Preparing Sync
    </div>
    <div class="row-start-3 row-span-3 flex flex-col justify-center items-left gap-4 text-xs text-(--text-subtle)">
      <div v-for="(phase, index) in STEP_META[STEPS.ANALYZE]?.phases" :key="phase" class="flex items-center gap-2">
        <Transition name="fade" mode="out-in" type="transition">
          <div v-if="index > currentPhaseIndex" class="icon waiting" />
          <div v-else-if="index === currentPhaseIndex" class="icon running" />
          <div v-else class="icon done" />
        </Transition>
        <div class="allow-select">
          {{ $t(`${phase}`) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.icon{
  @apply w-3 h-auto aspect-square;
background-size: 100% 100%;
  background-repeat: no-repeat;
}
.waiting{
  @apply border-2 border-(--primary) rounded-full scale-50;
}
.running{
@apply bg-(--primary) rounded-full scale-50 animate-ping [animation-duration:1s];
}

.done{
background-image:url("data:image/svg+xml,<svg width='12' height='12' viewBox='0 0 12 12'  fill='%233F9D14' xmlns='http://www.w3.org/2000/svg'><path d='M5.18332 8.51667L9.29582 4.40417L8.47916 3.5875L5.18332 6.88333L3.52082 5.22083L2.70416 6.0375L5.18332 8.51667V8.51667M5.99999 11.6667C5.19305 11.6667 4.43471 11.5135 3.72499 11.2073C3.01527 10.901 2.39791 10.4854 1.87291 9.96042C1.34791 9.43542 0.932281 8.81806 0.626031 8.10833C0.319781 7.39861 0.166656 6.64028 0.166656 5.83333C0.166656 5.02639 0.319781 4.26806 0.626031 3.55833C0.932281 2.84861 1.34791 2.23125 1.87291 1.70625C2.39791 1.18125 3.01527 0.765625 3.72499 0.459375C4.43471 0.153125 5.19305 0 5.99999 0C6.80693 0 7.56527 0.153125 8.27499 0.459375C8.98471 0.765625 9.60207 1.18125 10.1271 1.70625C10.6521 2.23125 11.0677 2.84861 11.3739 3.55833C11.6802 4.26806 11.8333 5.02639 11.8333 5.83333C11.8333 6.64028 11.6802 7.39861 11.3739 8.10833C11.0677 8.81806 10.6521 9.43542 10.1271 9.96042C9.60207 10.4854 8.98471 10.901 8.27499 11.2073C7.56527 11.5135 6.80693 11.6667 5.99999 11.6667V11.6667'/></svg>");
}

.fade-enter-active,
.fade-leave-active{
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to{
opacity:0;
}
</style>
