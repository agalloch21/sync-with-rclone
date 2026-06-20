<script setup>
import { showErrorMessage } from '#src/electron/renderer/src/shared/message-box.js'
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw } from 'vue'
import ActionBar from './ActionBar.vue'
import ServerItem from './ServerItem.vue'
import TaskItem from './TaskItem.vue'

const remoteServers = ref([
])
const syncTasks = ref([
])
const tasksByServerName = computed(() => {
  const groupedTasks = new Map()
  for (const syncTask of syncTasks.value) {
    const serverTasks = groupedTasks.get(syncTask.rcloneRemote) || []
    serverTasks.push(syncTask)
    groupedTasks.set(syncTask.rcloneRemote, serverTasks)
  }
  return groupedTasks
})

const selectedServer = shallowRef(null)
const selectedSyncTask = shallowRef(null)

onMounted(loadTaskPanel)

let unsubscribeAppModelUpdated = null

onMounted(() => {
  unsubscribeAppModelUpdated = window.mainWindow?.onAppModelUpdated?.((result) => {
    applyAppModelResult(result)
  })
})

onUnmounted(() => {
  unsubscribeAppModelUpdated?.()
})

async function loadTaskPanel() {
  const result = await window.mainWindow?.getAppModel?.()
  applyAppModelResult(result)
}

function applyAppModelResult(result) {
  if (!result?.success) {
    remoteServers.value = []
    syncTasks.value = []
    showTaskPanelLoadError(result?.error)
    return
  }

  remoteServers.value = result.model?.servers || []
  syncTasks.value = result.model?.syncTasks || []
  updateTaskPanelSelection()
}

function getServerSyncTasks(serverName) {
  return tasksByServerName.value.get(serverName) || []
}

function updateTaskPanelSelection() {
  const previousSyncTask = selectedSyncTask.value
  const previousServer = selectedServer.value
  const nextServer = remoteServers.value.find(server => server.name === previousServer?.name) || remoteServers.value?.[0] || null
  const nextSyncTask = previousSyncTask && nextServer
    ? getServerSyncTasks(nextServer.name).find(syncTask => syncTask.localBasePath === previousSyncTask.localBasePath)
    : null

  selectedServer.value = nextServer
  selectedSyncTask.value = nextSyncTask || null
}

function showTaskPanelLoadError(error) {
  showErrorMessage({
    title: 'Load Failed',
    message: 'Could not load sync tasks.',
    detail: error || 'Failed to load sync tasks.',
  })
}

function onSelectServer(server) {
  selectedServer.value = server
  selectedSyncTask.value = null
}
function onSelectTask(server, syncTask) {
  selectedServer.value = server
  selectedSyncTask.value = syncTask
}

function createSerializableServer(server) {
  const rawServer = toRaw(server)
  if (!rawServer)
    return null

  return structuredClone(rawServer)
}

function createSerializableSyncTask(syncTask) {
  const rawSyncTask = toRaw(syncTask)
  return rawSyncTask ? structuredClone(rawSyncTask) : null
}

function openSyncTaskModal(modalName) {
  window.mainWindow?.openSyncTaskModal?.(modalName, {
    server: createSerializableServer(selectedServer.value),
    syncTask: createSerializableSyncTask(selectedSyncTask.value),
  })
}
</script>

<template>
  <div class="task-panel-stage h-full flex flex-col gap-5">
    <div class="action-dock">
      <ActionBar
        :is-server-selected="selectedServer !== null" :is-task-selected="selectedSyncTask !== null"
        @open-sync-task-modal="openSyncTaskModal"
      />
    </div>
    <div class="task-list-dock min-h-0 flex-1 border-t border-(--surface-soft)">
      <div class="task-list-stage h-full overflow-x-auto overflow-y-auto scrollbar-gutter-stable divide-y divide-(--surface-soft)">
        <ServerItem
          v-for="server in remoteServers" :key="server.name" :server="server" :selected="server === selectedServer && selectedSyncTask === null"
          @click.prevent="onSelectServer(server)"
        >
          <TaskItem
            v-for="syncTask in getServerSyncTasks(server.name)" :key="syncTask.localBasePath" :sync-task="syncTask" :selected="server === selectedServer && syncTask === selectedSyncTask"
            @click.stop="onSelectTask(server, syncTask)"
          />
        </ServerItem>
      </div>
    </div>
  </div>
</template>
