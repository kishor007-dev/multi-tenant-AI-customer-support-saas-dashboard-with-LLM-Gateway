"use client"; 
 
import * as React from "react"; 
import { useAuthStore } from "@/lib/auth-store"; 
 
export function AuthProvider({ children }: { children: React.ReactNode }) { 
  const [isMounted, setIsMounted] = React.useState(false); 
 
  React.useEffect(() => { 
    setIsMounted(true); 
    // Note: Do NOT call GET /auth/me or GET /org/me per backend restrictions. 
    // Auth relies strictly on token presence and validation intercepts. 
  }, []); 
 
  if (!isMounted) { 
    return null; // Prevents hydration mismatch while Zustand persists state 
  } 
 
  return <>{children}</>; 
}