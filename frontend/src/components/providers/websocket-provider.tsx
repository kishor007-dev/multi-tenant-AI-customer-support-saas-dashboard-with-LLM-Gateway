"use client"; 
 
import * as React from "react"; 
import { useAuthStore } from "@/lib/auth-store"; 
 
interface WebSocketContextType { 
  socket: WebSocket | null; 
  isConnected: boolean; 
} 
 
const WebSocketContext = React.createContext<WebSocketContextType>({ 
  socket: null, 
  isConnected: false, 
}); 
 
export function WebSocketProvider({ children }: { children: React.ReactNode }) { 
  const [socket, setSocket] = React.useState<WebSocket | null>(null); 
  const [isConnected, setIsConnected] = React.useState(false); 
  const token = useAuthStore((state) => state.accessToken); 
 
  React.useEffect(() => { 
    if (!token) return; 
 
    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"; 
    
    // 🔒 SECURE: Connect without the token in the URL
    const ws = new WebSocket(`${WS_BASE_URL}/ws/tickets`); 
 
    ws.onopen = () => {
      // 🔒 SECURE: Send the token as a JSON frame immediately upon connection
      ws.send(JSON.stringify({ token: token }));
      setIsConnected(true);
    };

    ws.onclose = () => setIsConnected(false); 
    ws.onerror = (err) => { 
      if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
         return;
      }
      console.error("WebSocket Error:", err); 
      setIsConnected(false); 
    }; 
 
    setSocket(ws); 
 
    return () => { 
      ws.close(); 
    }; 
  }, [token]); 
 
  return ( 
    <WebSocketContext.Provider value={{ socket, isConnected }}> 
      {children} 
    </WebSocketContext.Provider> 
  ); 
} 
 
export const useWebSocket = () => React.useContext(WebSocketContext);
