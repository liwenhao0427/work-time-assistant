<template>
  <div v-if="!result || result.stats.totalTasks === 0" class="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
    <Clock class="w-12 h-12 mb-4 opacity-50" />
    <p class="text-lg font-medium">暂无数据</p>
    <p class="text-sm">请在左侧输入并解析 Excel 数据</p>
  </div>

  <div v-else class="space-y-8 animate-in fade-in duration-500 relative">
    
    <!-- 1. Interactive Calendar -->
    <CalendarView 
      :allocations="result.allocations" 
      :config="config" 
      @context-date="handleDateContext" 
      @select-date="handleDateSelect"
    />

    <!-- 2. Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="总任务数" 
        :value="result.stats.totalTasks" 
        :icon="CheckCircle2" 
        colorClass="text-blue-600" 
      />
      <StatCard 
        title="总工时需求" 
        :value="`${result.stats.totalHoursRequired} h`" 
        :icon="Clock" 
        colorClass="text-indigo-600" 
      />
      <StatCard 
        title="未分配工时 (超限)" 
        :value="`${(result.stats.totalHoursRequired - result.stats.totalHoursAllocated).toFixed(2)} h`" 
        :icon="AlertCircle" 
        :colorClass="(result.stats.totalHoursRequired - result.stats.totalHoursAllocated) > 0 ? 'text-rose-600' : 'text-emerald-600'" 
      />
      <StatCard 
        title="剩余闲置容量" 
        :value="`${result.stats.totalIdleCapacity} h`" 
        :icon="Battery" 
        colorClass="text-amber-600" 
      />
    </div>

    <!-- 3. Errors / Warnings -->
    <div v-if="result.unallocatedTasks.length > 0" class="bg-rose-50 border border-rose-100 rounded-xl p-6">
      <h3 class="text-rose-800 font-bold flex items-center gap-2 mb-4">
          <BatteryWarning class="w-5 h-5" />
          以下任务超出时间范围，无法分配
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
            <thead class="bg-rose-100/50 text-rose-900">
                <tr>
                    <th class="px-4 py-2 rounded-l-lg">任务序号</th>
                    <th class="px-4 py-2">时间范围</th>
                    <th class="px-4 py-2 rounded-r-lg">未分配工时</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-rose-100">
                <tr v-for="t in result.unallocatedTasks" :key="t.id">
                    <td class="px-4 py-2 font-medium text-rose-700">{{ t.id }}</td>
                    <td class="px-4 py-2 text-rose-600">{{ t.range }}</td>
                    <td class="px-4 py-2 font-bold text-rose-700">{{ t.remaining.toFixed(2) }}</td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>

    <!-- 4. Detail Table (Full List) -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-lg font-bold text-slate-800">每日分配详情</h3>
      </div>
      <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
              <thead class="text-xs text-slate-500 uppercase bg-slate-50 font-semibold">
                  <tr>
                      <th class="px-6 py-3">日期</th>
                      <th class="px-6 py-3">星期</th>
                      <th class="px-6 py-3">总计工时</th>
                      <th class="px-6 py-3">包含任务 (序号)</th>
                      <th class="px-6 py-3">剩余容量</th>
                  </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                  <tr v-for="row in result.allocations" :key="row.date" class="hover:bg-slate-50 transition-colors">
                      <td class="px-6 py-4 font-medium text-slate-900">{{ row.date }}</td>
                      <td class="px-6 py-4 text-slate-500">{{ row.dayOfWeek }}</td>
                      <td class="px-6 py-4">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getLoadBadgeClass(row.totalAllocated)">
                              {{ row.totalAllocated.toFixed(2) }} h
                          </span>
                      </td>
                      <td class="px-6 py-4 text-slate-600 max-w-xs truncate" :title="row.taskIds.join(', ')">
                          {{ row.taskIds.length > 0 ? row.taskIds.join(', ') : '-' }}
                      </td>
                      <td class="px-6 py-4 text-slate-500">
                          <span v-if="row.remainingCapacity > 0" class="text-emerald-600 font-medium">{{ row.remainingCapacity.toFixed(2) }} h</span>
                          <span v-else class="text-slate-400">已满</span>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
    </div>

    <!-- Modal for Details -->
    <TaskDetailsModal 
      :day="selectedDay" 
      :tasks="tasks" 
      :config="config" 
      @close="selectedDay = null" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AllocationResult, AppConfig, DayAllocation, RawTask } from '../types';
import { AlertCircle, CheckCircle2, Clock, Battery, BatteryWarning } from 'lucide-vue-next';
import CalendarView from './CalendarView.vue';
import StatCard from './StatCard.vue';
import TaskDetailsModal from './TaskDetailsModal.vue';

const props = defineProps<{
  result: AllocationResult | null;
  config: AppConfig;
  tasks: RawTask[];
}>();

const emit = defineEmits<{
  (e: 'updateConfig', config: AppConfig): void;
}>();

const selectedDay = ref<DayAllocation | null>(null);

const handleDateContext = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  
  let newHolidays = [...props.config.holidays];
  let newMakeupDays = [...props.config.makeupDays];

  if (newHolidays.includes(dateStr)) {
      newHolidays = newHolidays.filter(d => d !== dateStr);
  } else if (newMakeupDays.includes(dateStr)) {
      newMakeupDays = newMakeupDays.filter(d => d !== dateStr);
  } else {
      if (isWeekend) {
          newMakeupDays.push(dateStr);
      } else {
          newHolidays.push(dateStr);
      }
  }

  emit('updateConfig', {
      ...props.config,
      holidays: newHolidays.sort(),
      makeupDays: newMakeupDays.sort()
  });
};

const handleDateSelect = (dateStr: string) => {
  if (!props.result) return;
  const allocation = props.result.allocations.find(a => a.date === dateStr);
  if (allocation) {
      selectedDay.value = allocation;
  } else {
    // Dummy allocation for details modal
    const date = new Date(dateStr);
    const dayOfWeek = date.toLocaleDateString('zh-CN', {weekday: 'short'});
    selectedDay.value = {
        date: dateStr,
        dayOfWeek,
        taskIds: [],
        totalAllocated: 0,
        remainingCapacity: 0
    };
  }
};

const getLoadBadgeClass = (hours: number) => {
  if (hours > 8) return 'bg-rose-100 text-rose-800';
  if (hours === 8) return 'bg-indigo-100 text-indigo-800';
  return 'bg-emerald-100 text-emerald-800';
};
</script>