export interface DailyUsage { 
  date: string; 
  prompt_tokens: number; 
  completion_tokens: number; 
  cost: number; 
} 
 
export interface UsageSummary { 
  org_id: string; 
  days: number; 
  usage: DailyUsage[]; 
} 