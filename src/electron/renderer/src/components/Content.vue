<script setup>
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed, reactive } from 'vue'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  state: Object,
})

const step = computed(() => props.state?.step?.length > 0 ? props.state.step : '')

const selection = reactive({})
</script>

<template>
  <Transition>
    <div v-if="step === STEPS.ANALYZE">
      Preparation
    </div>
    <div v-else-if="step === STEPS.REVIEW">
      <div class="tree-dock min-h-0 flex-1 overflow-auto">
        <div class="tree-stage">
          <div v-if="state?.review?.tree.length === 0" class="empty">
            No differences found.
          </div>

          <ul v-else class="tree-list root">
            <TreeNode
              v-for="node in state.review.tree"
              :key="node.path"
              :node="node"
              :selection="selection"
            />
          </ul>
        </div>
      </div>
    </div>
    <div v-else-if="step === STEPS.SYNC">
      SYNC
    </div>
    <div v-else>
      Default
    </div>
  </Transition>
</template>
