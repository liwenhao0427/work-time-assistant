import React, { useState } from 'react';
import { AppConfig, FieldConfig } from '../types';
import { PRESET_CONFIG_2025 } from '../utils';
import { Calendar, Trash2, Plus, X, Download, RefreshCw, Database, Eye, EyeOff, Edit2 } from 'lucide-react';

interface SettingsPanelProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdateConfig, isOpen, onClose }) => {
  const [newDate, setNewDate] = useState('');
  const [activeTab, setActiveTab] = useState<'holiday' | 'makeup' | 'fields'>('makeup');
  
  // Field editing state
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState('');

  const handleAddDate = () => {
    if (!newDate) return;
    
    if (activeTab === 'makeup') {
        if (!config.makeupDays.includes(newDate)) {
            onUpdateConfig({
                ...config,
                makeupDays: [...config.makeupDays, newDate].sort()
            });
        }
    } else if (activeTab === 'holiday') {
        if (!config.holidays.includes(newDate)) {
            onUpdateConfig({
                ...config,
                holidays: [...config.holidays, newDate].sort()
            });
        }
    }
    setNewDate('');
  };

  const handleRemoveDate = (date: string, type: 'holiday' | 'makeup') => {
      if (type === 'makeup') {
          onUpdateConfig({
              ...config,
              makeupDays: config.makeupDays.filter(d => d !== date)
          });
      } else {
          onUpdateConfig({
              ...config,
              holidays: config.holidays.filter(d => d !== date)
          });
      }
  };

  const loadPreset = () => {
      if (confirm('这将覆盖当前的日历配置，确定要加载 2025 预设数据吗？')) {
          onUpdateConfig(PRESET_CONFIG_2025);
      }
  };

  const clearConfig = () => {
    if (confirm('确定要清空所有配置吗？')) {
        onUpdateConfig({ holidays: [], makeupDays: [], fieldConfigs: [] });
    }
  };

  const toggleFieldVisibility = (index: number) => {
      const newFields = config.fieldConfigs.map(f => {
          if (f.index === index) return { ...f, visibleInDetails: !f.visibleInDetails };
          return f;
      });
      onUpdateConfig({ ...config, fieldConfigs: newFields });
  };

  const startEditField = (field: FieldConfig) => {
      setEditingFieldIndex(field.index);
      setEditingFieldLabel(field.label);
  };

  const saveEditField = () => {
      if (editingFieldIndex === null) return;
      const newFields = config.fieldConfigs.map(f => {
          if (f.index === editingFieldIndex) return { ...f, label: editingFieldLabel };
          return f;
      });
      onUpdateConfig({ ...config, fieldConfigs: newFields });
      setEditingFieldIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            系统配置
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
            {/* Quick Actions */}
            <div className="mb-6 grid grid-cols-2 gap-3">
                <button 
                    onClick={loadPreset}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium border border-indigo-100"
                >
                    <Download className="w-4 h-4" /> 加载 2025 预设
                </button>
                <button 
                    onClick={clearConfig}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium border border-slate-200"
                >
                    <RefreshCw className="w-4 h-4" /> 清空配置
                </button>
            </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'makeup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('makeup')}
            >
                补班日
            </button>
            <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'holiday' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('holiday')}
            >
                节假日
            </button>
            <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'fields' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('fields')}
            >
                字段配置
            </button>
          </div>

          {/* Date Management Content */}
          {activeTab !== 'fields' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">添加日期</label>
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <button 
                            onClick={handleAddDate}
                            className={`px-4 py-2 rounded-lg text-white font-medium flex items-center gap-1 transition-colors ${activeTab === 'makeup' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            <Plus className="w-4 h-4" /> 添加
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {activeTab === 'makeup' 
                            ? '这些日期即使是周末也会被计算为工作日。' 
                            : '这些日期即使是工作日也会被计算为休息日。'}
                    </p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800 flex justify-between items-center">
                        <span>{activeTab === 'makeup' ? '已配置补班日' : '已配置节假日'}</span>
                        <span className="text-xs font-normal text-slate-400">
                            {(activeTab === 'makeup' ? config.makeupDays : config.holidays).length} items
                        </span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {(activeTab === 'makeup' ? config.makeupDays : config.holidays).map(date => (
                            <div key={date} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-sm font-mono text-slate-600">{date}</span>
                                <button 
                                    onClick={() => handleRemoveDate(date, activeTab)}
                                    className="text-slate-400 hover:text-rose-500 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}

          {/* Field Configuration Content */}
          {activeTab === 'fields' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg mb-6 text-xs border border-emerald-100">
                      <Database className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                          <p className="font-bold mb-1">自定义列配置</p>
                          <p>系统自动检测粘贴数据的列数。您可以在此修改列名，并决定哪些字段显示在「任务详情」弹窗中。</p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      {config.fieldConfigs.map((field) => (
                          <div key={field.index} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-500 flex-shrink-0">
                                  {field.index + 1}
                              </div>
                              
                              <div className="flex-1">
                                  {editingFieldIndex === field.index ? (
                                      <div className="flex gap-2">
                                          <input 
                                              type="text" 
                                              value={editingFieldLabel}
                                              onChange={(e) => setEditingFieldLabel(e.target.value)}
                                              className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none ring-1 ring-indigo-200"
                                              autoFocus
                                              onKeyDown={(e) => e.key === 'Enter' && saveEditField()}
                                          />
                                          <button onClick={saveEditField} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">确定</button>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 group">
                                          <span className="text-sm font-medium text-slate-800">{field.label || `列 ${field.index + 1}`}</span>
                                          <button onClick={() => startEditField(field)} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Edit2 className="w-3 h-3" />
                                          </button>
                                      </div>
                                  )}
                              </div>

                              <button 
                                  onClick={() => toggleFieldVisibility(field.index)}
                                  className={`p-2 rounded-md transition-colors ${field.visibleInDetails ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                                  title={field.visibleInDetails ? "在详情中显示" : "在详情中隐藏"}
                              >
                                  {field.visibleInDetails ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                          </div>
                      ))}
                      
                      {config.fieldConfigs.length === 0 && (
                          <div className="text-center py-8 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                              粘贴数据后自动生成列配置
                          </div>
                      )}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;