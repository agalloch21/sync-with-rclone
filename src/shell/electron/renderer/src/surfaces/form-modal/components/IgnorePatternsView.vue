<script setup lang="ts">
import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'
import { formatIgnorePatterns, parseIgnorePatterns, useMappingOperations } from '#frontend/composables/useMappingOperations.js'
import { ref } from 'vue'
import Button from '../../shared/Button.vue'
import ModalLayout from './ModalLayout.vue'

const props = defineProps({
  context: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['onClickCancel', 'onClickConfirm'])
const mappingOperations = useMappingOperations(window.formModal)

const mappingPatternsText = ref(formatIgnorePatterns(props.context?.selectedMapping?.ignorePatterns))
const globalPatternsText = formatIgnorePatterns(props.context?.globalIgnorePatterns)
const isSubmitting = ref(false)

async function submitPatterns() {
  if (isSubmitting.value)
    return

  const selectedMapping = props.context?.selectedMapping
  const ignorePatterns = parseIgnorePatterns(mappingPatternsText.value)

  isSubmitting.value = true
  try {
    const result = await mappingOperations.updateMappingIgnorePatterns(selectedMapping, ignorePatterns)
    if (result?.success)
      emit('onClickConfirm')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <ModalLayout :view="FORM_MODAL_VIEW.EDIT_PATTERNS">
    <div class="content-stage h-full w-full px-10 py-4 grid grid-rows-[max-content_1fr_max-content] grid-cols-[2fr_1fr] gap-x-8 gap-y-2 content-stretch">
      <label for="mapping-ignore-patterns" class="col-start-1 title text-(--text-primary)">
        {{ $t(`formModal.${FORM_MODAL_VIEW.EDIT_PATTERNS}.mappingSpecificPatterns.title`) }}
      </label>
      <textarea
        id="mapping-ignore-patterns"
        v-model="mappingPatternsText"
        class="pattern-area enabled-area "
        placeholder="Type patterns here..."
        autofocus
      />
      <p class="description text-(--text-subtle)">
        {{ $t(`formModal.${FORM_MODAL_VIEW.EDIT_PATTERNS}.mappingSpecificPatterns.description`) }}
      </p>
      <label for="global-ignore-patterns" class="col-start-2 title text-gray-400">
        {{ $t(`formModal.${FORM_MODAL_VIEW.EDIT_PATTERNS}.globalPatterns.title`) }}
      </label>
      <textarea
        id="global-ignore-patterns"
        class="pattern-area readonly-area"
        :value="globalPatternsText"
        readonly
      />
      <p class="description text-gray-400">
        {{ $t(`formModal.${FORM_MODAL_VIEW.EDIT_PATTERNS}.globalPatterns.description`) }}
      </p>
    </div>

    <template #footer>
      <Button :primary="true" :wide="true" :disabled="isSubmitting" @click="submitPatterns">
        {{ $t('formModal.common.confirm') }}
      </Button>
      <Button @click="$emit('onClickCancel')">
        {{ $t('formModal.common.cancel') }}
      </Button>
    </template>
  </ModalLayout>
</template>

<style scoped>
@reference "tailwindcss";

.title{
  @apply row-start-1 text-xs font-semibold;
}
.pattern-area{
  @apply row-start-2 text-xs text-(--text-subtle) resize-none box-border
  rounded-lg border border-gray-300 bg-white px-4 py-2 placeholder-gray-400;

}
.enabled-area{
@apply block shadow-sm transition duration-200 ease-in-out
  border-(--primary) outline-none ring-2 ring-blue-500/10;
}

.readonly-area{
@apply bg-gray-50 text-gray-400;
}

.description{
  @apply row-start-3 text-[0.625rem];
}
</style>
