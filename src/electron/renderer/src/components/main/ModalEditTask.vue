<script setup lang="ts">
import Button from './Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel'])
const title = 'Edit the task'
const message = 'Edit the task'
</script>

<template>
  <ModalShell :title="title" :message="message">
    ModalContent

    <template #footer>
      <Button :primary="true" :wide="true">
        Confirm
      </Button>
      <Button @click="$emit('onClickCancel')">
        Cancel
      </Button>
    </template>
  </ModalShell>
</template>
