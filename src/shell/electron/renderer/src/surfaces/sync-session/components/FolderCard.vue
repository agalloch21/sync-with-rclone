<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  side: String,
  role: String,
  content: String,
})

const contentRef = ref(null)
const tooltipRef = ref(null)
const displayContent = ref('')
const tooltipState = ref('idle')
const tooltipX = ref(0)
const tooltipY = ref(0)

const isTooltipVisible = computed(() => {
  return tooltipState.value === 'open' || tooltipState.value === 'cooldown'
})
const shouldShowTooltip = computed(() => {
  return Boolean(props.content) && displayContent.value !== (props.content || '')
})

let resizeObserver
let tooltipTimer
let tooltipHideTimer

const TOOLTIP_OFFSET_X = 0
const TOOLTIP_OFFSET_Y = 0
const TOOLTIP_MARGIN = 12
const TOOLTIP_MAX_WIDTH_PX = 224 // max-w-56
const TOOLTIP_DELAY_MS = 2000
const TOOLTIP_HIDE_DELAY_MS = 80

function getPathCandidates(content) {
  const normalized = content.replace(/[\\/]+$/, '')
  const candidates = [normalized]
  const segments = normalized.split(/[\\/]+/).filter(Boolean)
  const leadingSeparator = normalized.match(/^[\\/]+/)?.[0] || ''
  const separator = normalized.includes('\\') ? '\\' : '/'

  for (let index = 1; index < segments.length; index += 1) {
    const remainingPath = `${leadingSeparator}${segments.slice(index).join(separator)}`
    candidates.push(`...${remainingPath}`)
  }

  candidates.push('...')
  return [...new Set(candidates)]
}

function updateDisplayContent() {
  const el = contentRef.value
  const content = props.content || ''
  if (!el)
    return

  if (!content) {
    displayContent.value = ''
    return
  }

  function fitsInTwoLines(text) {
    el.textContent = text
    return el.scrollHeight <= el.clientHeight + 0.5
  }

  for (const candidate of getPathCandidates(content)) {
    if (fitsInTwoLines(candidate)) {
      displayContent.value = candidate
      return
    }
  }

  displayContent.value = '...'
}

function updateTooltipPosition(event) {
  const viewportWidth = window.innerWidth
  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH_PX, viewportWidth - TOOLTIP_MARGIN * 2)

  let nextX = event.clientX + TOOLTIP_OFFSET_X
  const nextY = event.clientY + TOOLTIP_OFFSET_Y

  if (nextX + tooltipWidth > viewportWidth - TOOLTIP_MARGIN)
    nextX = Math.max(TOOLTIP_MARGIN, viewportWidth - TOOLTIP_MARGIN - tooltipWidth)

  tooltipX.value = nextX
  tooltipY.value = nextY
}

function clearTooltipTimers() {
  clearTimeout(tooltipTimer)
  tooltipTimer = null
  clearTimeout(tooltipHideTimer)
  tooltipHideTimer = null
}

function enterIdle() {
  clearTooltipTimers()
  tooltipState.value = 'idle'
}

function enterArming(event) {
  if (!shouldShowTooltip.value)
    return

  clearTooltipTimers()
  updateTooltipPosition(event)
  tooltipState.value = 'arming'
  tooltipTimer = setTimeout(() => {
    tooltipState.value = 'open'
    tooltipTimer = null
  }, TOOLTIP_DELAY_MS)
}

function enterCooldown() {
  clearTooltipTimers()
  tooltipState.value = 'cooldown'
  tooltipHideTimer = setTimeout(() => {
    tooltipState.value = 'idle'
    tooltipHideTimer = null
  }, TOOLTIP_HIDE_DELAY_MS)
}

function handleContentMouseMove(event) {
  if (tooltipState.value === 'idle' || tooltipState.value === 'arming')
    enterArming(event)
  else if (tooltipState.value === 'open')
    enterCooldown()
}

function handleContentMouseEnter(event) {
  if (tooltipState.value !== 'open' && tooltipState.value !== 'cooldown')
    enterArming(event)
}

function handleContentMouseLeave(_event) {
  if (tooltipState.value === 'arming')
    enterIdle()
  else if (tooltipState.value === 'open' || tooltipState.value === 'cooldown')
    enterCooldown()
}

function handleTooltipMouseEnter(_event) {
  clearTooltipTimers()
  tooltipState.value = 'open'
}

function handleTooltipMouseLeave(_event) {
  enterIdle()
}

onMounted(async () => {
  await nextTick()
  updateDisplayContent()

  resizeObserver = new ResizeObserver(() => {
    updateDisplayContent()
  })

  if (contentRef.value)
    resizeObserver.observe(contentRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  clearTooltipTimers()
})

watch(() => props.content, async () => {
  await nextTick()
  updateDisplayContent()
  if (!shouldShowTooltip.value)
    enterIdle()
})
</script>

<template>
  <div class="bg-(--surface-elevated) rounded-2xl border border-(--border-accent-fade) drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col py-1.5 px-4 relative">
    <div class="shrink-0 text-[0.625rem] leading-4 font-extralight tracking-[0.15rem] text-(--text-subtle) overflow-hidden text-ellipsis whitespace-nowrap ">
      {{ $t(`context.${props.side}`, '') }}
    </div>
    <div class="shrink-0 text-base leading-6 font-bold text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap ">
      {{ $t(`context.${props.role}`, '') }}
    </div>
    <div
      ref="contentRef"
      class="h-8 max-h-8 text-[0.625rem] leading-4 font-normal text-(--primary) min-h-0 break-all overflow-hidden allow-select"
      :aria-label="props.content"
      @mouseenter="handleContentMouseEnter"
      @mousemove="handleContentMouseMove"
      @mouseleave="handleContentMouseLeave"
    >
      {{ displayContent }}
    </div>
    <div class="absolute top-2 right-2 size-8">
      <span v-if="props.side === 'local'" class="icon-[custom--local] text-(--text-primary) opacity-10 size-full" />
      <span v-else-if="props.side === 'remote'" class="icon-[custom--remote] text-(--text-primary) opacity-10 size-full" />
    </div>
  </div>
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-if="isTooltipVisible && shouldShowTooltip"
        ref="tooltipRef"
        :key="side"
        class="fixed z-50 rounded-md border border-(--border-accent-fade) bg-(--surface-elevated) px-3 py-2 text-[0.625rem] leading-3 text-(--text-primary) shadow-lg break-all"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px`, maxWidth: `${TOOLTIP_MAX_WIDTH_PX}px` }"
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
      >
        {{ props.content }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
