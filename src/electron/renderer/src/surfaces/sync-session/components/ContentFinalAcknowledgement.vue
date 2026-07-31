<script setup>
import { SYNC_RESULT } from '#src/core/contract.js'
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['autoClose'])

const { t } = useI18n()

const state = inject('state')

const result = computed(() => state.value?.final?.result)

// completed
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

// cancelled
const operations = computed(() => result.value === SYNC_RESULT.CANCELLED ? state.value?.final?.operations || [] : [])
const operationSummary = computed(() => t(`result.${result.value}.message`, { syncedCount: `${operations.value.filter(op => op.synced).length}`, total: `${operations.value.length}` }))

const showOperationDetail = ref(false)

// failed
const logFileName = computed(() => state.value?.final?.logPath?.split(/[\\/]/).pop() || '')

const errorMessages = computed(() => {
  if (result.value === SYNC_RESULT.FAILED) {
    const final = state.value?.final

    let errorString = final?.message || ''
    if (final?.errorCode) {
      const key = `errors['${final.errorCode}']`
      const translated = t(key, final?.errorDetails || {})
      if (translated !== key)
        errorString = translated
    }

    const lines = errorString.split(/\r?\n/)
      .filter(line => line.trim() !== '')

    return lines
  }
  return []
})

function showLogInFolder() {
  if (state.value?.final?.logPath)
    window.syncSession.showLogInFolder()
}
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
    <div class="message-dock">
      <div v-if="result === SYNC_RESULT.COMPLETED" class="flex justify-center">
        {{ $t(`result.${result}.message`, { count: `${waitSecond}` }) }}
      </div>
      <div v-if="result === SYNC_RESULT.CANCELLED" class="h-full flex flex-col items-center gap-3">
        <p>
          <span>{{ operationSummary }}</span>
          <span class="underline cursor-pointer" @click="showOperationDetail = !showOperationDetail">[{{ $t(`result.${result}.detailButton`) }}]</span>
        </p>
        <div v-if="showOperationDetail" class="overflow-y-auto [scrollbar-gutter:stable] px-4">
          <table class="text-[0.6rem] text-(--text-subtle)">
            <tr v-for="(op, index) in operations" :key="index" class="py-0.5 flex items-center gap-1 whitespace-nowrap">
              <td class="flex-1">
                {{ op.path }}
              </td>
              <td class="flex-0 basis-auto">
                ......
              </td>
              <td class="flex-0 basis-auto">
                {{ op.type }}
              </td>
              <td class="flex-0 basis-auto ">
                <svg v-if="op.synced" width="12" height="12" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="50" height="50" rx="25" fill="#3F9D14" />
                  <path d="M34.3485 18.6274C35.2172 19.4643 35.2172 20.8208 34.3485 21.6576L23.2219 32.3726C22.3529 33.2091 20.9443 33.2091 20.0753 32.3726L15.6247 28.0866C14.7813 27.2457 14.7934 25.9091 15.6518 25.0825C16.5102 24.2559 17.8981 24.2443 18.7713 25.0564L21.6486 27.8273L31.2019 18.6274C32.0709 17.7909 33.4795 17.7909 34.3485 18.6274V18.6274" fill="white" />
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="50" height="50" rx="25" fill="#EF0606" />
                  <path d="M25 22.6334L17.8669 15.5071C17.2144 14.8552 16.1413 14.8552 15.4894 15.5071C14.8375 16.159 14.8369 17.2308 15.4894 17.8827L22.6225 25.0091L15.4894 32.1354C14.8369 32.7873 14.8369 33.8592 15.4894 34.5111C16.1419 35.163 17.215 35.163 17.8669 34.5111L25 27.3847L32.1331 34.5111C32.7856 35.163 33.8588 35.163 34.5106 34.5111C35.1625 33.8592 35.1631 32.7873 34.5106 32.1354L27.3775 25.0091L34.5106 17.8827C34.8241 17.5669 35 17.1399 35 16.6949C35 16.2499 34.8241 15.8229 34.5106 15.5071C33.8581 14.8346 32.8063 14.8346 32.1331 15.4858L25 22.6334Z" fill="white" />
                </svg>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div v-if="result === SYNC_RESULT.FAILED" class="h-full flex flex-col gap-2 items-center">
        <div class="overflow-y-auto [scrollbar-gutter:stable] flex flex-col gap-1 break-all ">
          <p v-for="(msg, index) in errorMessages" :key="index">
            {{ msg }}
          </p>
        </div>
        <p v-if="state.final?.logPath">
          {{ $t('result.failed.logPath') }}
          <button class="underline cursor-pointer ml-0.5 break-all" type="button" @click="showLogInFolder">
            {{ logFileName }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.final-ackownledgement-stage{
  @apply h-full grid grid-rows-6 px-12 py-4;
}

.icon-dock{
  @apply row-span-2 self-end;
}
.icon-stage{
  @apply w-13 h-auto aspect-square m-auto rounded-full flex justify-center items-center;
}
.icon{
  @apply w-5 h-auto aspect-square;
}
.result-dock{
  @apply m-auto text-3xl text-(--text-primary);
}
.message-dock{
  @apply row-span-3 py-2 whitespace-pre-line text-xs text-(--text-subtle);
}
</style>
