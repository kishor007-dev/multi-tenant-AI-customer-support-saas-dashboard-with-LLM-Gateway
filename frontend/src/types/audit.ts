export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}
