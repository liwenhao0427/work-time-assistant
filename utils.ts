import { RawTask, ProcessedTask, AppConfig, AllocationResult, DayAllocation, FieldConfig } from './types';

// Helper to format date as YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseDateString = (str: string): Date | null => {
  if (!str) return null;
  // Handle various formats: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const cleanStr = str.trim().replace(/\/|\./g, '-');
  
  // Attempt to parse
  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) return null;
  
  // Basic sanity check (e.g. year must be > 2000)
  if (date.getFullYear() < 2000) return null;
  
  return date;
};

export const getWeekdayName = (date: Date): string => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
};

export const isWorkday = (dateStr: string, config: AppConfig): boolean => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  
  // Check explicit holidays (rest days)
  if (config.holidays.includes(dateStr)) return false;

  // Check explicit makeup days (work days)
  if (config.makeupDays.includes(dateStr)) return true;

  // Default: Sat/Sun are rest, others work
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  return true;
};

export const parseInputData = (text: string): RawTask[] => {
  const lines = text.trim().split('\n');
  const tasks: RawTask[] = [];

  lines.forEach(line => {
    // Split logic: Prefer Tab, then Pipe, then Space
    let parts: string[];
    if (line.includes('\t')) {
        parts = line.split('\t');
    } else if (line.includes('|')) {
        parts = line.split('|');
    } else {
        parts = line.trim().split(/\s+/);
    }
    
    // Keep empty strings to maintain column index alignment if split by tab/pipe
    // For space split, we usually filter empty, but to support index editing we need consistency.
    // However, split(/\s+/) handles multiple spaces as one separator, so we don't get empty strings usually.
    if (!line.includes('\t') && !line.includes('|')) {
         parts = parts.filter(s => s !== '');
    } else {
         parts = parts.map(s => s.trim());
    }

    // Ignore empty lines
    if (parts.length < 3) return;

    // Skip header row if it looks like a header
    if (parts[0].includes('序号') || parts[0].includes('ID')) return;

    const id = parts[0];
    const start = parseDateString(parts[1]);
    let end = parseDateString(parts[2]);
    let hours = 0;
    let name = '';

    // Heuristic for Type/Name and Hours
    // Try to find the first numeric value after column 2 that looks like hours (< 24 usually, or just a number)
    // Common formats:
    // ID | Start | End | Hours
    // ID | Start | End | Name | Hours
    // ID | Start | End | Name | Hours | ...
    
    // Strategy: Look at index 3 and 4 specifically as they are most common
    if (parts.length >= 5) {
        // Check col 4 (index 4) for hours first (Format: ID S E Name Hours)
        const p4 = parseFloat(parts[4]);
        if (!isNaN(p4)) {
            hours = p4;
            name = parts[3];
        } else {
            // Check col 3 (index 3) (Format: ID S E Hours Name/Desc)
            const p3 = parseFloat(parts[3]);
            if (!isNaN(p3)) {
                hours = p3;
                name = parts[4] || ''; // Use next col as name if hours is at 3
            }
        }
    } else if (parts.length === 4) {
        // ID S E Hours
        const p3 = parseFloat(parts[3]);
        if (!isNaN(p3)) {
            hours = p3;
        } else {
            // ID S E Name (Missing hours?)
            name = parts[3];
        }
    }

    if (id && start && !isNaN(hours) && hours > 0) {
      tasks.push({
        id,
        name,
        start: formatDateKey(start),
        end: end ? formatDateKey(end) : '', 
        hours,
        rawParts: parts // Store raw split data for custom fields
      });
    }
  });

  // Handle empty end dates
  if (tasks.length > 0) {
    let maxEndDateStr = '';
    tasks.forEach(t => {
      if (t.end && t.end > maxEndDateStr) maxEndDateStr = t.end;
    });
    
    tasks.forEach(t => {
      if (!t.end) t.end = maxEndDateStr || t.start; 
    });
  }

  return tasks;
};

