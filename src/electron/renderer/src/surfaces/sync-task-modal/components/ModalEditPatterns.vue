<script setup lang="ts">
import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'
import Button from '../../shared/Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel'])
</script>

<template>
  <ModalShell :title="$t('syncTasks.modals.editPatterns.title')" :message="$t('syncTasks.modals.editPatterns.message')">
    <div class="content-stage h-full w-full px-10 py-4 grid grid-rows-[max-content_1fr_max-content] grid-cols-[2fr_1fr] gap-x-8 gap-y-2 content-stretch">
      <label class="col-start-1 title text-(--text-primary)">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.taskSpecificPatterns.title`) }}
      </label>
      <textarea
        class="pattern-area enabled-area "
        placeholder="Type patterns here..."
        autofocus
      >
.DS_Store,
Thumbs.db,
*.swp,
*.swo,
~$*,
*.tmp,
.vscode/,
.idea/,
.git/,
node_modules/
      </textarea>
      <p class="description text-(--text-subtle)">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.taskSpecificPatterns.description`) }}
      </p>
      <label class="col-start-2 title text-gray-400">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.globalPatterns.title`) }}
      </label>
      <textarea class="pattern-area disabled-area" disabled>
        .DS_Store,
Thumbs.db,
*.swp,
*.swo,
~$*,
*.tmp,
.vscode/,
.idea/,
.git/,
node_modules/
      </textarea>
      <p class="description text-gray-400">
        {{ $t(`syncTasks.modals.${SYNC_TASK_MODALS.EDIT_PATTERNS}.globalPatterns.description`) }}
      </p>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true">
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

.disabled-area{
@apply disabled:bg-gray-50 disabled:text-gray-400;
}

.description{
  @apply row-start-3 text-[0.625rem];
}
</style>
