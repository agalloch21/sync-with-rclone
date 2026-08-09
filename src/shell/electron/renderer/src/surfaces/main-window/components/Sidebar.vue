<script setup>
defineProps({
  panels: Array,
  selectedPanel: Object,
})

defineEmits(['onSelectPanel'])
</script>

<template>
  <div class="sidebar-stage h-full bg-(--surface-footer) py-(--main-stage-py) flex flex-col">
    <div class="nav-dock flex-1 items-center divide-y divide-(--surface-soft)">
      <div
        v-for="panel in panels" :key="panel.name"
        class="nav-item"
        :class="panel === selectedPanel ? 'nav-item-selected' : 'nav-item-unselected'"
        @click="$emit('onSelectPanel', panel)"
      >
        <span class="nav-item-icon" :class="panel.icon" />
        <p class="nav-item-label">
          {{ $t(`appShell.nav.${panel.name}`) }}
        </p>
      </div>
    </div>
    <div class="about-dock border-t border-t-(--surface-soft)">
      <div class="about-stage py-1.5 flex justify-center items-center gap-1.5 text-xs text-(--text-subtle)">
        <p>{{ $t('appShell.version') }} 0.0.1</p>
        <span class="icon-[lucide--circle-question-mark] w-3 h-3" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference 'tailwindcss';

.nav-item{
    @apply py-3 flex px-6 justify-center items-center gap-3 cursor-default;
}
.nav-item-icon{
    @apply w-5 text-xl;
}
.nav-item-label{
    @apply w-24 text-base;
}
.nav-item-selected{
    @apply bg-(--primary) text-(--on-primary) fill-(--on-primary);
}
.nav-item-unselected{
    @apply bg-transparent text-(--text-primary) fill-(--text-primary);
}
</style>
