"use client"; 
 
import * as React from "react"; 
import { ThemeProvider } from "./theme-provider"; 
import { QueryProvider } from "./query-provider"; 
import { AuthProvider } from "./auth-provider"; 
import { WebSocketProvider } from "./websocket-provider"; 
import { Toaster } from "@/components/ui/toaster"; 
 
export function AppProvider({ children }: { children: React.ReactNode }) { 
  return ( 
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      disableTransitionOnChange 
    > 
      <QueryProvider> 
        <AuthProvider> 
          <WebSocketProvider> 
            {children} 
            <Toaster /> 
          </WebSocketProvider> 
        </AuthProvider> 
      </QueryProvider> 
    </ThemeProvider> 
  ); 
}