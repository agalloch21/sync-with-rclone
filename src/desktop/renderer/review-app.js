import { computed, createApp, defineComponent, onMounted, reactive, ref } from '../../../node_modules/vue/dist/vue.esm-browser.js'

function formatBytes(bytes) {
  if (!bytes)
    return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function visitTree(nodes, visit) {
  for (const node of nodes) {
    visit(node)
    if (node.children)
      visitTree(node.children, visit)
  }
}

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: {
      type: Object,
      required: true,
    },
    selection: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    function setNodeSelection(node, checked) {
      props.selection[node.path] = checked
      if (node.children) {
        for (const child of node.children)
          setNodeSelection(child, checked)
      }
    }

    function onToggle(event) {
      setNodeSelection(props.node, event.target.checked)
    }

    return {
      formatBytes,
      onToggle,
    }
  },
  template: `
    <li class="tree-item">
      <details v-if="node.type === 'directory'" open>
        <summary class="row">
          <label class="node-toggle">
            <input type="checkbox" :checked="selection[node.path]" @change="onToggle">
            <span class="name">{{ node.name }}/</span>
          </label>
          <span class="folder-badges">
            <span v-if="node.changes.modified" class="folder-badge">modified {{ node.changes.modified }}</span>
            <span v-if="node.changes.added" class="folder-badge">added {{ node.changes.added }}</span>
            <span v-if="node.changes.deleted" class="folder-badge">deleted {{ node.changes.deleted }}</span>
          </span>
        </summary>
        <ul class="tree-list">
          <TreeNode
            v-for="child in node.children"
            :key="child.path"
            :node="child"
            :selection="selection"
          />
        </ul>
      </details>
      <label v-else class="row node-toggle">
        <input type="checkbox" :checked="selection[node.path]" @change="onToggle">
        <span class="name">{{ node.name }}</span>
        <span class="state" :class="node.state">{{ node.state }}</span>
        <span class="meta">{{ formatBytes(node.size) }}</span>
      </label>
    </li>
  `,
})

createApp({
  components: {
    TreeNode,
  },
  setup() {
    const payload = ref(null)
    const selection = reactive({})
    const selectedCount = computed(() => Object.values(selection).filter(Boolean).length)

    function initializeSelection(tree) {
      visitTree(tree, (node) => {
        selection[node.path] = true
      })
    }

    async function confirm() {
      const selectedPaths = Object.entries(selection)
        .filter(([, checked]) => checked)
        .map(([entryPath]) => entryPath)

      await window.syncReview.submit({
        action: 'confirm',
        selectedPaths,
      })
    }

    async function cancel() {
      await window.syncReview.cancel()
    }

    onMounted(async () => {
      payload.value = await window.syncReview.getPayload()
      initializeSelection(payload.value.tree)
    })

    return {
      cancel,
      confirm,
      payload,
      selectedCount,
      selection,
    }
  },
  template: `
    <div v-if="payload" class="layout">
      <div class="header">
        <h1 class="title">Review Sync Differences</h1>
        <div class="roots">Source: {{ payload.srcRoot }}<br>Destination: {{ payload.dstRoot }}</div>
        <div class="summary">
          <span class="pill modified">Modified {{ payload.summary.modified }}</span>
          <span class="pill added">Added {{ payload.summary.added }}</span>
          <span class="pill deleted">Deleted {{ payload.summary.deleted }}</span>
        </div>
      </div>
      <div class="content">
        <div v-if="payload.tree.length === 0" class="empty">No differences found.</div>
        <ul v-else class="tree-list root">
          <TreeNode
            v-for="node in payload.tree"
            :key="node.path"
            :node="node"
            :selection="selection"
          />
        </ul>
      </div>
      <div class="footer">
        <div class="selection">{{ selectedCount }} item(s) selected</div>
        <div class="actions">
          <button class="button" @click="cancel">Cancel</button>
          <button class="button primary" @click="confirm">Confirm</button>
        </div>
      </div>
    </div>
  `,
}).mount('#app')
