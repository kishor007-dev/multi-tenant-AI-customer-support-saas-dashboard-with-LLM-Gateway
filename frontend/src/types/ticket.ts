export type TicketStatus = "open" | "in_progress" | "resolved"; 
export type TicketPriority = "low" | "medium" | "high" | "urgent"; 
 
export interface TicketOut { 
  id: string; 
  org_id: string; 
  conversation_id?: string; 
  subject: string; 
  description?: string; 
  status: TicketStatus; 
  priority: TicketPriority; 
  assigned_to?: string; 
  created_by: string; 
  created_at: string; 
  updated_at: string; 
} 
 
export interface TicketCreate { 
  conversation_id?: string; 
  subject: string; 
  description?: string; 
  priority?: TicketPriority; 
  assigned_to?: string; 
} 
 
export interface TicketUpdate { 
  status?: TicketStatus; 
  priority?: TicketPriority; 
  subject?: string; 
  description?: string; 
} 
 
export interface TicketReply { 
  message: string; 
} 