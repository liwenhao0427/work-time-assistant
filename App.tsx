import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Play, Clipboard, Info, Table as TableIcon } from 'lucide-react';
import SettingsPanel from './components/SettingsPanel';
import { Dashboard } from './components/Dashboard';
import { parseInputData, processWorkHours, PRESET_CONFIG_2025 } from './utils';
import { AppConfig, AllocationResult, RawTask } from './types';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const EditableCell: React.FC<{
    value: string | number;
    onUpdate: (newValue: string) => void;
}> = ({ value, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    const handleBlur = () => {
        onUpdate(String(currentValue));
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setCurrentValue(value);
            setIsEditing(false);
        }
    };
    
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    if (isEditing) {
        return (
            <input
                type="text"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full px-1 py-0.5 border border-indigo-300 rounded-md bg-white outline-none ring-2 ring-indigo-200"
            />
        );
    }

    return (
        <span onDoubleClick={() => setIsEditing(true)} className="block w-full h-full px-2 py-1.5 cursor-pointer">
            {value}
        </span>
    );
};


function App() {
  const [inputText, setInputText] = useState('');
  
  // Initialize config from LocalStorage or default to preset
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
        const saved = localStorage.getItem('sw_allocator_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Ensure fieldConfigs exists for legacy saved data
            if (!parsed.fieldConfigs) parsed.fieldConfigs = PRESET_CONFIG_2025.fieldConfigs;
            return parsed;
        }
        return PRESET_CONFIG_2025;
    } catch {
        return PRESET_CONFIG_2025;
    }
  });

  const [result, setResult] = useState<AllocationResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Persist config
  useEffect(() => {
    localStorage.setItem('sw_allocator_config', JSON.stringify(config));
  }, [config]);

  // Real-time parsed preview
  const parsedPreview = useMemo(() => parseInputData(inputText), [inputText]);

  // Debounce the input text to avoid re-calculating on every keystroke
  const debouncedInputText = useDebounce(inputText, 500);

  // Auto-discover columns
  useEffect(() => {
      if (parsedPreview.length > 0) {
          const maxCols = Math.max(...parsedPreview.map(t => t.rawParts.length));
          const currentMax = config.fieldConfigs.length;
          
          if (maxCols > currentMax) {
              const newFields = [...config.fieldConfigs];
              for (let i = currentMax; i < maxCols; i++) {
                  newFields.push({
                      index: i,
                      label: `列 ${i + 1}`,
                      visibleInDetails: false
                  });
              }
              setConfig(prev => ({ ...prev, fieldConfigs: newFields }));
          }
      }
  }, [parsedPreview]); // Intentionally not including config to avoid loop, though length check handles it

  // Core processing logic wrapped for reuse
  const runAllocation = useCallback((currentConfig: AppConfig, text: string) => {
      try {
        const tasks = parseInputData(text);
        if (tasks.length === 0) return null;
        return processWorkHours(tasks, currentConfig);
      } catch (e) {
        console.error(e);
        return null;
      }
  }, []);

  // Effect for automatic processing
  useEffect(() => {
      if (debouncedInputText.trim() === '') {
          setResult(null);
          setErrorMsg(null);
          return;
      }
      
      const res = runAllocation(config, debouncedInputText);
      setResult(res);
      
      if (!res || res.stats.totalTasks === 0) {
          setErrorMsg("未能识别有效数据，请检查输入格式。");
      } else {
          setErrorMsg(null);
      }
  }, [debouncedInputText, config, runAllocation]);


  // Handler for Calendar interactions (auto-recalculate)
  const handleConfigUpdate = (newConfig: AppConfig) => {
      setConfig(newConfig);
  };
  
  const handleUpdateCell = (rowIndex: number, colIndex: number, newValue: string) => {
      const updatedTasks = [...parsedPreview];
      const task = updatedTasks[rowIndex];
      
      // Update the specific column in rawParts
      if (task.rawParts[colIndex] !== undefined) {
          task.rawParts[colIndex] = newValue;
      } else {
          // Fill gap if expanding array
          task.rawParts[colIndex] = newValue;
      }

      // Reconstruct inputText
      // We assume tab separator for reconstruction if tab was present, otherwise space
      const hasTabs = inputText.includes('\t');
      const separator = hasTabs ? '\t' : ' ';
      
      // We rebuild the text block using the updated RawTasks
      // Note: This changes the entire input text to match the parsed state + modification
      const newText = updatedTasks.map(t => t.rawParts.join(separator)).join('\n');
      
      setInputText(newText);
  };


  const handleExampleLoad = () => {
    const example = `20250001	2025/11/10	2025/11/17	需求分析	4.0
20250002	2025/11/10	2025/11/17	前端开发	12.0
20250003	2025/11/12	2025/11/15	后端开发	8.0
20250004	2025/11/10	2025/11/17	测试用例	2.0`;
    setInputText(example);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Clipboard className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">工时智能校验助手</h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            系统配置
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[800px]">
          
          {/* Left Column: Input */}
          <div className="xl:col-span-5 h-full flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-indigo-500" />
                  数据输入
                </h2>
                <button 
                    onClick={handleExampleLoad} 
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                >
                    加载示例数据
                </button>
              </div>
              
              <div className="p-4 flex-1 flex flex-col min-h-0">
                <div className="mb-4 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 flex gap-2 flex-shrink-0">
                    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-slate-700 mb-1">操作提示</p>
                        <p>请从 Excel 复制数据粘贴到下方文本框。</p>
                        <p className="mt-1 text-xs opacity-75">列配置可在右上角“系统配置”中修改。</p>
                    </div>
                </div>

                {/* Excel-like Input Area */}
                <div className="relative border border-slate-300 rounded-lg overflow-hidden flex flex-col flex-1 mb-4 min-h-[150px]">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="在此处 Ctrl+V 粘贴表格数据..."
                        className="w-full h-full p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-white leading-loose whitespace-pre"
                    />
                </div>

                {/* Parsed Preview Table */}
                <div className="flex-1 flex flex-col overflow-hidden border border-indigo-100 rounded-lg bg-indigo-50/30 min-h-[200px]">
                    <div className="px-3 py-2 bg-indigo-100/50 text-xs font-semibold text-indigo-700 border-b border-indigo-100 flex justify-between items-center flex-shrink-0">
                        <span>识别预览 (双击编辑)</span>
                        {parsedPreview.length === 0 && inputText.trim() && <span className="text-rose-500">格式错误</span>}
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-xs text-left bg-white whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                                <tr>
                                    {config.fieldConfigs.slice(0, Math.max(5, (parsedPreview[0]?.rawParts.length || 0))).map((field) => (
                                        <th key={field.index} className="px-2 py-2 font-medium border-b border-slate-200 min-w-[60px]">
                                            {field.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedPreview.map((task, rowIdx) => (
                                    <tr key={rowIdx} className="hover:bg-slate-50">
                                        {task.rawParts.map((val, colIdx) => (
                                            <td key={colIdx} className="p-0 text-slate-700 border-r border-transparent hover:border-slate-200">
                                                <EditableCell value={val} onUpdate={(newVal) => handleUpdateCell(rowIdx, colIdx, newVal)} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {errorMsg && (
                    <div className="mt-3 text-sm text-rose-600 flex items-center gap-2 bg-rose-50 p-2 rounded border border-rose-100 flex-shrink-0">
                        <Info className="w-4 h-4" /> {errorMsg}
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="xl:col-span-7 h-full overflow-y-auto">
            <Dashboard 
                result={result} 
                config={config} 
                onUpdateConfig={handleConfigUpdate}
                tasks={parsedPreview}
            />
          </div>
        </div>
      </main>

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={handleConfigUpdate}
      />
    </div>
  );
}

export default App;