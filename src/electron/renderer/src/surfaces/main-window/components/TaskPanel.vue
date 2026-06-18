<script setup>
import { onMounted, onUnmounted, ref, shallowRef, toRaw } from 'vue'
import ActionBar from './ActionBar.vue'
import ServerItem from './ServerItem.vue'
import TaskItem from './TaskItem.vue'

const remoteServers = ref([
])
const errorMessage = ref('')

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
  console.log(result)
  applyAppModelResult(result)
}

function applyAppModelResult(result) {
  if (!result?.success) {
    errorMessage.value = result?.error || 'Failed to load sync tasks.'
    remoteServers.value = []
    return
  }

  const syncTasks = result.model?.syncTasks || []
  remoteServers.value = (result.model?.servers || []).map(server => ({
    ...server,
    tasks: syncTasks.filter(task => task.rcloneRemote === server.name),
  }))
  const previousSyncTask = selectedSyncTask.value
  const previousServer = selectedServer.value
  const nextServer = remoteServers.value.find(server => server.name === previousServer?.name) || remoteServers.value?.[0] || null
  const nextSyncTask = previousSyncTask && nextServer
    ? nextServer.tasks.find(syncTask => syncTask.localBasePath === previousSyncTask.localBasePath)
    : null

  selectedServer.value = nextServer
  selectedSyncTask.value = nextSyncTask || null
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

  const { tasks: _tasks, ...serverContext } = rawServer
  return structuredClone(serverContext)
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
        <p v-if="errorMessage" class="px-4 py-3 text-sm text-red-600">
          {{ errorMessage }}
        </p>
        <ServerItem
          v-for="server in remoteServers" :key="server.name" :server="server" :selected="server === selectedServer && selectedSyncTask === null"
          @click.prevent="onSelectServer(server)"
        >
          <TaskItem
            v-for="syncTask in server.tasks" :key="syncTask.localBasePath" :sync-task="syncTask" :selected="server === selectedServer && syncTask === selectedSyncTask"
            @click.stop="onSelectTask(server, syncTask)"
          />
        </ServerItem>
      </div>
    </div>
  </div>
</template>
