<script setup>
const props = defineProps({
  panels: Array,
  selectedPanel: String,
})

defineEmits(['onSelectPanel'])
</script>

<template>
  <div class="sidebar-stage h-full bg-(--surface-footer) py-(--main-stage-py) flex flex-col">
    <div class="nav-dock flex-1 items-center divide-y divide-(--surface-soft)">
      <div
        class="nav-item"
        :class="props.panels && props.panels.length > 0 && panels[0].name === selectedPanel ? 'nav-item-selected' : 'nav-item-unselected'"
        @click="$emit('onSelectPanel', 'syncTasks')"
      >
        <!-- <span class="icon-[lucide--folder-sync] w-6 h-6" /> -->
        <div class="nav-item-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.42507 0.254957V3.19447L11.2807 3.14548C15.065 3.14548 15.3319 7.22297 15.3502 7.70444C15.3511 7.71976 15.3515 7.73518 15.3515 7.75071C15.3515 7.75071 15.3513 7.73465 15.3502 7.70444C15.268 6.26963 11.3787 5.74204 11.3787 5.74204H6.37602V8.48559C6.37602 8.48559 6.37602 8.73055 6.08174 8.77954C5.83651 8.82853 5.49319 8.73055 5.49319 8.73055L0.343324 5.20313C0.343324 5.20313 0 5.00717 0 4.51725C0 4.02733 0.490463 3.78237 0.490463 3.78237C0.490463 3.78237 5.54223 0.254957 5.64033 0.107982C5.64033 0.107982 5.88556 -0.0389935 6.13079 0.00999834C6.42507 0.107982 6.42507 0.254957 6.42507 0.254957Z" />
            <path d="M11.5749 17.794V14.9035H6.62125C2.83691 14.9035 2.57005 10.826 2.55173 10.3445C2.55085 10.3292 2.55041 10.3138 2.55041 10.2983C2.55041 10.2983 2.55058 10.3143 2.55173 10.3445C2.63389 11.7794 6.52316 12.3069 6.52316 12.3069H11.624V9.56341C11.624 9.56341 11.673 9.36744 12.0163 9.26946C12.3106 9.17147 12.5068 9.31845 12.5068 9.31845L17.6567 12.8459C17.6567 12.8459 18 13.0418 18 13.5317C18 14.0217 17.5095 14.2666 17.5095 14.2666C17.5095 14.2666 12.4578 17.843 12.3597 17.892C12.3106 17.892 12.1635 18.039 11.9673 17.99C11.624 17.99 11.5749 17.794 11.5749 17.794Z" />
          </svg>
        </div>
        <p class="nav-item-label">
          {{ $t('main.nav.syncTasks') }}
        </p>
      </div>
      <div
        class="nav-item"
        :class="props.panels && props.panels.length > 0 && panels[1].name === selectedPanel ? 'nav-item-selected' : 'nav-item-unselected'"
        @click="$emit('onSelectPanel', 'logs')"
      >
        <div class="nav-item-icon">
          <svg width="20" height="16" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H2ZM2 14H18V4H2V14ZM5.5 13L4.1 11.6L6.675 9L4.075 6.4L5.5 5L9.5 9L5.5 13ZM10 13V11H16V13H10Z" />
          </svg>
        </div>
        <p class="nav-item-label">
          {{ $t('main.nav.logs') }}
        </p>
      </div>
      <div
        class="nav-item"
        :class="props.panels && props.panels.length > 0 && panels[2].name === selectedPanel ? 'nav-item-selected' : 'nav-item-unselected'"
        @click="$emit('onSelectPanel', 'settings')"
      >
        <div class="nav-item-icon">
          <svg width="21" height="20" viewBox="0 0 21 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM9.05 18H11.025L11.375 15.35C11.8917 15.2167 12.3708 15.0208 12.8125 14.7625C13.2542 14.5042 13.6583 14.1917 14.025 13.825L16.5 14.85L17.475 13.15L15.325 11.525C15.4083 11.2917 15.4667 11.0458 15.5 10.7875C15.5333 10.5292 15.55 10.2667 15.55 10C15.55 9.73333 15.5333 9.47083 15.5 9.2125C15.4667 8.95417 15.4083 8.70833 15.325 8.475L17.475 6.85L16.5 5.15L14.025 6.2C13.6583 5.81667 13.2542 5.49583 12.8125 5.2375C12.3708 4.97917 11.8917 4.78333 11.375 4.65L11.05 2H9.075L8.725 4.65C8.20833 4.78333 7.72917 4.97917 7.2875 5.2375C6.84583 5.49583 6.44167 5.80833 6.075 6.175L3.6 5.15L2.625 6.85L4.775 8.45C4.69167 8.7 4.63333 8.95 4.6 9.2C4.56667 9.45 4.55 9.71667 4.55 10C4.55 10.2667 4.56667 10.525 4.6 10.775C4.63333 11.025 4.69167 11.275 4.775 11.525L2.625 13.15L3.6 14.85L6.075 13.8C6.44167 14.1833 6.84583 14.5042 7.2875 14.7625C7.72917 15.0208 8.20833 15.2167 8.725 15.35L9.05 18ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.2875 6.84167 7.6125 7.525C6.9375 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.9375 11.7917 7.6125 12.475C8.2875 13.1583 9.11667 13.5 10.1 13.5Z" />
          </svg>
        </div>
        <p class="nav-item-label">
          {{ $t('main.nav.settings') }}
        </p>
      </div>
    </div>
    <div class="about-dock border-t border-t-(--surface-soft)">
      <div class="about-stage py-1.5 flex justify-center items-center gap-1.5 text-xs text-(--text-subtle)">
        <p>{{ $t('main.version') }} 0.0.1</p>
        <span class="icon-[lucide--circle-question-mark] w-3 h-3" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference 'tailwindcss';

.nav-item{
    @apply py-3 flex px-6 justify-center items-center gap-3 text-base cursor-default;
}
.nav-item-icon{
    @apply w-5 aspect-square content-center;
}
.nav-item-label{
    @apply w-24;
}
.nav-item-selected{
    @apply bg-(--primary) text-(--on-primary) fill-(--on-primary);
}
.nav-item-unselected{
    @apply bg-transparent text-(--text-primary) fill-(--text-primary);
}
</style>
