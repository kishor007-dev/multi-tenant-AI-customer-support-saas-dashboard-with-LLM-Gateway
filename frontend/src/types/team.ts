export type MemberRole = "owner" | "admin" | "agent" | "viewer"; 
 
export interface TeamMember { 
  id: string; 
  username: string; 
  role: MemberRole; 
  invited_by?: string; 
  created_at: string; 
} 
 
export interface InviteRequest { 
  role: MemberRole; 
  username?: string; 
} 
 
export interface InviteResponse { 
  invite_token: string; 
} 