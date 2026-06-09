<script setup>
import Button from './Button.vue'

const emit = defineEmits(['openTaskModal'])
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true" @click="emit('openTaskModal', 'create')">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      Create
    </Button>
    <span class="bg-(--surface-soft) w-0.5" />
    <div class="flex gap-4">
      <Button :primary="false" :wide="false" @click="emit('openTaskModal', 'edit')">
        Edit
      </Button>
      <Button :primary="false" :wide="false" @click="emit('openTaskModal', 'delete')">
        Delete
      </Button>
      <Button :primary="false" :wide="false" @click="emit('openTaskModal', 'patterns')">
        Patterns
      </Button>
    </div>
  </div>
</template>
