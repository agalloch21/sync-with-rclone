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
    <div
      class="absolute top-2 right-2"
    >
      <svg
        v-if="props.side === 'local'"
        class="fill-(--text-primary)"
        width="34" height="26" viewBox="0 0 34 26" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <g opacity="0.1">
          <path d="M2.83333 26C2.05417 26 1.38715 25.7235 0.832292 25.1706C0.277431 24.6176 0 23.9529 0 23.1765H5.66667C4.8875 23.1765 4.22049 22.9 3.66562 22.3471C3.11076 21.7941 2.83333 21.1294 2.83333 20.3529V4.82353C2.83333 4.04706 3.11076 3.38235 3.66562 2.82941C4.22049 2.27647 4.8875 2 5.66667 2H28.3333C29.1125 2 29.7795 2.27647 30.3344 2.82941C30.8892 3.38235 31.1667 4.04706 31.1667 4.82353V20.3529C31.1667 21.1294 30.8892 21.7941 30.3344 22.3471C29.7795 22.9 29.1125 23.1765 28.3333 23.1765H34C34 23.9529 33.7226 24.6176 33.1677 25.1706C32.6128 25.7235 31.9458 26 31.1667 26H2.83333ZM17 24.5882C17.4014 24.5882 17.7378 24.4529 18.0094 24.1824C18.2809 23.9118 18.4167 23.5765 18.4167 23.1765C18.4167 22.7765 18.2809 22.4412 18.0094 22.1706C17.7378 21.9 17.4014 21.7647 17 21.7647C16.5986 21.7647 16.2622 21.9 15.9906 22.1706C15.7191 22.4412 15.5833 22.7765 15.5833 23.1765C15.5833 23.5765 15.7191 23.9118 15.9906 24.1824C16.2622 24.4529 16.5986 24.5882 17 24.5882ZM5.66667 20.3529H28.3333V4.82353H5.66667V20.3529Z" />
        </g>
      </svg>
      <svg
        v-else-if="props.side === 'remote'"
        class="fill-(--text-primary)"
        width="34" height="25" viewBox="0 0 34 25" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <g opacity="0.1">
          <path d="M8.5 25C6.15606 25 4.15341 24.1797 2.49205 22.5391C0.830682 20.8984 0 18.8932 0 16.5234C0 14.4922 0.605303 12.6823 1.81591 11.0938C3.02652 9.50521 4.61061 8.48958 6.56818 8.04688C7.21212 5.65104 8.5 3.71094 10.4318 2.22656C12.3636 0.742188 14.553 0 17 0C20.0136 0 22.5701 1.0612 24.6693 3.18359C26.7686 5.30599 27.8182 7.89062 27.8182 10.9375C29.5955 11.1458 31.0701 11.9206 32.242 13.2617C33.414 14.6029 34 16.1719 34 17.9688C34 19.9219 33.3239 21.582 31.9716 22.9492C30.6193 24.3164 28.9773 25 27.0455 25H8.5ZM8.5 21.875H27.0455C28.1273 21.875 29.0417 21.4974 29.7886 20.7422C30.5356 19.987 30.9091 19.0625 30.9091 17.9688C30.9091 16.875 30.5356 15.9505 29.7886 15.1953C29.0417 14.4401 28.1273 14.0625 27.0455 14.0625H24.7273V10.9375C24.7273 8.77604 23.9739 6.93359 22.467 5.41016C20.9602 3.88672 19.1379 3.125 17 3.125C14.8621 3.125 13.0398 3.88672 11.533 5.41016C10.0261 6.93359 9.27273 8.77604 9.27273 10.9375H8.5C7.00606 10.9375 5.73106 11.4714 4.675 12.5391C3.61894 13.6068 3.09091 14.8958 3.09091 16.4062C3.09091 17.9167 3.61894 19.2057 4.675 20.2734C5.73106 21.3411 7.00606 21.875 8.5 21.875Z" />
        </g>
      </svg>
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
