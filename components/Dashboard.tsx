import React, { useState, useEffect, useRef } from 'react';
import { AllocationResult, AppConfig, DayAllocation, RawTask } from '../types';
import { formatDateKey } from '../utils';
import { AlertCircle, CheckCircle2, Clock, Battery, BatteryWarning, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MousePointerClick, X, Info } from 'lucide-react';

interface DashboardProps {
  result: AllocationResult | null;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  tasks: RawTask[]; // All parsed tasks for details lookup
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement<{ className?: string }>; colorClass: string }> = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
    </div>
    <div className={`p-3 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-').replace('600', '100')}`}>
      {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
    </div>
  </div>
);

const TaskDetailsModal: React.FC<{ 
    day: DayAllocation | null; 
    onClose: () => void;
    tasks: RawTask[];
    config: AppConfig;
}> = ({ day, onClose, tasks, config }) => {
    if (!day) return null;
    
    const relevantTasks = tasks.filter(t => day.taskIds.includes(t.id));
    
    // Get visible custom fields
    const visibleFields = config.fieldConfigs.filter(f => f.visibleInDetails);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{day.date} ({day.dayOfWeek})</h3>
                        <p className="text-xs text-slate-500">工时分配详情</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                            <p className="text-xs text-indigo-600 mb-1">已分配</p>
                            <p className="text-xl font-bold text-indigo-700">{day.totalAllocated.toFixed(2)} h</p>
                        </div>
                        <div className="flex-1 bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                            <p className="text-xs text-emerald-600 mb-1">剩余容量</p>
                            <p className="text-xl font-bold text-emerald-700">{day.remainingCapacity.toFixed(2)} h</p>
                        </div>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        任务列表 ({relevantTasks.length})
                    </h4>
                    
                    {relevantTasks.length > 0 ? (
                        <div className="space-y-3">
                            {relevantTasks.map(task => (
                                <div key={task.id} className="bg-slate-50 rounded-lg border border-slate-100 p-4 hover:border-indigo-100 transition-colors">
                                    <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded font-mono">{task.id}</span>
                                            <span className="font-semibold text-slate-800">{task.name || '未命名任务'}</span>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-600">{task.hours}h</span>
                                    </div>
                                    
                                    {/* Custom Fields Grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        {visibleFields.map(field => {
                                            const value = task.rawParts[field.index];
                                            if (!value) return null;
                                            return (
                                                <div key={field.index} className="flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">{field.label}</span>
                                                    <span className="text-slate-700 break-words">{value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            无任务分配
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarView: React.FC<{ 
    allocations: DayAllocation[]; 
    config: AppConfig;
    onDateContext: (date: string) => void;
    onDateSelect: (date: string) => void;
}> = ({ allocations, config, onDateContext, onDateSelect }) => {
    // Determine initial month based on data, or current month
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [lastAllocStart, setLastAllocStart] = useState<string | null>(null);

    // Only update month when the start date of the dataset changes significantly (i.e. new data loaded)
    // This prevents reset when toggling holidays (which regenerates allocations but keeps date range)
    useEffect(() => {
        if (allocations.length > 0) {
            const newStart = allocations[0].date;
            if (newStart !== lastAllocStart) {
                setCurrentMonth(new Date(newStart));
                setLastAllocStart(newStart);
            }
        }
    }, [allocations, lastAllocStart]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentMonth);
    const monthYearStr = currentMonth.toLocaleString('zh-CN', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    // Create a map for O(1) lookup of allocation data
    const allocMap = new Map<string, DayAllocation>();
    allocations.forEach(a => allocMap.set(a.date, a));

    const renderCalendarDays = () => {
        const grid = [];
        // Empty slots for days before 1st
        for (let i = 0; i < firstDay; i++) {
            grid.push(<div key={`empty-${i}`} className="bg-slate-50/50" />);
        }

        // Days
        for (let d = 1; d <= days; d++) {
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
            const dateStr = formatDateKey(dateObj);
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const isHoliday = config.holidays.includes(dateStr);
            const isMakeup = config.makeupDays.includes(dateStr);
            const allocation = allocMap.get(dateStr);
            const hours = allocation ? allocation.totalAllocated : 0;

            // Determine Status for Styling
            let bgClass = "bg-white";
            let borderClass = "border-slate-100";
            let textClass = "text-slate-700";
            let statusBadge = null;

            if (isHoliday) {
                bgClass = "bg-slate-100/60 opacity-80 repeating-linear-gradient-45"; // Simulating hash
                textClass = "text-slate-400";
                statusBadge = <span className="absolute top-1 right-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-1 rounded">休</span>;
            } else if (isMakeup) {
                bgClass = "bg-orange-50";
                statusBadge = <span className="absolute top-1 right-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-1 rounded">班</span>;
            } else if (isWeekend) {
                bgClass = "bg-slate-50";
                textClass = "text-slate-400";
                statusBadge = <span className="absolute top-1 right-1 text-[10px] font-bold text-slate-400">休</span>;
            }

            // Workload Coloring (Only for working days)
            let loadIndicator = null;
            if (!isHoliday && (isMakeup || !isWeekend)) {
                if (hours > 8) {
                    borderClass = "border-rose-300 ring-2 ring-rose-100 ring-inset";
                    loadIndicator = <div className="mt-1 text-xs font-bold text-rose-600">{hours.toFixed(1)}h</div>;
                } else if (hours === 8) {
                    borderClass = "border-indigo-300";
                    bgClass = "bg-indigo-50/30";
                    loadIndicator = <div className="mt-1 text-xs font-bold text-indigo-600">{hours.toFixed(1)}h</div>;
                } else if (hours > 0) {
                    borderClass = "border-emerald-300";
                    bgClass = "bg-emerald-50/30";
                    loadIndicator = <div className="mt-1 text-xs font-bold text-emerald-600">{hours.toFixed(1)}h</div>;
                } else {
                    // Working day but 0 hours
                    loadIndicator = <div className="mt-1 text-xs font-medium text-slate-300">-</div>;
                }
            }

            grid.push(
                <div 
                    key={dateStr}
                    onClick={() => onDateSelect(dateStr)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onDateContext(dateStr);
                    }}
                    className={`
                        relative min-h-[80px] p-2 border rounded-lg transition-all cursor-pointer hover:shadow-md
                        flex flex-col items-start justify-between group
                        ${bgClass} ${borderClass}
                    `}
                >
                    <span className={`text-sm font-semibold ${textClass}`}>{d}</span>
                    {statusBadge}
                    {loadIndicator}
                    {allocation && allocation.taskIds.length > 0 && (
                        <div className="flex gap-0.5 mt-1 max-w-full overflow-hidden">
                            {allocation.taskIds.slice(0, 3).map(tid => (
                                <div key={tid} className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            ))}
                            {allocation.taskIds.length > 3 && <span className="text-[8px] text-slate-400 leading-none">+</span>}
                        </div>
                    )}
                    
                    {/* Hover Hint */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                </div>
            );
        }
        return grid;
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    工时日历视图
                </h3>
                <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-lg">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all text-slate-500 hover:text-indigo-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold text-slate-700 w-32 text-center select-none">{monthYearStr}</span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all text-slate-500 hover:text-indigo-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4 text-xs text-slate-500 justify-end">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 不足 (&lt;8h)</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> 饱和 (8h)</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 超负荷 (&gt;8h)</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> 休息</div>
            </div>

            {/* Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
            </div>
            
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-50 p-2 rounded border border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                    <MousePointerClick className="w-3 h-3" />
                    <span className="font-semibold text-indigo-500">左键</span> 点击查看详情
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-rose-500">右键</span> 切换 工作日 / 节假日 / 补班
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ result, config, onUpdateConfig, tasks }) => {
  const [selectedDay, setSelectedDay] = useState<DayAllocation | null>(null);

  if (!result || result.stats.totalTasks === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无数据</p>
            <p className="text-sm">请在左侧输入并解析 Excel 数据</p>
        </div>
    );
  }

  const { stats, allocations, unallocatedTasks } = result;

  const handleDateContext = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    
    let newHolidays = [...config.holidays];
    let newMakeupDays = [...config.makeupDays];

    if (newHolidays.includes(dateStr)) {
        // Was Holiday -> Remove Holiday (Make Normal)
        newHolidays = newHolidays.filter(d => d !== dateStr);
    } else if (newMakeupDays.includes(dateStr)) {
        // Was Makeup -> Remove Makeup (Make Normal)
        newMakeupDays = newMakeupDays.filter(d => d !== dateStr);
    } else {
        // Was Normal
        if (isWeekend) {
            // Normal Weekend -> Make Makeup
            newMakeupDays.push(dateStr);
        } else {
            // Normal Weekday -> Make Holiday
            newHolidays.push(dateStr);
        }
    }

    onUpdateConfig({
        ...config,
        holidays: newHolidays.sort(),
        makeupDays: newMakeupDays.sort()
    });
  };

  const handleDateSelect = (dateStr: string) => {
      const allocation = allocations.find(a => a.date === dateStr);
      if (allocation) {
          setSelectedDay(allocation);
      } else {
        // Create dummy allocation for empty/holiday days to show info
        const date = new Date(dateStr);
        const dayOfWeek = date.toLocaleDateString('zh-CN', {weekday: 'short'});
        setSelectedDay({
            date: dateStr,
            dayOfWeek,
            taskIds: [],
            totalAllocated: 0,
            remainingCapacity: 0
        });
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      {/* 1. Interactive Calendar (Placed Top as requested) */}
      <CalendarView 
        allocations={allocations} 
        config={config} 
        onDateContext={handleDateContext} 
        onDateSelect={handleDateSelect}
      />

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            title="总任务数" 
            value={stats.totalTasks} 
            icon={<CheckCircle2 />} 
            colorClass="text-blue-600" 
        />
        <StatCard 
            title="总工时需求" 
            value={`${stats.totalHoursRequired} h`} 
            icon={<Clock />} 
            colorClass="text-indigo-600" 
        />
        <StatCard 
            title="未分配工时 (超限)" 
            value={`${(stats.totalHoursRequired - stats.totalHoursAllocated).toFixed(2)} h`} 
            icon={<AlertCircle />} 
            colorClass={(stats.totalHoursRequired - stats.totalHoursAllocated) > 0 ? "text-rose-600" : "text-emerald-600"} 
        />
        <StatCard 
            title="剩余闲置容量" 
            value={`${stats.totalIdleCapacity} h`} 
            icon={<Battery />} 
            colorClass="text-amber-600" 
        />
      </div>

      {/* 3. Errors / Warnings */}
      {unallocatedTasks.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-6">
              <h3 className="text-rose-800 font-bold flex items-center gap-2 mb-4">
                  <BatteryWarning className="w-5 h-5" />
                  以下任务超出时间范围，无法分配
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-rose-100/50 text-rose-900">
                        <tr>
                            <th className="px-4 py-2 rounded-l-lg">任务序号</th>
                            <th className="px-4 py-2">时间范围</th>
                            <th className="px-4 py-2 rounded-r-lg">未分配工时</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                        {unallocatedTasks.map(t => (
                            <tr key={t.id}>
                                <td className="px-4 py-2 font-medium text-rose-700">{t.id}</td>
                                <td className="px-4 py-2 text-rose-600">{t.range}</td>
                                <td className="px-4 py-2 font-bold text-rose-700">{t.remaining.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* 4. Detail Table (Full List) */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800">每日分配详情</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-semibold">
                    <tr>
                        <th className="px-6 py-3">日期</th>
                        <th className="px-6 py-3">星期</th>
                        <th className="px-6 py-3">总计工时</th>
                        <th className="px-6 py-3">包含任务 (序号)</th>
                        <th className="px-6 py-3">剩余容量</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {allocations.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{row.date}</td>
                            <td className="px-6 py-4 text-slate-500">{row.dayOfWeek}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    row.totalAllocated > 8 ? 'bg-rose-100 text-rose-800' :
                                    row.totalAllocated === 8 ? 'bg-indigo-100 text-indigo-800' :
                                    'bg-emerald-100 text-emerald-800'
                                }`}>
                                    {row.totalAllocated.toFixed(2)} h
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={row.taskIds.join(', ')}>
                                {row.taskIds.length > 0 ? row.taskIds.join(', ') : '-'}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                {row.remainingCapacity > 0 ? (
                                    <span className="text-emerald-600 font-medium">{row.remainingCapacity.toFixed(2)} h</span>
                                ) : (
                                    <span className="text-slate-400">已满</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Modal for Details */}
        <TaskDetailsModal day={selectedDay} onClose={() => setSelectedDay(null)} tasks={tasks} config={config} />
    </div>
  );
};