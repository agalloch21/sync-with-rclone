<script setup lang="ts">
import { MAIN_ACTIONS } from '#src/app/contract.js'
import Button from './Button.vue'
import ModalShell from './ModalShell.vue'

defineEmits(['onClickCancel', 'onClickConfirm', 'onClickNext'])
const title = 'Choose a server'
const message = 'Choose a remote server'
</script>

<template>
  <ModalShell :title="title" :message="message">
    ModalContent

    <template #footer>
      <Button :primary="true" :wide="true" @click="$emit('onClickNext', MAIN_ACTIONS.CREATE_SERVER)">
        Next
      </Button>
      <Button @click="$emit('onClickCancel')">
        Cancel
      </Button>
    </template>
  </ModalShell>
</template>
