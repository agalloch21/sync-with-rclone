<script setup>
import { onMounted, ref } from 'vue'
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
    name: 'fake-remotefake-remotefake-remotefake-remotefake-remotefake-remote',
    rcloneRemote: 'fake-remote',
    localBasePath: '/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/test/fixtures/local',
    remoteBasePath: '',
    ignorePatterns: [],
  },
])

onMounted(() => {
  remoteServers.value.forEach((server) => {
    server.tasks = syncTasks.value?.filter(task => task.rcloneRemote === server.name)
  })
})
</script>

<template>
  <div class="task-list-stage h-full overflow-x-auto overflow-y-hidden scrollbar-gutter-stable">
    <ServerItem v-for="server in remoteServers" :key="server.name" :server="server">
      <TaskItem v-for="task in server.tasks" :key="task.name" :task="task" />
    </ServerItem>
  </div>
</template>
