<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 pb-20">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <Clipboard class="text-white w-5 h-5" />
          </div>
          <h1 class="text-xl font-bold text-slate-800 tracking-tight">工时智能校验助手</h1>
        </div>
        <button 
          @click="isSettingsOpen = true"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Settings class="w-4 h-4" />
          系统配置
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[800px]">
        
        <!-- Left Column: Input -->
        <div class="xl:col-span-5 h-full flex flex-col">
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
              <h2 class="font-semibold text-slate-700 flex items-center gap-2">
                <TableIcon class="w-5 h-5 text-indigo-500" />
                数据输入
              </h2>
              <button 
                  @click="handleExampleLoad" 
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
              >
                  加载示例数据
              </button>
            </div>
            
            <div class="p-4 flex-1 flex flex-col min-h-0">
              <div class="mb-4 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 flex gap-2 flex-shrink-0">
                  <Info class="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                      <p class="font-semibold text-slate-700 mb-1">操作提示</p>
                      <p>请从 Excel 复制数据粘贴到下方文本框。</p>
                      <p class="mt-1 text-xs opacity-75">列配置可在右上角“系统配置”中修改。</p>
                  </div>
              </div>

              <!-- Excel-like Input Area -->
              <div class="relative border border-slate-300 rounded-lg overflow-hidden flex flex-col flex-1 mb-4 min-h-[150px]">
                  <textarea
                      v-model="inputText"
                      placeholder="在此处 Ctrl+V 粘贴表格数据..."
                      class="w-full h-full p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-white leading-loose whitespace-pre"
                  ></textarea>
              </div>

              <!-- Parsed Preview Table -->
              <div class="flex-1 flex flex-col overflow-hidden border border-indigo-100 rounded-lg bg-indigo-50/30 min-h-[200px]">
                  <div class="px-3 py-2 bg-indigo-100/50 text-xs font-semibold text-indigo-700 border-b border-indigo-100 flex justify-between items-center flex-shrink-0">
                      <span>识别预览 (双击编辑)</span>
                      <span v-if="parsedPreview.length === 0 && inputText.trim()" class="text-rose-500">格式错误</span>
                  </div>
                  <div class="overflow-auto flex-1">
                      <table class="w-full text-xs text-left bg-white whitespace-nowrap">
                          <thead class="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                              <tr>
                                  <th 
                                    v-for="field in visibleColumns" 
                                    :key="field.index" 
                                    class="px-2 py-2 font-medium border-b border-slate-200 min-w-[60px]"
                                  >
                                    {{ field.label }}
                                  </th>
                              </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                              <tr v-for="(task, rowIdx) in parsedPreview" :key="rowIdx" class="hover:bg-slate-50">
                                  <td 
                                    v-for="(val, colIdx) in task.rawParts" 
                                    :key="colIdx" 
                                    class="p-0 text-slate-700 border-r border-transparent hover:border-slate-200"
                                  >
                                      <EditableCell 
                                        :model-value="val" 
                                        @update:model-value="(newVal) => handleUpdateCell(rowIdx, colIdx, newVal)" 
                                      />
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>

              <div v-if="errorMsg" class="mt-3 text-sm text-rose-600 flex items-center gap-2 bg-rose-50 p-2 rounded border border-rose-100 flex-shrink-0">
                  <Info class="w-4 h-4" /> {{ errorMsg }}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Results -->
        <div class="xl:col-span-7 h-full overflow-y-auto">
          <Dashboard 
              :result="result" 
              :config="config" 
              :tasks="parsedPreview"
              @update-config="handleConfigUpdate"
          />
        </div>
      </div>
    </main>

    <SettingsPanel 
      v-if="isSettingsOpen"
      :config="config"
      @update-config="handleConfigUpdate"
      @close="isSettingsOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Settings, Clipboard, Info, Table as TableIcon } from 'lucide-vue-next';
