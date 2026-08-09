<script setup>
import { shallowRef } from 'vue'

import LogPanel from './components/LogPanel.vue'
import MappingsPanel from './components/MappingsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import SideBar from './components/Sidebar.vue'

const panels = [
  {
    name: 'mappings',
    component: MappingsPanel,
    icon: 'icon-[custom--nav-mappings]',
  },
  {
    name: 'logs',
    component: LogPanel,
    icon: 'icon-[custom--nav-logs]',
  },
  {
    name: 'settings',
    component: SettingsPanel,
    icon: 'icon-[custom--nav-settings]',
  },
]

const selectedPanel = shallowRef(panels[0])

function onSelectPanel(panel) {
  selectedPanel.value = panel
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
        :is="selectedPanel.component"
        v-if="selectedPanel"
        :key="selectedPanel.name"
      />
    </main>
  </div>
</template>