export const processWorkHours = (tasks: RawTask[], config: AppConfig): AllocationResult => {
  // 1. Prepare tasks
  const activeTasks: ProcessedTask[] = tasks
    .filter(t => t.start <= t.end) // Basic validation
    .map(t => ({
      ...t,
      originalHours: t.hours,
      remaining: t.hours
    }));

  if (activeTasks.length === 0) {
    return {
      allocations: [],
      errors: [],
      unallocatedTasks: [],
      stats: { totalTasks: 0, totalHoursRequired: 0, totalHoursAllocated: 0, totalIdleCapacity: 0 }
    };
  }

  // 2. Determine date range
  let minStart = activeTasks[0].start;
  let maxEnd = activeTasks[0].end;

  activeTasks.forEach(t => {
    if (t.start < minStart) minStart = t.start;
    if (t.end > maxEnd) maxEnd = t.end;
  });

  // 3. Generate workday list
  const workdays: string[] = [];
  const current = new Date(minStart);
  const end = new Date(maxEnd);

  while (current <= end) {
    const dateStr = formatDateKey(current);
    if (isWorkday(dateStr, config)) {
      workdays.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }

  // 4. Greedy Allocation
  const allocations: DayAllocation[] = [];
  let totalHoursAllocated = 0;

  workdays.forEach(day => {
    // Find tasks valid for this day
    const availableTasks = activeTasks.filter(t => t.start <= day && day <= t.end && t.remaining > 0);
    
    // Sort by End Date ascending (Earliest Deadline First)
    availableTasks.sort((a, b) => {
        if (a.end !== b.end) return a.end < b.end ? -1 : 1;
        return 0;
    });

    let dailyCapacity = 8.0;
    let dailyAllocated = 0;
    const taskIdsInDay: string[] = [];

    for (const task of availableTasks) {
      if (dailyCapacity <= 0) break;
      
      const alloc = Math.min(task.remaining, dailyCapacity);
      task.remaining -= alloc;
      // Precision fix for floating point
      task.remaining = Math.round(task.remaining * 100) / 100;
      
      dailyCapacity -= alloc;
      dailyAllocated += alloc;
      
      if (alloc > 0) {
        taskIdsInDay.push(task.id);
      }
    }

    totalHoursAllocated += dailyAllocated;

    allocations.push({
      date: day,
      dayOfWeek: getWeekdayName(new Date(day)),
      taskIds: taskIdsInDay,
      totalAllocated: Math.round(dailyAllocated * 100) / 100,
      remainingCapacity: Math.round(Math.max(0, 8.0 - dailyAllocated) * 100) / 100
    });
  });

  // 5. Gather Results
  const totalHoursRequired = activeTasks.reduce((sum, t) => sum + t.originalHours, 0);
  const totalIdleCapacity = allocations.reduce((sum, d) => sum + d.remainingCapacity, 0);
  
  const unallocatedTasks = activeTasks
    .filter(t => t.remaining > 0)
    .map(t => ({
      id: t.id,
      remaining: t.remaining,
      range: `${t.start} ~ ${t.end}`
    }));

  const errors = unallocatedTasks.map(t => `任务序号 ${t.id}：剩余 ${t.remaining} 小时无法分配`);

  return {
    allocations,
    errors,
    unallocatedTasks,
    stats: {
      totalTasks: tasks.length,
      totalHoursRequired: Math.round(totalHoursRequired * 100) / 100,
      totalHoursAllocated: Math.round(totalHoursAllocated * 100) / 100,
      totalIdleCapacity: Math.round(totalIdleCapacity * 100) / 100
    }
  };
};

export const PRESET_CONFIG_2025: AppConfig = {
    holidays: [
        '2025-01-01', // New Year
        '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', // Spring Festival (Approx)
        '2025-04-04', // Qingming
        '2025-05-01', '2025-05-02', '2025-05-03', // Labor Day
        '2025-06-02', // Dragon Boat
        '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07' // National Day
    ],
    makeupDays: [
        '2025-01-26', '2025-02-08', // Spring Festival Makeup
        '2025-04-27', // Labor Day Makeup
        '2025-09-28', '2025-10-11' // National Day Makeup
    ],
    fieldConfigs: [
        { index: 0, label: '序号', visibleInDetails: true },
        { index: 1, label: '开始时间', visibleInDetails: true },
        { index: 2, label: '结束时间', visibleInDetails: true },
        { index: 3, label: '任务类型', visibleInDetails: true },
        { index: 4, label: '预估工时', visibleInDetails: true },
    ]
};