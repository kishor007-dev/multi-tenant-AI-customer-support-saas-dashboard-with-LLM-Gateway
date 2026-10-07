"use client"; 
 
import * as React from "react"; 
 
export type ToastProps = { 
  id: string; 
  title?: string; 
  description?: string; 
  variant?: "default" | "destructive"; 
}; 
 
type ToastAction = 
  | { type: "ADD_TOAST"; toast: ToastProps } 
  | { type: "DISMISS_TOAST"; toastId: string }; 
 
const toastReducer = (state: ToastProps[], action: ToastAction) => { 
  switch (action.type) { 
    case "ADD_TOAST": 
      return [action.toast, ...state]; 
    case "DISMISS_TOAST": 
      return state.filter((t) => t.id !== action.toastId); 
    default: 
      return state; 
  } 
}; 
 
let memoryState: ToastProps[] = []; 
let listeners: React.Dispatch<ToastAction>[] = []; 
 
export function toast(props: Omit<ToastProps, "id">) { 
  const id = Math.random().toString(36).slice(2, 9); 
  const newToast = { ...props, id }; 
  const action: ToastAction = { type: "ADD_TOAST", toast: newToast }; 
   
  memoryState = toastReducer(memoryState, action); 
  listeners.forEach((listener) => listener(action)); 
 
  setTimeout(() => { 
    const dismissAction: ToastAction = { type: "DISMISS_TOAST", toastId: id }; 
    memoryState = toastReducer(memoryState, dismissAction); 
    listeners.forEach((listener) => listener(dismissAction)); 
  }, 3000); 
} 
 
export function useToast() { 
  const [toasts, dispatch] = React.useReducer(toastReducer, memoryState); 
 
  React.useEffect(() => { 
    listeners.push(dispatch); 
    return () => { 
      listeners = listeners.filter((l) => l !== dispatch); 
    }; 
  }, []); 
 
  return { toasts, toast }; 
} 