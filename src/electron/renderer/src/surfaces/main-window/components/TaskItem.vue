<script setup>
const props = defineProps({
  syncTask: {
    type: Object,
  },
  selected: {
    type: Boolean,
  },
})

function getBaseName(filePath = '') {
  return filePath.replaceAll('\\', '/').split('/').filter(Boolean).at(-1) || filePath
}

function getTaskDisplayName(syncTask) {
  return syncTask?.displayName || getBaseName(syncTask?.localBasePath || '') || syncTask?.localBasePath || ''
}
</script>

<template>
  <div class="task-item-dock h-20 py-0.5 cursor-default">
    <div
      class="task-item-stage h-full px-(--server-row-px) py-(--server-row-py) rounded-lg flex items-center gap-(--server-row-gap)"
      :class="{ 'task-item-selected': selected }"
    >
      <div class="task-icon flex justify-center items-center">
        <span class="icon-[lucide--folder-closed] w-(--server-icon-size) h-(--server-icon-size) text-(--primary)" />
      </div>
      <div class="task-base-info min-w-44 flex-1 flex flex-col gap-1">
        <label class="local-folder-name h-lh text-sm font-semibold text-(--text-primary) break-all line-clamp-1">
          {{ getTaskDisplayName(props.syncTask) }}
        </label>
        <div class="local-folder-path h-[2lh] text-[0.625rem] leading-3 underline text-blue-500 break-all line-clamp-2 cursor-pointer">
          {{ props.syncTask?.localBasePath }}
        </div>
      </div>
      <dl class="task-extra-info min-w-64 flex-1 pl-4 flex flex-col text-[0.6rem] text-(--text-subtle)">
        <div class="extra-info-row">
          <dt class="extra-info-property">
            <span class="extra-info-icon icon-[lucide--link] " />
            <span class="extra-info-label">{{ $t('syncTasks.task.extra.remoteFolderLabel') }}:</span>
          </dt>
          <dd class="break-all line-clamp-2">
            {{ props.syncTask?.rcloneRemote }}:{{ props.syncTask?.remoteBasePath }}
          </dd>
        </div>
        <div class="extra-info-row">
          <dt class="extra-info-property">
            <span class="icon-[lucide--folder-clock] extra-info-icon" />
            <span class="extra-info-label">{{ $t('syncTasks.task.extra.lastSyncLabel') }}:</span>
          </dt>
          <dd class="flex flex-col">
            <p class="break-all line-clamp-1">
              {{ props.syncTask?.lastSyncMode || '-' }} | {{ props.syncTask?.lastSyncDate || '-' }}
            </p>
            <p class="">
              {{ props.syncTask?.lastSyncFolder || '-' }}
            </p>
          </dd>
        </div>
      </dl>
    <!-- <div class="task-extra-info flex-2 pl-8 grid grid-cols-[max-content_max-content_1fr] grid-rows-4 items-center text-[0.6rem] text-(--text-subtle) gap-x-1">
      <span class="row-start-1 col-start-1 icon-[lucide--link] w-3 h-3" />
      <span class="row-start-1 col-start-2 font-bold">Mapped to:</span>
      <label class="row-start-1 row-end-3 col-start-3 remote-folder-path break-all line-clamp-2">{{ props.syncTask?.remoteBasePath }}ProjectsSyncedProjectsSyncedProjectsSyncedProjectsSynced</label>

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
    @apply w-3 h-3 shrink-0;
}
.extra-info-label{
    @apply font-bold text-nowrap shrink-0;
}
.task-item-selected{
    @apply bg-(--surface-soft);
}
</style>
