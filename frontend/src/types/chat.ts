export interface ChatMessage { 
  role: "system" | "user" | "assistant"; 
  content: string; 
  user_id?: string; 
  model?: string; 
  created_at?: string; 
  is_human_agent?: boolean; 
  agent_id?: string; 
} 
 
export interface ConversationOut { 
  id: string; 
  org_id: string; 
  user_id: string; 
  messages: ChatMessage[]; 
  handed_off: boolean; 
  status?: string; 
  created_at: string; 
  updated_at: string; 
} 
 
export interface ChatEscalateRequest { 
  priority?: "low" | "medium" | "high"; 
  reason?: string; 
} 
 
export interface GatewayChatRequest { 
  project_id:string;
  messages: { role: string; content: string }[]; 
  conversation_id?: string; 
  max_tokens?: number; 
  temperature?: number; 
} 