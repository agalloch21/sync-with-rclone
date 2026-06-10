<script setup lang="ts">
import Button from './Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onCloseModal'])
const title = 'Create Task'
const message = 'Choose a remote server'
</script>

<template>
  <ModalShell :title="title" :message="message">
    ModalContent

    <template #footer>
      <Button :primary="true" :wide="true">
        Next
      </Button>
      <Button @click="$emit('onCloseModal')">
        Cancel
      </Button>
    </template>
  </ModalShell>
</template>
