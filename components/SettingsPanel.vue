<template>
  <div class="fixed inset-0 z-50 flex justify-end">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
      @click="$emit('close')"
    ></div>
    
    <!-- Panel -->
    <div class="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
      <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar class="w-5 h-5 text-indigo-600" />
          系统配置
        </h2>
        <button @click="$emit('close')" class="p-2 hover:bg-slate-200 rounded-full text-slate-500">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 flex-1 overflow-y-auto">
          <!-- Quick Actions -->
          <div class="mb-6 grid grid-cols-2 gap-3">
              <button 
                  @click="loadPreset"
                  class="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium border border-indigo-100"
              >
                  <Download class="w-4 h-4" /> 加载 2025 预设
              </button>
              <button 
                  @click="clearConfig"
                  class="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium border border-slate-200"
              >
                  <RefreshCw class="w-4 h-4" /> 清空配置
              </button>
          </div>

        <!-- Tabs -->
        <div class="flex p-1 bg-slate-100 rounded-lg mb-6">
          <button 
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="activeTab === 'makeup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="activeTab = 'makeup'"
          >
              补班日
          </button>
          <button 
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="activeTab === 'holiday' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="activeTab = 'holiday'"
          >
              节假日
          </button>
          <button 
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="activeTab === 'fields' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="activeTab = 'fields'"
          >
              字段配置
          </button>
        </div>

        <!-- Date Management Content -->
        <div v-if="activeTab !== 'fields'" class="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="mb-6">
                <label class="block text-sm font-medium text-slate-700 mb-2">添加日期</label>
                <div class="flex gap-2">
                    <input 
                        type="date" 
                        v-model="newDate"
                        class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <button 
                        @click="handleAddDate"
                        class="px-4 py-2 rounded-lg text-white font-medium flex items-center gap-1 transition-colors"
                        :class="activeTab === 'makeup' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'"
                    >
                        <Plus class="w-4 h-4" /> 添加
                    </button>
                </div>
                <p class="text-xs text-slate-500 mt-2">
                    {{ activeTab === 'makeup' 
                        ? '这些日期即使是周末也会被计算为工作日。' 
                        : '这些日期即使是工作日也会被计算为休息日。' }}
                </p>
            </div>

            <div class="space-y-2">
                <h3 class="text-sm font-semibold text-slate-800 flex justify-between items-center">
                    <span>{{ activeTab === 'makeup' ? '已配置补班日' : '已配置节假日' }}</span>
                    <span class="text-xs font-normal text-slate-400">
                        {{ (activeTab === 'makeup' ? config.makeupDays : config.holidays).length }} items
                    </span>
                </h3>
                <div class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    <div 
                      v-for="date in (activeTab === 'makeup' ? config.makeupDays : config.holidays)" 
                      :key="date" 
                      class="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200"
                    >
                        <span class="text-sm font-mono text-slate-600">{{ date }}</span>
                        <button 
                            @click="handleRemoveDate(date, activeTab)"
                            class="text-slate-400 hover:text-rose-500 p-1"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Field Configuration Content -->
        <div v-if="activeTab === 'fields'" class="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="flex items-start gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg mb-6 text-xs border border-emerald-100">
                <Database class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                    <p class="font-bold mb-1">自定义列配置</p>
                    <p>系统自动检测粘贴数据的列数。您可以在此修改列名，并决定哪些字段显示在「任务详情」弹窗中。</p>
                </div>
            </div>

            <div class="space-y-3">
                <div 
                  v-for="field in config.fieldConfigs" 
                  :key="field.index" 
                  class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm"
                >
                    <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-500 flex-shrink-0">
                        {{ field.index + 1 }}
                    </div>
                    
                    <div class="flex-1">
                        <div v-if="editingFieldIndex === field.index" class="flex gap-2">
                            <input 
                                type="text" 
                                v-model="editingFieldLabel"
                                class="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none ring-1 ring-indigo-200"
                                @keydown.enter="saveEditField"
                            />
                            <button @click="saveEditField" class="text-xs bg-indigo-600 text-white px-2 py-1 rounded">确定</button>
                        </div>
                        <div v-else class="flex items-center gap-2 group">
                            <span class="text-sm font-medium text-slate-800">{{ field.label || `列 ${field.index + 1}` }}</span>
                            <button @click="startEditField(field)" class="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 class="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <button 
                        @click="toggleFieldVisibility(field.index)"
                        class="p-2 rounded-md transition-colors"
                        :class="field.visibleInDetails ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'"
                        :title="field.visibleInDetails ? '在详情中显示' : '在详情中隐藏'"
                    >
                        <Eye v-if="field.visibleInDetails" class="w-4 h-4" />
                        <EyeOff v-else class="w-4 h-4" />
                    </button>
                </div>
                
                <div v-if="config.fieldConfigs.length === 0" class="text-center py-8 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                    粘贴数据后自动生成列配置
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AppConfig, FieldConfig } from '../types';
import { PRESET_CONFIG_2025 } from '../utils';
import { Calendar, Trash2, Plus, X, Download, RefreshCw, Database, Eye, EyeOff, Edit2 } from 'lucide-vue-next';

const props = defineProps<{ config: AppConfig }>();
const emit = defineEmits<{
  (e: 'updateConfig', config: AppConfig): void;
  (e: 'close'): void;
}>();

const newDate = ref('');
const activeTab = ref<'holiday' | 'makeup' | 'fields'>('makeup');
const editingFieldIndex = ref<number | null>(null);
const editingFieldLabel = ref('');

const handleAddDate = () => {
  if (!newDate.value) return;
  
  if (activeTab.value === 'makeup') {
      if (!props.config.makeupDays.includes(newDate.value)) {
          emit('updateConfig', {
              ...props.config,
              makeupDays: [...props.config.makeupDays, newDate.value].sort()
          });
      }
  } else if (activeTab.value === 'holiday') {
      if (!props.config.holidays.includes(newDate.value)) {
          emit('updateConfig', {
              ...props.config,
              holidays: [...props.config.holidays, newDate.value].sort()
          });
      }
  }
  newDate.value = '';
};

const handleRemoveDate = (date: string, type: 'holiday' | 'makeup') => {
    if (type === 'makeup') {
        emit('updateConfig', {
            ...props.config,
            makeupDays: props.config.makeupDays.filter(d => d !== date)
        });
    } else {
        emit('updateConfig', {
            ...props.config,
            holidays: props.config.holidays.filter(d => d !== date)
        });
    }
};

const loadPreset = () => {
    if (confirm('这将覆盖当前的日历配置，确定要加载 2025 预设数据吗？')) {
        emit('updateConfig', PRESET_CONFIG_2025);
    }
};

const clearConfig = () => {
  if (confirm('确定要清空所有配置吗？')) {
      emit('updateConfig', { holidays: [], makeupDays: [], fieldConfigs: [] });
  }
};

const toggleFieldVisibility = (index: number) => {
    const newFields = props.config.fieldConfigs.map(f => {
        if (f.index === index) return { ...f, visibleInDetails: !f.visibleInDetails };
        return f;
    });
    emit('updateConfig', { ...props.config, fieldConfigs: newFields });
};

const startEditField = (field: FieldConfig) => {
    editingFieldIndex.value = field.index;
    editingFieldLabel.value = field.label;
};

const saveEditField = () => {
    if (editingFieldIndex.value === null) return;
    const newFields = props.config.fieldConfigs.map(f => {
        if (f.index === editingFieldIndex.value) return { ...f, label: editingFieldLabel.value };
        return f;
    });
    emit('updateConfig', { ...props.config, fieldConfigs: newFields });
    editingFieldIndex.value = null;
};
</script>