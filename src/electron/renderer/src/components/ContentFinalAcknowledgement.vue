<script setup>
import { SYNC_RESULT } from '#src/core/contract.js'
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['autoClose'])

const { t } = useI18n()

const state = inject('state')

const result = computed(() => state.value?.final?.result)
const logPath = computed(() => state.value?.final?.logPath || '')
const translatedErrorMessage = computed(() => {
  const final = state.value?.final
  const errorCode = final?.errorCode

  if (!errorCode)
    return final?.message || ''

  const key = `errors['${errorCode}']`
  const translated = t(key, final?.errorDetails || {})
  return translated === key ? (final?.message || '') : translated
})
const waitSecond = ref(5)
let countdownIntervalId = null

function stopCountdown() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
}

watch(result, (newValue) => {
  stopCountdown()

  if (newValue !== SYNC_RESULT.COMPLETED)
    return

  waitSecond.value = 5
  countdownIntervalId = setInterval(() => {
    waitSecond.value -= 1
    if (waitSecond.value === 0) {
      stopCountdown()
      emit('autoClose')
    }
  }, 1000)
}, { immediate: true })

onBeforeUnmount(() => {
  stopCountdown()
})

const messageHtml = computed(() => {
  if (result.value === SYNC_RESULT.COMPLETED) {
    return t(`result.${result.value}.message`, { count: `${waitSecond.value}` })
  }
  else if (result.value === SYNC_RESULT.CANCELLED) {
    return 'some phases have been executed'
  }
  else if (result.value === SYNC_RESULT.FAILED) {
    const lines = translatedErrorMessage.value.split(/\r?\n/)
      .filter(line => line.trim() !== '')
      .map(line => `<p>${line}</p>`)
    if (logPath.value)
      lines.push(`<p>${t('result.failed.logPath', { path: logPath.value })}</p>`)
    return lines.join('')
  }
  return ''
})
</script>

<template>
  <div class="final-ackownledgement-stage">
    <div class="icon-dock">
      <div class="icon-stage" :class="result === SYNC_RESULT.COMPLETED ? 'bg-(--success)' : result === SYNC_RESULT.CANCELLED ? 'bg-(--warning)' : result === SYNC_RESULT.FAILED ? 'bg-(--danger)' : ''">
        <svg class="icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path v-if="result === SYNC_RESULT.COMPLETED" d="M19.3485 3.62744C20.2172 4.46427 20.2172 5.82079 19.3485 6.65762L8.22189 17.3726C7.35291 18.2091 5.94428 18.2091 5.0753 17.3726L0.624672 13.0866C-0.21866 12.2457 -0.206599 10.9091 0.65178 10.0825C1.51016 9.25588 2.8981 9.24427 3.77127 10.0564L6.6486 12.8273L16.2019 3.62744C17.0709 2.79085 18.4795 2.79085 19.3485 3.62744V3.62744" fill="white" />
          <path v-else-if="result === SYNC_RESULT.CANCELLED" d="M12.1115 19.2308C11.6574 19.6425 11.1351 19.8914 10.5541 19.9864C10.3686 19.9955 10.188 20 9.99756 20C9.80716 20 9.62653 19.9955 9.44101 19.9864C8.85517 19.8914 8.33767 19.638 7.88365 19.2308C7.29292 18.6923 7 18.0498 7 17.2851C7 16.5294 7.29292 15.8733 7.88365 15.3258C8.47437 14.7783 9.18226 14.5023 9.99756 14.5023C10.8129 14.5023 11.5207 14.7783 12.1115 15.3258C12.7022 15.8733 12.9951 16.5294 12.9951 17.2851C13 18.0452 12.7071 18.6968 12.1115 19.2308ZM11.4329 12.8371H8.61595C8.27421 8.97285 7.00488 3.66063 7.00488 2.93665C7.00488 2.1086 7.28316 1.41176 7.84459 0.850678C8.4109 0.285067 9.12368 0 10.0024 0C10.8763 0 11.594 0.280543 12.1603 0.837104C12.7217 1.39819 13 2.09502 13 2.93665C13 3.66063 11.8283 8.97285 11.4329 12.8371Z" fill="white" />
          <path v-else-if="result === SYNC_RESULT.FAILED" d="M10 7.63342L2.86688 0.50707C2.21438 -0.144814 1.14125 -0.144814 0.489375 0.50707C-0.1625 1.15895 -0.163125 2.23084 0.489375 2.88273L7.6225 10.0091L0.489375 17.1354C-0.163125 17.7873 -0.163125 18.8592 0.489375 19.5111C1.14188 20.163 2.215 20.163 2.86688 19.5111L10 12.3847L17.1331 19.5111C17.7856 20.163 18.8588 20.163 19.5106 19.5111C20.1625 18.8592 20.1631 17.7873 19.5106 17.1354L12.3775 10.0091L19.5106 2.88273C19.8241 2.56687 20 2.1399 20 1.6949C20 1.2499 19.8241 0.822931 19.5106 0.50707C18.8581 -0.165439 17.8063 -0.165439 17.1331 0.48582L10 7.63342Z" fill="white" />
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
.result-dock{
  @apply text-3xl text-(--text-primary);
}
.message-dock{
  @apply row-span-3 self-start py-2 whitespace-pre-line text-xs text-(--text-subtle) flex flex-col gap-2 break-all overflow-y-auto;
}
</style>
