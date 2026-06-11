<script setup>
import { ref, shallowRef } from 'vue'

import LogPanel from './components/LogPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import SideBar from './components/Sidebar.vue'
import TaskPanel from './components/TaskPanel.vue'

const panels = [
  {
    name: 'syncTasks',
    component: TaskPanel,
  },
  {
    name: 'logs',
    component: LogPanel,
  },
  {
    name: 'settings',
    component: SettingsPanel,
  },
]

const selectedPanel = ref(panels[0].name)

function onSelectPanel(panelName) {
  selectedPanel.value = panels.find(p => p.name === panelName)?.name || ''
}
</script>

<template>
  <div class="flex flex-row h-dvh min-h-0 overflow-hidden bg-(--surface-muted)">
    <aside class="sidebar-dock h-full flex-1">
      <SideBar
        :panels="panels"
        :selected-panel="selectedPanel"
        @on-select-panel="onSelectPanel"
      />
    </aside>
    <main class="main-dock h-full flex-3 min-w-0 px-(--main-stage-px) py-(--main-stage-py) justify-stretch items-stretch">
      <component
        :is="panel.component"
        v-for="(panel, index) in panels"
        v-show="panel.name === selectedPanel"
        :key="index"
      />
    </main>
  </div>
</template>
