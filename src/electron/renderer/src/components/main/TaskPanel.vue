<script setup>
import { onMounted, ref, shallowRef } from 'vue'
import ActionBar from './ActionBar.vue'
import ServerItem from './ServerItem.vue'
import TaskItem from './TaskItem.vue'

const remoteServers = ref([
  {
    name: 'synology',
    url: 'http://nas.agalloch21.com:5005',
    type: 'webdav',
  },
  {
    name: 'synology-ftp',
    host: 'nas.agalloch21.com',
    type: 'ftp',
  },
  {
    name: 'synology-sftp',
    host: 'nas.agalloch21.com',
    type: 'sftp',
  },
  {
    name: 'fake-remote',
    type: 'alias',
    remote: '/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/test/fixtures/fake-remote',
  },
])

const syncTasks = ref([
  {
    name: 'ProjectsSyncedProjectsSyncedProjectsSyncedProjectsSyncedProjectsSynced',
    rcloneRemote: 'synology-sftp',
    localBasePath: '/Users/xiaobo/NAS/ProjectsSynced',
    remoteBasePath: 'ProjectsSynced',
    ignorePatterns: [],
  },
  {
    name: 'Folder-B',
    rcloneRemote: 'synology-sftp',
    localBasePath: '/Users/xiaobo/NAS/Folder-B',
    remoteBasePath: 'ProjectsSynced/Folder-B',
    ignorePatterns: [],
  },
  {
    name: 'fake-remotefake-remotefake-remotefake-remotefake-remotefake-remote',
    rcloneRemote: 'fake-remote',
    localBasePath: '/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/test/fixtures/local',
    remoteBasePath: '',
    ignorePatterns: [],
  },
])

const selectedServer = shallowRef(null)
const selectedTask = shallowRef(null)

onMounted(() => {
  remoteServers.value.forEach((server) => {
    server.tasks = syncTasks.value?.filter(task => task.rcloneRemote === server.name)
  })

  if (remoteServers.value && remoteServers.value.length > 0)
    onSelectServer(remoteServers.value?.[0])
})

function onSelectServer(server) {
  selectedServer.value = server
  selectedTask.value = null
}
function onSelectTask(server, task) {
  selectedServer.value = server
  selectedTask.value = task
}

function openTaskModal(action) {
  window.mainPanel?.openTaskModal?.(action)
}
</script>

<template>
  <div class="task-panel-stage h-full flex flex-col gap-5">
    <div class="action-dock">
      <ActionBar
        :is-server-selected="selectedServer !== null" :is-task-selected="selectedTask !== null"
        @open-task-modal="openTaskModal"
      />
    </div>
    <div class="task-list-dock min-h-0 flex-1 border-t border-(--surface-soft)">
      <div class="task-list-stage h-full overflow-x-auto overflow-y-auto scrollbar-gutter-stable divide-y divide-(--surface-soft)">
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
