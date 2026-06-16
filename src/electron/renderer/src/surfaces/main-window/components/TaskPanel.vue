<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import ActionBar from './ActionBar.vue'
import ServerItem from './ServerItem.vue'
import TaskItem from './TaskItem.vue'

const remoteServers = ref([
])
const errorMessage = ref('')

const selectedServer = shallowRef(null)
const selectedTask = shallowRef(null)

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
    errorMessage.value = result?.error || 'Failed to load sync tasks.'
    remoteServers.value = []
    return
  }

  const syncTasks = result.model?.syncTasks || []
  remoteServers.value = (result.model?.servers || []).map(server => ({
    ...server,
    tasks: syncTasks.filter(task => task.rcloneRemote === server.name),
  }))
  const previousTask = selectedTask.value
  const previousServer = selectedServer.value
  const nextServer = remoteServers.value.find(server => server.name === previousServer?.name) || remoteServers.value?.[0] || null
  const nextTask = previousTask && nextServer
    ? nextServer.tasks.find(task => task.name === previousTask.name && task.localBasePath === previousTask.localBasePath)
    : null

  selectedServer.value = nextServer
  selectedTask.value = nextTask || null
}

function onSelectServer(server) {
  selectedServer.value = server
  selectedTask.value = null
}
function onSelectTask(server, task) {
  selectedServer.value = server
  selectedTask.value = task
}

function openSyncTaskModal(modalName) {
  window.mainWindow?.openSyncTaskModal?.(modalName, {
    server: selectedServer.value,
    task: selectedTask.value,
  })
}
</script>

<template>
  <div class="task-panel-stage h-full flex flex-col gap-5">
    <div class="action-dock">
      <ActionBar
        :is-server-selected="selectedServer !== null" :is-task-selected="selectedTask !== null"
        @open-sync-task-modal="openSyncTaskModal"
      />
    </div>
    <div class="task-list-dock min-h-0 flex-1 border-t border-(--surface-soft)">
      <div class="task-list-stage h-full overflow-x-auto overflow-y-auto scrollbar-gutter-stable divide-y divide-(--surface-soft)">
        <p v-if="errorMessage" class="px-4 py-3 text-sm text-red-600">
          {{ errorMessage }}
        </p>
        <ServerItem
          v-for="server in remoteServers" :key="server.name" :server="server" :selected="server === selectedServer && selectedTask === null"
          @click.prevent="onSelectServer(server)"
        >
          <TaskItem
            v-for="task in server.tasks" :key="task.name" :task="task" :selected="server === selectedServer && task === selectedTask"
            @click.stop="onSelectTask(server, task)"
          />
        </ServerItem>
      </div>
    </div>
  </div>
</template>
