<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getFolderPathFoldingCandidates } from './FolderPath.folding.js'

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
const tooltipRef = ref(null)
const displayPath = ref('')
const isTooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
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
let tooltipTimer
let pointerX = 0
let pointerY = 0

const TOOLTIP_DELAY_MS = 2000
const TOOLTIP_MARGIN_PX = 12
const TOOLTIP_MAX_WIDTH_PX = 224
const TOOLTIP_POINTER_OFFSET_PX = 12
const LINE_HEIGHT_ROUNDING_TOLERANCE_PX = 1

function updateDisplayPath() {
  const element = contentRef.value
  const textElement = textRef.value
  if (!element || !textElement)
    return

  if (!props.path) {
    displayPath.value = ''
    return
  }

  if (element.clientWidth <= 0) {
    displayPath.value = props.path
    return
  }

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

  for (const candidate of getFolderPathFoldingCandidates(props.path, props.foldStrategy)) {
    textElement.textContent = candidate
    if (textElement.scrollHeight <= maximumContentHeight + LINE_HEIGHT_ROUNDING_TOLERANCE_PX) {
      displayPath.value = candidate
      return
    }
  }

  displayPath.value = '...'
}

function clearTooltipTimer() {
  clearTimeout(tooltipTimer)
  tooltipTimer = null
}

function updatePointerPosition(event) {
  pointerX = event.clientX
  pointerY = event.clientY
}

async function updateTooltipPosition() {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const fallbackWidth = Math.min(TOOLTIP_MAX_WIDTH_PX, viewportWidth - TOOLTIP_MARGIN_PX * 2)

  tooltipX.value = Math.min(
    pointerX + TOOLTIP_POINTER_OFFSET_PX,
    viewportWidth - TOOLTIP_MARGIN_PX - fallbackWidth,
  )
  tooltipY.value = pointerY + TOOLTIP_POINTER_OFFSET_PX

  await nextTick()
  const tooltipRect = tooltipRef.value?.getBoundingClientRect()
  if (!tooltipRect)
    return

  tooltipX.value = Math.max(
    TOOLTIP_MARGIN_PX,
    Math.min(tooltipX.value, viewportWidth - TOOLTIP_MARGIN_PX - tooltipRect.width),
  )

  if (tooltipY.value + tooltipRect.height > viewportHeight - TOOLTIP_MARGIN_PX) {
    tooltipY.value = Math.max(
      TOOLTIP_MARGIN_PX,
      pointerY - TOOLTIP_POINTER_OFFSET_PX - tooltipRect.height,
    )
  }
}

function showTooltipAfterDelay(event) {
  if (!shouldShowTooltip.value)
    return

  updatePointerPosition(event)
  clearTooltipTimer()
  tooltipTimer = setTimeout(() => {
    isTooltipVisible.value = true
    tooltipTimer = null
    void updateTooltipPosition()
  }, TOOLTIP_DELAY_MS)
}

function handleMouseMove(event) {
  updatePointerPosition(event)
  if (isTooltipVisible.value)
    void updateTooltipPosition()
}

function hideTooltip() {
  clearTooltipTimer()
  isTooltipVisible.value = false
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
  clearTooltipTimer()
})

watch(() => [props.path, props.maxLines, props.reserveSpace, props.verticalAlign, props.foldStrategy], async () => {
  await nextTick()
  updateDisplayPath()
  if (!shouldShowTooltip.value)
    hideTooltip()
})
</script>

<template>
  <span
    v-bind="$attrs"
    ref="contentRef"
    class="folder-path block w-full min-w-0 overflow-hidden break-all"
    :style="contentStyle"
    :aria-label="props.path"
    @mouseenter="showTooltipAfterDelay"
    @mousemove="handleMouseMove"
    @mouseleave="hideTooltip"
  >
    <span ref="textRef" class="block w-full min-w-0 break-all">{{ displayPath }}</span>
  </span>

  <Teleport to="body">
    <Transition name="folder-path-tooltip-fade">
      <span
        v-if="isTooltipVisible && shouldShowTooltip"
        ref="tooltipRef"
        class="pointer-events-none fixed z-50 max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-md border border-(--border-accent-fade) bg-(--surface-elevated) px-3 py-2 text-[0.625rem] leading-3 text-(--text-primary) shadow-lg break-all"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px`, maxWidth: `${TOOLTIP_MAX_WIDTH_PX}px` }"
        role="tooltip"
      >{{ props.path }}</span>
    </Transition>
  </Teleport>
</template>

<style scoped>
.folder-path-tooltip-fade-enter-active,
.folder-path-tooltip-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.folder-path-tooltip-fade-enter-from,
.folder-path-tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
