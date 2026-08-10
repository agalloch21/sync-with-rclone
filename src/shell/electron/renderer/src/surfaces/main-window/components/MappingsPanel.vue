<script setup>
import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'
import { unwrapResult } from '#src/app/operation-result.js'
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw } from 'vue'
import { useMappingOperations } from '../../../composables/useMappingOperations.js'
import { useServerOperations } from '../../../composables/useServerOperations.js'
import { MAIN_WINDOW_ACTION } from './ActionBar.presentation.js'
import ActionBar from './ActionBar.vue'
import ConfigurationLoadError from './ConfigurationLoadError.vue'
import MappingItem from './MappingItem.vue'
import ServerItem from './ServerItem.vue'

const FORM_VIEW_BY_ACTION = Object.freeze({
  [MAIN_WINDOW_ACTION.CREATE_MAPPING]: FORM_MODAL_VIEW.CHOOSE_SERVER,
  [MAIN_WINDOW_ACTION.EDIT_SERVER]: FORM_MODAL_VIEW.EDIT_SERVER,
  [MAIN_WINDOW_ACTION.EDIT_FOLDER_MAPPING]: FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING,
  [MAIN_WINDOW_ACTION.EDIT_PATTERNS]: FORM_MODAL_VIEW.EDIT_PATTERNS,
})

const serverOperations = useServerOperations(window?.mainWindow)
const mappingOperations = useMappingOperations(window?.mainWindow)

const servers = ref([])
const mappings = ref([])
const isLoading = ref(true)
const loadError = shallowRef(null)
const mappingsByServerName = computed(() => {
  const groupedMappings = new Map()
  for (const mapping of mappings.value) {
    const serverMappings = groupedMappings.get(mapping.rcloneRemote) || []
    serverMappings.push(mapping)
    groupedMappings.set(mapping.rcloneRemote, serverMappings)
  }
  return groupedMappings
})

const selectedServer = shallowRef(null)
const selectedMapping = shallowRef(null)
let unsubscribeConfigUpdated = null

onMounted(async () => {
  unsubscribeConfigUpdated = window.mainWindow?.onConfigUpdated?.(() => {
    void loadMainWindowData()
  })
  await loadMainWindowData()
})

onUnmounted(() => {
  unsubscribeConfigUpdated?.()
})

async function loadMainWindowData() {
  isLoading.value = true
  try {
    const result = await window.mainWindow?.getMainWindowData?.()
    applyMainWindowData(result)
  }
  finally {
    isLoading.value = false
  }
}

function applyMainWindowData(result) {
  if (!result?.success) {
    servers.value = []
    mappings.value = []
    loadError.value = result?.error || null
    updateMappingsPanelSelection()
    return
  }

  const payload = unwrapResult(result)
  servers.value = payload?.servers || []
  mappings.value = payload?.mappings || []
  loadError.value = null

  updateMappingsPanelSelection()
}

function getMappingsByServer(serverName) {
  return mappingsByServerName.value.get(serverName) || []
}

function updateMappingsPanelSelection() {
  const previousMapping = selectedMapping.value
  const previousServer = selectedServer.value
  const nextServer = servers.value.find(server => server.name === previousServer?.name) || servers.value?.[0] || null
  const nextMapping = previousMapping && nextServer
    ? getMappingsByServer(nextServer.name).find(mapping => mapping.localBasePath === previousMapping.localBasePath)
    : null

  selectedServer.value = nextServer
  selectedMapping.value = nextMapping || null
}

function onSelectServer(server) {
  selectedServer.value = server
  selectedMapping.value = null
}
function onSelectMapping(server, mapping) {
  selectedServer.value = server
  selectedMapping.value = mapping
}

function createSerializableServer(server) {
  const rawServer = toRaw(server)
  if (!rawServer)
    return null

  return structuredClone(rawServer)
}

function createSerializableMapping(mapping) {
  const rawMapping = toRaw(mapping)
  return rawMapping ? structuredClone(rawMapping) : null
}

async function handleAction(action) {
  if (isLoading.value || loadError.value)
    return

  if (action === MAIN_WINDOW_ACTION.DELETE_SERVER) {
    await serverOperations.deleteServer(selectedServer.value.name)
    return
  }

  if (action === MAIN_WINDOW_ACTION.DELETE_MAPPING) {
    await mappingOperations.deleteMapping(selectedMapping.value)
    return
  }

  const view = FORM_VIEW_BY_ACTION[action]
  if (!view)
    return

  window.mainWindow?.openFormModal?.(view, {
    selectedServer: createSerializableServer(selectedServer.value),
    selectedMapping: createSerializableMapping(selectedMapping.value),
  })
}
</script>

<template>
  <div class="mapping-panel-stage h-full flex flex-col gap-5">
    <div class="action-dock">
      <ActionBar
        :is-server-selected="selectedServer !== null && selectedServer.status !== 'missing'"
        :is-mapping-selected="selectedMapping !== null"
        :is-loading="isLoading"
        :configuration-unavailable="loadError !== null"
        @request-action="handleAction"
      />
    </div>
    <div class="mapping-list-dock min-h-0 flex-1 border-t border-(--surface-soft)">
      <div
        class="mapping-list-stage h-full overflow-x-auto overflow-y-auto divide-y divide-(--surface-soft)
        [&::-webkit-scrollbar]:w-1
        [&::-webkit-scrollbar-track]:invisible
        [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--text-subtle)_20%,transparent)]
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:invisible
        hover:[&::-webkit-scrollbar-thumb]:visible"
      >
        <ConfigurationLoadError v-if="loadError" :error="loadError" />
        <ServerItem
          v-for="server in servers" :key="server.name" :server="server" :selected="server === selectedServer && selectedMapping === null"
          :has-mappings="getMappingsByServer(server.name).length > 0"
          @click.prevent="onSelectServer(server)"
        >
          <MappingItem
            v-for="mapping in getMappingsByServer(server.name)" :key="mapping.localBasePath" :mapping="mapping" :selected="server === selectedServer && mapping === selectedMapping"
            @click.stop="onSelectMapping(server, mapping)"
          />
        </ServerItem>
      </div>
    </div>
  </div>
</template>
