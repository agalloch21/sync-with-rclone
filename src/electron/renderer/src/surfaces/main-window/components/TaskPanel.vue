<script setup>
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import { unwrapResult } from '#src/app/operation-result.js'
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw } from 'vue'
import { useMessageBox } from '../../../composables/useMessageBox.js'
import { useServerOperations } from '../../../composables/useServerOperations.js'
import { useTaskOperations } from '../../../composables/useTaskOperations.js'
import ActionBar from './ActionBar.vue'
import ServerItem from './ServerItem.vue'
import TaskItem from './TaskItem.vue'

const messageBox = useMessageBox(window?.mainWindow)
const serverOperations = useServerOperations(window?.mainWindow)
const taskOperations = useTaskOperations(window?.mainWindow)

const servers = ref([])
const syncTasks = ref([])
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

let unsubscribeConfigUpdated = null

onMounted(async () => {
  const result = await window.mainWindow?.getMainWindowData?.()
  applyMainWindowData(result)

  unsubscribeConfigUpdated = window.mainWindow?.onConfigUpdated?.((result) => {
    applyMainWindowData(result)
  })
})

onUnmounted(() => {
  unsubscribeConfigUpdated?.()
})

function applyMainWindowData(result) {
  if (!result?.success) {
    servers.value = []
    syncTasks.value = []
    showTaskPanelLoadError(result?.error)
    return
  }

  const payload = unwrapResult(result)
  servers.value = payload?.servers || []
  syncTasks.value = payload?.syncTasks || []

  updateTaskPanelSelection()
}

function getSyncTasksByServer(serverName) {
  return tasksByServerName.value.get(serverName) || []
}

function updateTaskPanelSelection() {
  const previousSyncTask = selectedSyncTask.value
  const previousServer = selectedServer.value
  const nextServer = servers.value.find(server => server.name === previousServer?.name) || servers.value?.[0] || null
  const nextSyncTask = previousSyncTask && nextServer
    ? getSyncTasksByServer(nextServer.name).find(syncTask => syncTask.localBasePath === previousSyncTask.localBasePath)
    : null

  selectedServer.value = nextServer
  selectedSyncTask.value = nextSyncTask || null
}

function showTaskPanelLoadError(error) {
  messageBox.showErrorMessage({
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

async function openSyncTaskModal(modalName) {
  if (modalName === SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER) {
    await serverOperations.deleteServer(selectedServer.value.name)
    return
  }

  if (modalName === SYNC_TASK_MODALS.CONFIRM_DELETE_TASK) {
    await taskOperations.deleteSyncTask(selectedSyncTask.value)
    return
  }

  window.mainWindow?.openSyncTaskModal?.(modalName, {
    selectedServer: createSerializableServer(selectedServer.value),
    selectedSyncTask: createSerializableSyncTask(selectedSyncTask.value),
    // selectedServerName: selectedServer.value?.name || null
    // selectedSyncTaskPath: selectedSyncTask..value?.name
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
          v-for="server in servers" :key="server.name" :server="server" :selected="server === selectedServer && selectedSyncTask === null"
          @click.prevent="onSelectServer(server)"
        >
          <TaskItem
            v-for="syncTask in getSyncTasksByServer(server.name)" :key="syncTask.localBasePath" :sync-task="syncTask" :selected="server === selectedServer && syncTask === selectedSyncTask"
            @click.stop="onSelectTask(server, syncTask)"
          />
        </ServerItem>
      </div>
    </div>
  </div>
</template>
