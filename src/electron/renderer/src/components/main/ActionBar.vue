<script setup>
import Button from './Button.vue'
</script>

<template>
  <div class="action-bar-stage flex items-stretch gap-4">
    <Button :primary="true" :wide="true">
      <span class="icon-[lucide--circle-plus] w-4 aspect-square" />
      Create
    </Button>
    <span class="bg-(--surface-soft) w-0.5" />
    <div class="flex gap-4">
      <Button :primary="false" :wide="false">
        Edit
      </Button>
      <Button :primary="false" :wide="false">
        Delete
      </Button>
      <Button :primary="false" :wide="false">
        Patterns
      </Button>
    </div>
  </div>
</template>
