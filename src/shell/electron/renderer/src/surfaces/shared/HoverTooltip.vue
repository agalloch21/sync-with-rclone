<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  delayMs: {
    type: Number,
    default: 350,
  },
  maxWidth: {
    type: Number,
    default: 224,
  },
  onlyWhenOverflow: {
    type: Boolean,
    default: false,
  },
})

const triggerRef = ref(null)
const tooltipRef = ref(null)
const isTooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

let tooltipTimer
let pointerX = 0
let pointerY = 0

const TOOLTIP_MARGIN_PX = 12
const TOOLTIP_POINTER_OFFSET_PX = 12

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
  const fallbackWidth = Math.min(props.maxWidth, viewportWidth - TOOLTIP_MARGIN_PX * 2)

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
  if (!props.text)
    return
  if (props.onlyWhenOverflow && triggerRef.value?.scrollWidth <= triggerRef.value?.clientWidth)
    return

  updatePointerPosition(event)
  clearTooltipTimer()
  tooltipTimer = setTimeout(() => {
    isTooltipVisible.value = true
    tooltipTimer = null
    void updateTooltipPosition()
  }, props.delayMs)
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

onBeforeUnmount(clearTooltipTimer)
</script>

<template>
  <span
    v-bind="$attrs"
    ref="triggerRef"
    @mouseenter="showTooltipAfterDelay"
    @mousemove="handleMouseMove"
    @mouseleave="hideTooltip"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="hover-tooltip-fade">
      <span
        v-if="isTooltipVisible && props.text"
        ref="tooltipRef"
        class="pointer-events-none fixed z-50 max-h-[calc(100vh-1.5rem)] overflow-hidden whitespace-pre-line rounded-md border border-(--border-accent-fade) bg-(--surface-elevated) px-3 py-2 text-[0.625rem] leading-3 text-(--text-primary) shadow-lg break-all"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px`, maxWidth: `${props.maxWidth}px` }"
        role="tooltip"
      >
        <slot name="tooltip">
          {{ props.text }}
        </slot>
      </span>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hover-tooltip-fade-enter-active,
.hover-tooltip-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.hover-tooltip-fade-enter-from,
.hover-tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
