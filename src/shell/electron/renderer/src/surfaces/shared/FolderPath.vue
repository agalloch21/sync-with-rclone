<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getFolderPathFoldingCandidates } from './FolderPath.folding.js'
import HoverTooltip from './HoverTooltip.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  path: {
    type: String,
    default: '',
  },
  maxLines: {
    type: Number,
    default: 2,
    validator: value => Number.isInteger(value) && value > 0,
  },
  reserveSpace: {
    type: Boolean,
    default: false,
  },
  verticalAlign: {
    type: String,
    default: 'top',
    validator: value => ['top', 'center', 'bottom'].includes(value),
  },
  foldStrategy: {
    type: String,
    default: 'leading',
    validator: value => ['leading', 'middle'].includes(value),
  },
})

const contentRef = ref(null)
const textRef = ref(null)
const displayPath = ref('')
const contentHeightPx = ref(null)

const contentStyle = computed(() => {
  const contentHeight = contentHeightPx.value === null ? undefined : `${contentHeightPx.value}px`
  const justifyContent = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
  }[props.verticalAlign]

  return {
    display: props.reserveSpace ? 'flex' : undefined,
    flexDirection: props.reserveSpace ? 'column' : undefined,
    justifyContent: props.reserveSpace ? justifyContent : undefined,
    height: props.reserveSpace ? contentHeight : undefined,
    minHeight: props.reserveSpace ? contentHeight : undefined,
    maxHeight: contentHeight,
  }
})
const shouldShowTooltip = computed(() => {
  return Boolean(props.path) && displayPath.value !== props.path
})

let resizeObserver

const TOOLTIP_DELAY_MS = 2000
const LINE_HEIGHT_ROUNDING_TOLERANCE_PX = 1

function updateDisplayPath() {
  const element = contentRef.value
  const textElement = textRef.value
  if (!element || !textElement)
    return

  const lineHeight = Number.parseFloat(window.getComputedStyle(textElement).lineHeight)
  if (!Number.isFinite(lineHeight)) {
    displayPath.value = props.path
    return
  }

  const maximumContentHeight = lineHeight * props.maxLines
  const contentHeight = `${maximumContentHeight}px`
  contentHeightPx.value = maximumContentHeight
  element.style.maxHeight = contentHeight
  element.style.height = props.reserveSpace ? contentHeight : ''
  element.style.minHeight = props.reserveSpace ? contentHeight : ''

  if (!props.path) {
    displayPath.value = ''
    return
  }

  if (element.clientWidth <= 0) {
    displayPath.value = props.path
    return
  }

  for (const candidate of getFolderPathFoldingCandidates(props.path, props.foldStrategy)) {
    textElement.textContent = candidate
    if (textElement.scrollHeight <= maximumContentHeight + LINE_HEIGHT_ROUNDING_TOLERANCE_PX) {
      displayPath.value = candidate
      return
    }
  }

  displayPath.value = '...'
}

onMounted(async () => {
  await nextTick()
  updateDisplayPath()

  resizeObserver = new ResizeObserver(updateDisplayPath)
  if (contentRef.value)
    resizeObserver.observe(contentRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(() => [props.path, props.maxLines, props.reserveSpace, props.verticalAlign, props.foldStrategy], async () => {
  await nextTick()
  updateDisplayPath()
})
</script>

<template>
  <HoverTooltip
    v-bind="$attrs"
    class="folder-path block w-full min-w-0 overflow-hidden break-all"
    :aria-label="props.path"
    :text="shouldShowTooltip ? props.path : ''"
    :delay-ms="TOOLTIP_DELAY_MS"
  >
    <span ref="contentRef" class="block w-full min-w-0 overflow-hidden break-all" :style="contentStyle">
      <span ref="textRef" class="block w-full min-w-0 break-all">{{ displayPath }}</span>
    </span>
  </HoverTooltip>
</template>
