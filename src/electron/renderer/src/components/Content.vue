<script setup>
import { STEPS } from '#src/electron/main/session-steps.js'
import { computed, reactive } from 'vue'
import ContentAnalyze from './ContentAnalyze.vue'
import ContentSync from './ContentSync.vue'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  state: Object,
})

const step = computed(() => props.state?.step?.length > 0 ? props.state.step : '')

const selection = reactive({})
</script>

<template>
  <Transition>
    <ContentAnalyze v-if="step === STEPS.ANALYZE" />
    <div v-else-if="step === STEPS.REVIEW">
      <div class="tree-dock min-h-0 flex-1 overflow-auto">
        <div class="tree-stage px-8 py-4">
          <div v-if="state?.review?.tree.length === 0" class="empty">
            No differences found.
          </div>

          <!-- tree-list root -->
          <ul v-else class="">
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
    <ContentSync v-else-if="step === STEPS.SYNC" />
    <div v-else>
      Default
    </div>
  </Transition>
</template>
