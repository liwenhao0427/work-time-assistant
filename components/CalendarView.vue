<template>
  <div class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
        <CalendarIcon class="w-5 h-5 text-indigo-500" />
        工时日历视图
      </h3>
      <div class="flex items-center gap-4 bg-slate-50 p-1 rounded-lg">
        <button @click="handlePrevMonth" class="p-1 hover:bg-white rounded-md shadow-sm transition-all text-slate-500 hover:text-indigo-600">
          <ChevronLeft class="w-5 h-5" />
        </button>
        <span class="text-sm font-semibold text-slate-700 w-32 text-center select-none">{{ monthYearStr }}</span>
        <button @click="handleNextMonth" class="p-1 hover:bg-white rounded-md shadow-sm transition-all text-slate-500 hover:text-indigo-600">
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-4 mb-4 text-xs text-slate-500 justify-end">
      <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> 不足 (&lt;8h)</div>
      <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> 饱和 (8h)</div>
      <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> 超负荷 (&gt;8h)</div>
      <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-300"></span> 休息</div>
    </div>

    <!-- Header -->
    <div class="grid grid-cols-7 gap-2 mb-2">
      <div v-for="day in ['周日', '周一', '周二', '周三', '周四', '周五', '周六']" :key="day" class="text-center text-xs font-semibold text-slate-400 uppercase">
        {{ day }}
      </div>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-7 gap-2">
      <!-- Empty slots -->
      <div v-for="n in firstDay" :key="`empty-${n}`" class="bg-slate-50/50"></div>
      
      <!-- Days -->
      <div 
        v-for="dayInfo in calendarDays" 
        :key="dayInfo.dateStr"
        @click="$emit('select-date', dayInfo.dateStr)"
        @contextmenu.prevent="$emit('context-date', dayInfo.dateStr)"
        class="relative min-h-[80px] p-2 border rounded-lg transition-all cursor-pointer hover:shadow-md flex flex-col items-start justify-between group"
        :class="[dayInfo.bgClass, dayInfo.borderClass]"
      >
          <span class="text-sm font-semibold" :class="dayInfo.textClass">{{ dayInfo.day }}</span>
          
          <span v-if="dayInfo.isHoliday" class="absolute top-1 right-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-1 rounded">休</span>
          <span v-else-if="dayInfo.isMakeup" class="absolute top-1 right-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-1 rounded">班</span>
          <span v-else-if="dayInfo.isWeekend" class="absolute top-1 right-1 text-[10px] font-bold text-slate-400">休</span>

          <div v-if="dayInfo.loadIndicator" class="mt-1 text-xs font-bold" :class="dayInfo.loadColor">{{ dayInfo.loadText }}</div>
          <div v-else class="mt-1 text-xs font-medium text-slate-300">-</div>

          <div v-if="dayInfo.allocation && dayInfo.allocation.taskIds.length > 0" class="flex gap-0.5 mt-1 max-w-full overflow-hidden">
             <div v-for="(tid, i) in dayInfo.allocation.taskIds.slice(0, 3)" :key="tid + i" class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
             <span v-if="dayInfo.allocation.taskIds.length > 3" class="text-[8px] text-slate-400 leading-none">+</span>
          </div>

          <!-- Hover Hint -->
          <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none"></div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-50 p-2 rounded border border-dashed border-slate-200">
        <div class="flex items-center gap-2">
            <MousePointerClick class="w-3 h-3" />
            <span class="font-semibold text-indigo-500">左键</span> 点击查看详情
        </div>
        <div class="flex items-center gap-2">
            <span class="font-semibold text-rose-500">右键</span> 切换 工作日 / 节假日 / 补班
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { DayAllocation, AppConfig } from '../types';
import { formatDateKey } from '../utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MousePointerClick } from 'lucide-vue-next';

const props = defineProps<{
  allocations: DayAllocation[];
  config: AppConfig;
}>();

defineEmits(['select-date', 'context-date']);

const currentMonth = ref(new Date());
const lastAllocStart = ref<string | null>(null);

watch(() => props.allocations, (newVal) => {
  if (newVal.length > 0) {
    const newStart = newVal[0].date;
    if (newStart !== lastAllocStart.value) {
      currentMonth.value = new Date(newStart);
      lastAllocStart.value = newStart;
    }
  }
});

const monthYearStr = computed(() => {
  return currentMonth.value.toLocaleString('zh-CN', { month: 'long', year: 'numeric' });
});

const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    return { days, firstDay };
};

const daysInMonthData = computed(() => getDaysInMonth(currentMonth.value));
const firstDay = computed(() => daysInMonthData.value.firstDay);
const days = computed(() => daysInMonthData.value.days);

const allocMap = computed(() => {
  const map = new Map<string, DayAllocation>();
  props.allocations.forEach(a => map.set(a.date, a));
  return map;
});

const calendarDays = computed(() => {
  const list = [];
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  for (let d = 1; d <= days.value; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatDateKey(dateObj);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const isHoliday = props.config.holidays.includes(dateStr);
      const isMakeup = props.config.makeupDays.includes(dateStr);
      const allocation = allocMap.value.get(dateStr);
      const hours = allocation ? allocation.totalAllocated : 0;

      let bgClass = "bg-white";
      let borderClass = "border-slate-100";
      let textClass = "text-slate-700";
      let loadIndicator = false;
      let loadText = '';
      let loadColor = '';

      if (isHoliday) {
          bgClass = "bg-slate-100/60 opacity-80 repeating-linear-gradient-45";
          textClass = "text-slate-400";
      } else if (isMakeup) {
          bgClass = "bg-orange-50";
      } else if (isWeekend) {
          bgClass = "bg-slate-50";
          textClass = "text-slate-400";
      }

      if (!isHoliday && (isMakeup || !isWeekend)) {
        loadIndicator = true;
          if (hours > 8) {
              borderClass = "border-rose-300 ring-2 ring-rose-100 ring-inset";
              loadText = `${hours.toFixed(1)}h`;
              loadColor = "text-rose-600";
          } else if (hours === 8) {
              borderClass = "border-indigo-300";
              bgClass = "bg-indigo-50/30";
              loadText = `${hours.toFixed(1)}h`;
              loadColor = "text-indigo-600";
          } else if (hours > 0) {
              borderClass = "border-emerald-300";
              bgClass = "bg-emerald-50/30";
              loadText = `${hours.toFixed(1)}h`;
              loadColor = "text-emerald-600";
          } else {
             loadIndicator = false;
          }
      }

      list.push({
        dateStr,
        day: d,
        isWeekend,
        isHoliday,
        isMakeup,
        allocation,
        bgClass,
        borderClass,
        textClass,
        loadIndicator,
        loadText,
        loadColor
      });
  }
  return list;
});

const handlePrevMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
};

const handleNextMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
};
</script>