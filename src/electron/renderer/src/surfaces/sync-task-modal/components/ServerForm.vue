<script setup>
import { getProtocolDefinition, REMOTE_PROTOCOLS } from '#src/app/sync-task/protocol-registry.js'
import { computed } from 'vue'

const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
  protocolType: {
    type: String,
    required: true,
  },
  readonlyName: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:protocolType', 'update:field'])

const protocol = computed(() => getProtocolDefinition(props.protocolType))

function updateField(name, value) {
  emit('update:field', { name, value })
}
</script>

<template>
  <div class="server-form-grid">
    <label class="field-label" for="protocol">Protocol</label>
    <select
      id="protocol"
      :value="protocolType"
      class="field-control field-select focusable"
      @change="$emit('update:protocolType', $event.target.value)"
    >
      <option v-for="item in REMOTE_PROTOCOLS" :key="item.type" :value="item.type">
        {{ item.label }}
      </option>
    </select>

    <template v-for="field in protocol.fields" :key="field.name">
      <label class="field-label" :for="field.name">{{ field.label }}</label>
      <div class="field-control-dock">
        <input
          :id="field.name"
          :value="form[field.name]"
          :type="field.type"
          :readonly="readonlyName && field.name === 'name'"
          class="field-control focusable"
          @input="updateField(field.name, $event.target.value)"
        >
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.server-form-grid{
  @apply grid grid-cols-[7rem_20rem] items-start gap-x-4 text-xs text-(--text-primary);
}
.field-label{
  @apply text-right font-medium leading-4;
}
.field-control-dock{
  @apply min-w-0;
}
.field-control{
  @apply w-full border-0 border-b border-(--text-subtle) bg-transparent px-2 py-4 text-center text-sm text-(--text-subtle) outline-none;
}
.field-control[readonly]{
  @apply opacity-70;
}
.field-select{
  @apply text-center;
}
</style>