import SettingsPanel from './components/SettingsPanel.vue';
import Dashboard from './components/Dashboard.vue';
import EditableCell from './components/EditableCell.vue';
import { parseInputData, processWorkHours, PRESET_CONFIG_2025 } from './utils';
import { AppConfig, AllocationResult } from './types';

// State
const inputText = ref('');
const isSettingsOpen = ref(false);
const errorMsg = ref<string | null>(null);
const result = ref<AllocationResult | null>(null);

// Config Initialization
const config = ref<AppConfig>(PRESET_CONFIG_2025);

// Load Config from LocalStorage
onMounted(() => {
  try {
    const saved = localStorage.getItem('sw_allocator_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.fieldConfigs) parsed.fieldConfigs = PRESET_CONFIG_2025.fieldConfigs;
      config.value = parsed;
    }
  } catch (e) {
    console.error('Failed to load config', e);
  }
});

// Watch Config Changes to Save
watch(config, (newVal) => {
  localStorage.setItem('sw_allocator_config', JSON.stringify(newVal));
}, { deep: true });

// Parsed Preview
const parsedPreview = computed(() => parseInputData(inputText.value));

// Visible Columns for Preview Table
const visibleColumns = computed(() => {
  const maxCols = parsedPreview.value.length > 0 
    ? Math.max(...parsedPreview.value.map(t => t.rawParts.length)) 
    : 0;
  return config.value.fieldConfigs.slice(0, Math.max(5, maxCols));
});

// Auto-discover columns
watch(parsedPreview, (newVal) => {
  if (newVal.length > 0) {
    const maxCols = Math.max(...newVal.map(t => t.rawParts.length));
    const currentMax = config.value.fieldConfigs.length;
    
    if (maxCols > currentMax) {
      const newFields = [...config.value.fieldConfigs];
      for (let i = currentMax; i < maxCols; i++) {
        newFields.push({
          index: i,
          label: `列 ${i + 1}`,
          visibleInDetails: false
        });
      }
      config.value.fieldConfigs = newFields;
    }
  }
});

// Debounced Calculation Logic
let debounceTimer: ReturnType<typeof setTimeout>;

const runAllocation = () => {
  if (inputText.value.trim() === '') {
    result.value = null;
    errorMsg.value = null;
    return;
  }

  try {
    const tasks = parseInputData(inputText.value);
    if (tasks.length === 0) {
       result.value = null;
       errorMsg.value = "未能识别有效数据，请检查输入格式。";
       return;
    }
    const res = processWorkHours(tasks, config.value);
    result.value = res;
    
    if (res.stats.totalTasks === 0) {
      errorMsg.value = "未能识别有效数据，请检查输入格式。";
    } else {
      errorMsg.value = null;
    }
  } catch (e) {
    console.error(e);
    result.value = null;
  }
};

watch([inputText, config], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runAllocation, 500);
}, { deep: true });


const handleUpdateCell = (rowIndex: number, colIndex: number, newValue: string) => {
  const updatedTasks = [...parsedPreview.value];
  const task = updatedTasks[rowIndex];
  
  // Create a deep copy of rawParts to modify
  const newParts = [...task.rawParts];
  newParts[colIndex] = newValue;
  task.rawParts = newParts;

  const hasTabs = inputText.value.includes('\t');
  const separator = hasTabs ? '\t' : ' ';
  
  // Reconstruct inputText
  const lines = inputText.value.trim().split('\n');
  // We need to match the line in the original text. 
  // Simplified approach: Rebuild all text from parsed objects
  const newText = updatedTasks.map(t => t.rawParts.join(separator)).join('\n');
  inputText.value = newText;
};

const handleConfigUpdate = (newConfig: AppConfig) => {
  config.value = newConfig;
};

const handleExampleLoad = () => {
  const example = `20250001	2025/11/10	2025/11/17	需求分析	4.0
20250002	2025/11/10	2025/11/17	前端开发	12.0
20250003	2025/11/12	2025/11/15	后端开发	8.0
20250004	2025/11/10	2025/11/17	测试用例	2.0`;
  inputText.value = example;
  errorMsg.value = null;
};
</script>