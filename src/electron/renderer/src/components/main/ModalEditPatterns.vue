<script setup lang="ts">
import Button from './Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel'])
const title = 'Edit the patterns'
const message = 'Edit the patterns'
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
