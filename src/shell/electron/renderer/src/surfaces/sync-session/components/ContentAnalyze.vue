<script setup>
import { SYNC_SESSION_STAGE, SYNC_SESSION_STAGE_META } from '#electron/contracts/sync-session-stage.js'
import { computed, inject } from 'vue'
import ResultIcon from '../../shared/ResultIcon.vue'

const state = inject('state')

const currentPhaseIndex = computed(() => {
  if (!state.value || SYNC_SESSION_STAGE_META[SYNC_SESSION_STAGE.ANALYZE]?.phases?.length === 0) {
    return 0
  }

  if (state.value.stage === SYNC_SESSION_STAGE.ANALYZE) {
    return SYNC_SESSION_STAGE_META[SYNC_SESSION_STAGE.ANALYZE]?.phases.findIndex(phase => phase === state.value.phase)
  }

  return SYNC_SESSION_STAGE_META[SYNC_SESSION_STAGE.ANALYZE]?.phases?.length
})
</script>

<template>
  <div class="analyze-stage w-full h-full grid grid-rows-6 justify-center place-items-center">
    <div class="row-start-2 font-medium text-3xl text-(--text-primary)">
      Preparing Sync
    </div>
    <div class="row-start-3 row-span-3 flex flex-col justify-center items-left gap-4 text-xs text-(--text-subtle)">
      <div v-for="(phase, index) in SYNC_SESSION_STAGE_META[SYNC_SESSION_STAGE.ANALYZE]?.phases" :key="phase" class="flex items-center gap-2">
        <Transition name="fade" mode="out-in" type="transition">
          <div v-if="index > currentPhaseIndex" class="icon waiting" />
          <div v-else-if="index === currentPhaseIndex" class="icon running" />
          <ResultIcon v-else-if="index < currentPhaseIndex" type="success" class="icon" />
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

.fade-enter-active,
.fade-leave-active{
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to{
opacity:0;
}
</style>
