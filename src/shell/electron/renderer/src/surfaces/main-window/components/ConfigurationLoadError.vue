<script setup>
defineProps({
  error: {
    type: Object,
    required: true,
  },
})

function openConfigFolder() {
  return window.mainWindow?.openConfigFolder?.()
}
</script>

<template>
  <section role="alert" class="m-5 rounded-lg border-2 border-(--text-primary) px-6 py-5 text-(--text-primary)">
    <div class="flex items-start gap-4">
      <span class="icon-[lucide--triangle-alert] mt-0.5 size-6 shrink-0" />
      <div class="min-w-0 space-y-3">
        <h2 class="text-base font-bold">
          {{ $t('configurationError.title') }}
        </h2>
        <p class="text-sm font-semibold">
          {{ $t(`errors.${error.code}`, error.meta || {}) }}
        </p>
        <p class="text-sm text-(--text-primary)">
          {{ $t('configurationError.instruction') }}
          <button type="button" class="font-semibold text-blue-500 underline underline-offset-4" @click="openConfigFolder">
            {{ $t('configurationError.openFolder') }}
          </button>
        </p>
      </div>
    </div>
  </section>
</template>
