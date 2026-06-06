<script setup>
import ActionBar from './components/main/ActionBar.vue'
import SideBar from './components/main/Sidebar.vue'
import WorkSpace from './components/main/WorkSpace.vue'
</script>

<template>
  <div class="flex flex-row h-dvh min-h-0 overflow-hidden bg-(--surface-muted)">
    <aside class="sidebar-dock h-full flex-1">
      <SideBar />
    </aside>
    <main class="main-dock h-full flex-3 min-w-0">
      <div class="main-stage h-full px-(--main-stage-px) py-(--main-stage-py) flex flex-col gap-5">
        <div class="action-dock">
          <ActionBar />
        </div>
        <div class="task-list-dock flex-1">
          <WorkSpace />
        </div>
      </div>
    </main>
  </div>
</template>
