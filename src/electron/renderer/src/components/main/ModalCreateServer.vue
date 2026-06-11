<script setup lang="ts">
import { MAIN_ACTIONS } from '#src/app/contract.js'
import Button from './Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel', 'onClickNext'])
const title = 'Create a server'
const message = 'Create a remote server'
</script>

<template>
  <ModalShell :title="title" :message="message">
    ModalContent

    <template #footer>
      <Button :primary="true" :wide="true" @click="$emit('onClickNext', MAIN_ACTIONS.CREATE_TASK)">
        Next
      </Button>
      <Button @click="$emit('onClickCancel')">
        Cancel
      </Button>
    </template>
  </ModalShell>
</template>
