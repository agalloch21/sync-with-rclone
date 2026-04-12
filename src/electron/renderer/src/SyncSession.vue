<script setup>
import { onMounted, ref } from 'vue'

const message = ref('')
const differences = ref([])
onMounted(() => {
  window.syncSession.onEvent((event, value) => {
    message.value = value
  })
  window.syncSession.onReceiveDifferences((event, value) => {
    differences.value = value
  })
})

function cancel() {
  window.syncSession.cancelSync()
}
function confirm() {
  const colors = ['red', 'blue', 'green', 'yellow']
  window.syncSession.confirmSync(JSON.stringify(colors))
}
</script>

<template>
  <div>
    {{ message }}
  </div>
  <div>---</div>
  <div>{{ differences }}</div>
  <div>
    <button @click="cancel">
      Cancel
    </button>
    <button @click="confirm">
      Confirm
    </button>
  </div>
</template>
