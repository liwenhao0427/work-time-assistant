<template>
  <div class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
    <div>
      <p class="text-sm font-medium text-slate-500 mb-1">{{ title }}</p>
      <h3 :class="`text-2xl font-bold ${colorClass}`">{{ value }}</h3>
    </div>
    <div :class="`p-3 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-').replace('600', '100')}`">
      <component :is="icon" :class="`w-6 h-6 ${colorClass}`" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  title: string;
  value: string | number;
  icon: Component;
  colorClass: string;
}>();
</script>