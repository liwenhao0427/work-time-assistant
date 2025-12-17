export interface RawTask {
  id: string;
  name?: string; // Task Name or Type
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  hours: number;
  rawParts: string[]; // Store all column data
}

export interface ProcessedTask extends RawTask {
  remaining: number;
  originalHours: number;
}

export interface DayAllocation {
  date: string;
  dayOfWeek: string;
  taskIds: string[];
  totalAllocated: number;
  remainingCapacity: number; // 8.0 - totalAllocated (min 0)
}

export interface AllocationResult {
  allocations: DayAllocation[];
  errors: string[]; // Tasks with remaining hours > 0
  unallocatedTasks: {
    id: string;
    remaining: number;
    range: string;
  }[];
  stats: {
    totalTasks: number;
    totalHoursRequired: number;
    totalHoursAllocated: number;
    totalIdleCapacity: number;
  };
}

export interface FieldConfig {
  index: number;
  label: string;
  visibleInDetails: boolean;
}

export interface AppConfig {
  holidays: string[]; // List of YYYY-MM-DD strings
  makeupDays: string[]; // List of YYYY-MM-DD strings
  fieldConfigs: FieldConfig[]; // Custom column configurations
}