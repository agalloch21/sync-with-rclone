<script setup>
import { SYNC_OPERATION_STATUS, SYNC_RESULT } from '#src/core/contract.js'
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HoverTooltip from '../../shared/HoverTooltip.vue'
import ResultIcon from '../../shared/ResultIcon.vue'

const emit = defineEmits(['autoClose'])

const { t, te } = useI18n()

const state = inject('state')

const result = computed(() => state.value?.sessionResult?.result)

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

const operations = computed(() => (
  result.value === SYNC_RESULT.CANCELLED || result.value === SYNC_RESULT.FAILED
    ? state.value?.sessionResult?.operations || []
    : []
))
const operationCounts = computed(() => ({
  syncedCount: operations.value.filter(operation => operation.status === SYNC_OPERATION_STATUS.SYNCED).length,
  failedCount: operations.value.filter(operation => operation.status === SYNC_OPERATION_STATUS.FAILED).length,
  pendingCount: operations.value.filter(operation => operation.status === SYNC_OPERATION_STATUS.PENDING).length,
  total: operations.value.length,
}))
const operationSummary = computed(() => {
  const key = result.value === SYNC_RESULT.FAILED
    ? 'result.failed.operationSummary'
    : 'result.cancelled.message'
  return t(key, operationCounts.value)
})

const showOperationDetail = ref(false)

function getOperationResultType(operation) {
  if (operation.status === SYNC_OPERATION_STATUS.SYNCED)
    return 'success'
  if (operation.status === SYNC_OPERATION_STATUS.FAILED)
    return 'error'
  return 'warning'
}

function getOperationFailureReason(operation) {
  if (operation.failure?.code) {
    const key = `operationFailures.${operation.failure.code}`
    if (te(key))
      return t(key, operation.failure.meta || {})
  }

  if (operation.failure?.message)
    return operation.failure.message

  return operation.status === SYNC_OPERATION_STATUS.FAILED
    ? t('operationStatuses.failed')
    : ''
}

// failed
const errorMessages = computed(() => {
  if (result.value === SYNC_RESULT.FAILED) {
    const sessionResult = state.value?.sessionResult

    const error = sessionResult?.error || {}
    const key = `errors.${error.code}`
    const errorString = error.code && te(key)
      ? t(key, error.meta || {})
      : error.message || t('result.failed.message')

    const lines = errorString.split(/\r?\n/)
      .filter(line => line.trim() !== '')

    return lines
  }
  return []
})

function openLogFolder() {
  window.syncSession.openLogFolder()
}
</script>

<template>
  <div
    class="final-ackownledgement-stage"
    :class="{ 'details-expanded': showOperationDetail && operations.length > 0 }"
  >
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
      <div
        v-if="result === SYNC_RESULT.CANCELLED || result === SYNC_RESULT.FAILED"
        class="h-full min-h-0 flex flex-col gap-2 items-center"
      >
        <div
          v-if="result === SYNC_RESULT.FAILED"
          class="shrink-0 flex flex-col gap-1 break-all"
        >
          <p v-for="(msg, index) in errorMessages" :key="index">
            {{ msg }}
          </p>
        </div>
        <p v-if="result === SYNC_RESULT.CANCELLED || operations.length > 0">
          <span>{{ operationSummary }}</span>
          <button class="underline cursor-pointer" type="button" @click="showOperationDetail = !showOperationDetail">
            [{{ $t(`result.${result}.detailButton`) }}]
          </button>
        </p>

        <Transition name="operation-list-reveal">
          <div
            v-if="showOperationDetail && operations.length > 0"
            class="operation-list w-full min-h-0 flex-1 overflow-y-auto
            [scrollbar-gutter:stable]
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:invisible
            [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--text-subtle)_20%,transparent)]
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:invisible
            hover:[&::-webkit-scrollbar-thumb]:visible
            rounded-md border border-(--border-accent-fade) bg-[color-mix(in_srgb,var(--surface-elevated)_55%,transparent)]"
          >
            <HoverTooltip
              v-for="(op, index) in operations"
              :key="index"
              class="grid min-w-0 grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_0.75rem] items-center gap-2 rounded px-2 py-0.5 text-[0.6rem] leading-4 text-(--text-subtle) hover:bg-[color-mix(in_srgb,var(--primary-soft)_55%,transparent)]"
              :text="getOperationFailureReason(op)"
              :max-width="320"
            >
              <template #tooltip>
                <span class="block text-(--text-primary)">{{ op.path }}</span>
                <span class="mt-1 block text-(--danger)">{{ getOperationFailureReason(op) }}</span>
              </template>
              <HoverTooltip
                class="allow-select min-w-0 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                :text="getOperationFailureReason(op) ? '' : op.path"
                :only-when-overflow="true"
                :max-width="320"
              >
                {{ op.path }}
              </HoverTooltip>
              <span class="text-right">{{ op.type }}</span>
              <span class="text-right">{{ $t(`operationStatuses.${op.status}`) }}</span>
              <ResultIcon :type="getOperationResultType(op)" class="size-3" />
            </HoverTooltip>
          </div>
        </Transition>

        <p v-if="result === SYNC_RESULT.FAILED" class="shrink-0">
          {{ $t('result.failed.logFolderHint') }}
          <button class="underline cursor-pointer ml-0.5" type="button" @click="openLogFolder">
            {{ $t('result.failed.openLogFolder') }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.final-ackownledgement-stage{
  @apply h-full grid px-12 py-4;
  grid-template-rows: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 3fr);
  transition: grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.icon-dock{
  @apply self-end flex justify-center items-center;
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
  @apply min-h-0 py-2 whitespace-pre-line text-xs text-(--text-subtle);
}

.final-ackownledgement-stage.details-expanded{
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 4fr);
}

.operation-list-reveal-enter-active,
.operation-list-reveal-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.operation-list-reveal-enter-from,
.operation-list-reveal-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .final-ackownledgement-stage,
  .operation-list-reveal-enter-active,
  .operation-list-reveal-leave-active {
    transition: none;
  }
}
</style>
