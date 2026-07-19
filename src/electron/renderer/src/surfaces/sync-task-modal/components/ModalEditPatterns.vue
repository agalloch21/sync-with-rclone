<script setup lang="ts">
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import { formatIgnorePatterns, parseIgnorePatterns, useTaskOperations } from '#src/electron/renderer/src/composables/useTaskOperations.js'
import { ref } from 'vue'
import Button from '../../shared/Button.vue'
import ModalShell from './ModalShell.vue'

const props = defineProps({
  context: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['onClickCancel', 'onClickConfirm'])
const taskOperations = useTaskOperations(window.syncTaskModal)

const taskPatternsText = ref(formatIgnorePatterns(props.context?.selectedSyncTask?.ignorePatterns))
const globalPatternsText = formatIgnorePatterns(props.context?.globalIgnorePatterns)
const isSubmitting = ref(false)

async function submitPatterns() {
  if (isSubmitting.value)
    return

  const selectedSyncTask = props.context?.selectedSyncTask
  const ignorePatterns = parseIgnorePatterns(taskPatternsText.value)

  isSubmitting.value = true
  try {
    const result = await taskOperations.updateSyncTaskIgnorePatterns(selectedSyncTask, ignorePatterns)
    if (result?.success)
      emit('onClickConfirm')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.editPatterns.title')" :message="$t('syncTasks.modals.editPatterns.message')">
    <div class="content-stage h-full w-full px-10 py-4 grid grid-rows-[max-content_1fr_max-content] grid-cols-[2fr_1fr] gap-x-8 gap-y-2 content-stretch">
      <label for="task-ignore-patterns" class="col-start-1 title text-(--text-primary)">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.taskSpecificPatterns.title`) }}
      </label>
      <textarea
        id="task-ignore-patterns"
        v-model="taskPatternsText"
        class="pattern-area enabled-area "
        placeholder="Type patterns here..."
        autofocus
      />
      <p class="description text-(--text-subtle)">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.taskSpecificPatterns.description`) }}
      </p>
      <label for="global-ignore-patterns" class="col-start-2 title text-gray-400">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.globalPatterns.title`) }}
      </label>
      <textarea
        id="global-ignore-patterns"
        class="pattern-area readonly-area"
        :value="globalPatternsText"
        readonly
      />
      <p class="description text-gray-400">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.globalPatterns.description`) }}
      </p>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting" @click="submitPatterns">
        {{ $t('syncTasks.modals.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('syncTasks.modals.common.cancel') }}
      </Button>
    </template>
  </ModalShell>
</template>

<style scoped>
@reference "tailwindcss";

.title{
  @apply row-start-1 text-xs font-semibold;
}
.pattern-area{
  @apply row-start-2 text-xs text-(--text-subtle) resize-none box-border
  rounded-lg border border-gray-300 bg-white px-4 py-2 placeholder-gray-400;

}
.enabled-area{
@apply block shadow-sm transition duration-200 ease-in-out
  border-(--primary) outline-none ring-2 ring-blue-500/10;
}

.readonly-area{
@apply bg-gray-50 text-gray-400;
}

.description{
  @apply row-start-3 text-[0.625rem];
}
</style>
