<script setup>
import { SYNC_RESULT } from '#src/core/contract.js'
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ResultIcon from '../../shared/ResultIcon.vue'

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
      <ResultIcon
        class="size-13"
        :type="result === SYNC_RESULT.COMPLETED ? 'success' : result === SYNC_RESULT.CANCELLED ? 'warning' : result === SYNC_RESULT.FAILED ? 'error' : ''"
      />
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
              <td class="flex-0 basis-auto">
                <ResultIcon :type="op.synced ? 'success' : 'error'" class="size-3" />
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
  @apply row-span-2 self-end flex justify-center items-center;
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
