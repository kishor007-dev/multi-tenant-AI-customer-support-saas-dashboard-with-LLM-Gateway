import { create } from "zustand"; 
import { persist, createJSONStorage } from "zustand/middleware"; 
import { jwtDecode } from "jwt-decode"; 
 
interface AuthState { 
  accessToken: string | null; 
  refreshToken: string | null; 
  isAuthenticated: boolean; 
  userId: string | null; 
  setTokens: (access: string, refresh: string) => void; 
  setAccessToken: (access: string) => void; 
  clearAuth: () => void; 
} 
 
export const useAuthStore = create<AuthState>()( 
  persist( 
    (set) => ({ 
      accessToken: null, 
      refreshToken: null, 
      isAuthenticated: false, 
      userId: null, 
      setTokens: (access: string, refresh: string) => { 
        let decodedId = null; 
        try { 
          if (access) { 
            const decoded: any = jwtDecode(access); 
            decodedId = decoded.sub || decoded.user_id || null; 
          } 
        } catch (error) { 
          console.error("Failed to decode token", error); 
        } 
         
        set({ 
          accessToken: access, 
          refreshToken: refresh, 
          isAuthenticated: true, 
          userId: decodedId, 
        }); 
      }, 
      setAccessToken: (access: string) => { 
        let decodedId = null; 
        try { 
          if (access) { 
            const decoded: any = jwtDecode(access); 
            decodedId = decoded.sub || decoded.user_id || null; 
          } 
        } catch (error) { 
          console.error("Failed to decode token", error); 
        } 

        set({ 
          accessToken: access, 
          isAuthenticated: true, 
          userId: decodedId, 
        }); 
      }, 
      clearAuth: () => set({  
        accessToken: null,  
        refreshToken: null,  
        isAuthenticated: false, 
        userId: null 
      }), 
    }), 
    { 
      name: "auth-storage", 
      storage: createJSONStorage(() => typeof window !== "undefined" ? window.localStorage : dummyStorage), 
    } 
  ) 
); 
 
// Fallback for SSR 
const dummyStorage = { 
  getItem: () => null, 
  setItem: () => {}, 
  removeItem: () => {}, 
};
