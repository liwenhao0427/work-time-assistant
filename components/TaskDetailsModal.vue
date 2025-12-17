<template>
  <div v-if="day" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
            <div>
                <h3 class="text-lg font-bold text-slate-800">{{ day.date }} ({{ day.dayOfWeek }})</h3>
                <p class="text-xs text-slate-500">工时分配详情</p>
            </div>
            <button @click="$emit('close')" class="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <div class="p-6 overflow-y-auto">
            <div class="flex gap-4 mb-6">
                <div class="flex-1 bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                    <p class="text-xs text-indigo-600 mb-1">已分配</p>
                    <p class="text-xl font-bold text-indigo-700">{{ day.totalAllocated.toFixed(2) }} h</p>
                </div>
                <div class="flex-1 bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                    <p class="text-xs text-emerald-600 mb-1">剩余容量</p>
                    <p class="text-xl font-bold text-emerald-700">{{ day.remainingCapacity.toFixed(2) }} h</p>
                </div>
            </div>

            <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-slate-400" />
                任务列表 ({{ relevantTasks.length }})
            </h4>
            
            <div v-if="relevantTasks.length > 0" class="space-y-3">
                <div 
                  v-for="task in relevantTasks" 
                  :key="task.id" 
                  class="bg-slate-50 rounded-lg border border-slate-100 p-4 hover:border-indigo-100 transition-colors"
                >
                    <div class="flex justify-between items-start mb-3 border-b border-slate-200 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded font-mono">{{ task.id }}</span>
                            <span class="font-semibold text-slate-800">{{ task.name || '未命名任务' }}</span>
                        </div>
                        <span class="text-sm font-bold text-indigo-600">{{ task.hours }}h</span>
                    </div>
                    
                    <!-- Custom Fields Grid -->
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <template v-for="field in visibleFields" :key="field.index">
                            <div v-if="task.rawParts[field.index]" class="flex flex-col">
                                <span class="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">{{ field.label }}</span>
                                <span class="text-slate-700 break-words">{{ task.rawParts[field.index] }}</span>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
            <div v-else class="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                无任务分配
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DayAllocation, RawTask, AppConfig } from '../types';
import { X, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  day: DayAllocation | null;
  tasks: RawTask[];
  config: AppConfig;
}>();

defineEmits(['close']);

const relevantTasks = computed(() => {
  if (!props.day) return [];
  return props.tasks.filter(t => props.day!.taskIds.includes(t.id));
});

const visibleFields = computed(() => {
  return props.config.fieldConfigs.filter(f => f.visibleInDetails);
});
</script>