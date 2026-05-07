<script setup>
import { SYNC_RESULT } from '#src/core/contract.js'
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['autoClose'])

const { t } = useI18n()

const state = inject('state')

const result = computed(() => state.value?.final?.result)
const waitSecond = ref(5)
watch(result, () => {
  if (result?.value === SYNC_RESULT.COMPLETED) {
    const intervalId = setInterval(() => {
      waitSecond.value -= 1
      if (waitSecond.value === 0) {
        clearInterval(intervalId)
        emit('autoClose')
      }
    }, 1000)
  }
})
const messageHtml = computed(() => {
  if (result.value === SYNC_RESULT.COMPLETED) {
    return t(`result.{result.value}.message`).replace('#', String(waitSecond.value))
  }
  else if (result.value === SYNC_RESULT.CANCELLED) {
    return 'some phases have been executed'
  }
  else if (result.value === SYNC_RESULT.FAILED) {
    return state.value?.final?.message?.split(/\r?\n/)
      .filter(line => line.trim() !== '')
      .map(line => `<p>${line}</p>`)
      .join('')
  }
  return ''
})
</script>

<template>
  <div v-if="result === SYNC_RESULT.COMPLETED">
    <div class="icon completed" />
    <h3 class="">
      Finished
    </h3>
    <p>The window will be closed in <span>5</span> seconds.</p>
  </div>
  <div v-else-if="result === SYNC_RESULT.CANCELLED">
    <div class="icon cancelled" />
    <h3 class="">
      Cancelled
    </h3>
    <p>The window will be closed in <span>5</span> seconds.</p>
  </div>
  <div
    v-else-if="result === SYNC_RESULT.FAILED"
    class="final-ackownledgement-stage"
  >
    <div class="icon-dock">
      <div class="icon-stage icon-error">
        <svg class="icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.3485 3.62744C20.2172 4.46427 20.2172 5.82079 19.3485 6.65762L8.22189 17.3726C7.35291 18.2091 5.94428 18.2091 5.0753 17.3726L0.624672 13.0866C-0.21866 12.2457 -0.206599 10.9091 0.65178 10.0825C1.51016 9.25588 2.8981 9.24427 3.77127 10.0564L6.6486 12.8273L16.2019 3.62744C17.0709 2.79085 18.4795 2.79085 19.3485 3.62744V3.62744" fill="white" />
        </svg>
      </div>
    </div>
    <h3 class="result-dock">
      {{ $t(`result.${result}.title`) }}
    </h3>
    <div class="message-dock" v-html="messageHtml" />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.final-ackownledgement-stage{
  @apply h-full grid grid-rows-6 place-items-center px-12 py-4;
}

.icon-dock{
  @apply row-span-2 self-end;
}
.icon-stage{
  @apply w-13 h-auto aspect-square rounded-full flex justify-center items-center;
}
.icon{
  @apply w-5 h-auto aspect-square;
}
.icon-error{
  @apply bg-(--danger);
}
.result-dock{
  @apply text-3xl text-(--text-primary);
}
.message-dock{
  @apply row-span-3 self-start py-2 whitespace-pre-line text-xs text-(--text-subtle) flex flex-col gap-2 break-all overflow-y-auto;
}
</style>
