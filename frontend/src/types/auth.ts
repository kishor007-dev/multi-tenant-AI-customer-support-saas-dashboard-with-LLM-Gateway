export interface LoginRequest { 
  org_slug: string; 
  username: string; 
  password: string; 
} 
 
export interface SignupRequest { 
  org_name: string; 
  org_slug?: string; 
  plan?: "starter" | "pro" | "enterprise"; 
  username: string; 
  password: string; 
} 
 
export interface JoinRequest { 
  invite_token: string; 
  username: string; 
  password: string; 
} 
 
export interface TokenResponse { 
  access_token: string; 
  refresh_token: string; 
  token_type: string; 
} 
 
export interface DecodedJWT { 
  sub: string; 
  org_id: string; 
  role: string; 
  permissions: string[]; 
  username: string; 
  type: string; 
  exp: number; 
} 