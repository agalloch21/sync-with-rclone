<script setup>
import { unwrapResult } from '#src/app/operation-result.js'
import { onMounted, onUnmounted, ref } from 'vue'

const records = ref([])
const isLoading = ref(false)
const loadError = ref('')
let unsubscribeHistoryUpdated = null

function applyRecord(record) {
  if (!record?.eventId || records.value.some(item => item.eventId === record.eventId))
    return

  records.value = [record, ...records.value].slice(0, 200)
}

async function loadHistory() {
  if (isLoading.value)
    return

  isLoading.value = true
  loadError.value = ''
  try {
    const result = await window.mainWindow?.getOperationHistory?.({ limit: 200 })
    if (!result?.success) {
      loadError.value = result?.error?.message || 'Unable to load operation history.'
      return
    }

    records.value = unwrapResult(result) || []
  }
  catch (error) {
    loadError.value = error?.message || 'Unable to load operation history.'
  }
  finally {
    isLoading.value = false
  }
}

function formatTimestamp(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value

  return new Intl.DateTimeFormat(globalThis.navigator?.language || 'en', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date)
}

function subjectLabel(subject = {}) {
  if (subject.type === 'server')
    return subject.name

  if (subject.type === 'mapping')
    return [subject.rcloneRemote, subject.localBasePath].filter(Boolean).join(' · ')

  if (subject.type === 'sync')
    return [subject.localFolderPath, subject.remoteFolderPath].filter(Boolean).join(' → ')

  if (subject.type === 'settings')
    return subject.name

  return ''
}

onMounted(async () => {
  await loadHistory()
  unsubscribeHistoryUpdated = window.mainWindow?.onOperationHistoryUpdated?.(applyRecord)
})

onUnmounted(() => {
  unsubscribeHistoryUpdated?.()
})
</script>

<template>
  <section class="log-panel-stage w-full h-full min-h-0 pr-4 pb-4 flex flex-col text-(--text-primary)">
    <header class="h-10 shrink-0 flex items-center justify-between border-b border-(--surface-soft)">
      <h1 class="text-base font-bold">
        {{ $t('logPanel.title') }}
      </h1>
      <button
        class="clickable focusable rounded px-3 py-1 text-xs text-(--primary)"
        type="button"
        :disabled="isLoading"
        @click="loadHistory"
      >
        {{ $t('logPanel.refresh') }}
      </button>
    </header>

    <div v-if="loadError" class="mt-3 rounded border border-(--danger) p-3 text-xs text-(--danger)">
      {{ loadError }}
    </div>

    <div v-else-if="isLoading && records.length === 0" class="flex-1 grid place-items-center text-sm text-(--text-subtle)">
      {{ $t('logPanel.loading') }}
    </div>

    <div v-else-if="records.length === 0" class="flex-1 grid place-items-center text-sm text-(--text-subtle)">
      {{ $t('logPanel.empty') }}
    </div>

    <ol
      v-else class="min-h-0 flex-1 overflow-y-auto py-3 space-y-2
      [scrollbar-gutter:stable]
      [&::-webkit-scrollbar]:w-1
      [&::-webkit-scrollbar-track]:invisible
      [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--text-subtle)_20%,transparent)]
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:invisible
      hover:[&::-webkit-scrollbar-thumb]:visible"
    >
      <li
        v-for="record in records"
        :key="record.eventId"
        class="rounded-lg border border-(--surface-soft) bg-(--surface-elevated) px-4 py-3 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            :class="{
              'bg-(--primary)': record.status === 'started',
              'bg-(--success)': record.status === 'succeeded',
              'bg-(--danger)': record.status === 'failed',
              'bg-(--warning)': record.status === 'cancelled',
            }"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p class="text-sm font-semibold">
                {{ $t(`logPanel.operations.${record.operation}`) }}
              </p>
              <time class="text-[11px] text-(--text-subtle)">
                {{ formatTimestamp(record.occurredAt) }}
              </time>
            </div>
            <p v-if="subjectLabel(record.subject)" class="mt-1 truncate text-xs text-(--text-subtle)">
              {{ subjectLabel(record.subject) }}
            </p>
            <p class="mt-1 text-xs" :class="record.status === 'failed' ? 'text-(--danger)' : 'text-(--text-subtle)'">
              {{ $t(`logPanel.status.${record.status}`) }}
              <span v-if="record.error?.message"> · {{ record.error.message }}</span>
            </p>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
