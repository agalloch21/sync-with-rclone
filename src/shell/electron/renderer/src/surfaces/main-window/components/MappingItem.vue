<script setup>
const props = defineProps({
  mapping: {
    type: Object,
  },
  selected: {
    type: Boolean,
  },
})

function getBaseName(filePath = '') {
  return filePath.replaceAll('\\', '/').split('/').filter(Boolean).at(-1) || filePath
}

function getMappingDisplayName(mapping) {
  return mapping?.displayName || getBaseName(mapping?.localBasePath || '') || mapping?.localBasePath || ''
}

function formatLastSyncDate(value) {
  if (!value)
    return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value

  const pad = part => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function openLocalFolder() {
  const localFolderPath = props.mapping?.localBasePath
  if (localFolderPath)
    return window.mainWindow?.openLocalFolder?.(localFolderPath)
}
</script>

<template>
  <div class="mapping-item-dock py-0.5 cursor-default">
    <div
      class="mapping-item-stage h-full px-(--server-row-px) py-(--server-row-py) rounded-lg flex gap-(--server-row-gap) items-start py-4"
      :class="{ 'mapping-item-selected': selected }"
    >
      <div class="mapping-base-info min-w-44 flex-1 flex gap-(--server-row-gap)">
        <span class="icon-[lucide--folder-closed] size-(--server-icon-size) shrink-0 mt-0.5 text-(--primary) self-start" />
        <div class="mapping-local-info flex flex-col gap-0.5">
          <label class="local-folder-name h-lh text-sm font-semibold text-(--text-primary) break-all line-clamp-1">
            {{ getMappingDisplayName(props.mapping) }}
          </label>
          <button
            class="local-folder-path text-left h-[2lh] text-[0.625rem] leading-3 underline text-blue-500 break-all line-clamp-2 cursor-pointer inline-flex items-start"
            type="button"
            @click.stop="openLocalFolder"
          >
            {{ props.mapping?.localBasePath }}
          </button>
        </div>
      </div>
      <dl class="mapping-extra-info min-w-64 flex-1 pl-4 flex flex-col text-[0.6rem] text-(--text-subtle) gap-0.5">
        <div class="extra-info-row">
          <dt class="extra-info-property">
            <span class="extra-info-icon icon-[lucide--link] " />
            <span class="extra-info-label">{{ $t('mappingsPanel.mappingItem.mappedTo') }}:</span>
          </dt>
          <dd class="break-all line-clamp-2">
            {{ props.mapping?.remoteBasePath }}
          </dd>
        </div>
        <div class="extra-info-row">
          <dt class="extra-info-property">
            <span class="icon-[lucide--folder-clock] extra-info-icon" />
            <span class="extra-info-label">{{ $t('mappingsPanel.mappingItem.lastSync') }}:</span>
          </dt>
          <dd class="flex flex-col">
            <p class="break-all line-clamp-1">
              {{ props.mapping?.lastSyncMode || '-' }} | {{ formatLastSyncDate(props.mapping?.lastSyncDate) }}
            </p>
            <p class="break-all line-clamp-1">
              {{ props.mapping?.lastSyncFolder || '-' }}
            </p>
          </dd>
        </div>
      </dl>
    <!-- <div class="mapping-extra-info flex-2 pl-8 grid grid-cols-[max-content_max-content_1fr] grid-rows-4 items-center text-[0.6rem] text-(--text-subtle) gap-x-1">
      <span class="row-start-1 col-start-1 icon-[lucide--link] w-3 h-3" />
      <span class="row-start-1 col-start-2 font-bold">Mapped to:</span>
      <label class="row-start-1 row-end-3 col-start-3 remote-folder-path break-all line-clamp-2">{{ props.mapping?.remoteBasePath }}ProjectsSyncedProjectsSyncedProjectsSyncedProjectsSynced</label>

      <span class="row-start-3 col-start-1 icon-[lucide--folder-clock] w-3 h-3" />
      <span class="row-start-3 col-start-2 font-bold">Last Sync:</span>
      <span class="row-start-3 col-start-3 remote-folder-path break-all line-clamp-1">Push | 2026-06-07 23:32:38</span>
      <p class="row-start-4 col-start-3">
        ./subfolder
      </p>
    </div> -->
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.extra-info-row{
    @apply flex items-start gap-1;
}
.extra-info-property{
    @apply flex items-center gap-1;
}
.extra-info-icon{
    @apply w-3 h-3 shrink-0 content-center;
}
.extra-info-label{
    @apply text-nowrap shrink-0 bg-(--surface-soft) rounded-xl px-1  content-center;
}
.mapping-item-selected{
    @apply bg-(--surface-soft);
}
</style>
