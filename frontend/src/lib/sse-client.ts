import { useAuthStore } from "./auth-store";
import { GatewayChatRequest } from "@/types/chat";

/**
 * Handles raw text/event-stream connection strictly via POST
 * for the documented SSE contract: POST /api/v1/gateway/chat/stream
 */
export async function streamGatewayChat(
  payload: GatewayChatRequest,
  onToken: (token: string) => void,
  signal?: AbortSignal,
  isRetry: boolean = false // Flag to prevent infinite retry loops
): Promise<void> {
  const { accessToken, refreshToken, setTokens, clearAuth } = useAuthStore.getState();
  
  // Normalize base URL
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_BASE_URL = RAW_BASE_URL.replace(/\/$/, "");

  const response = await fetch(`${API_BASE_URL}/api/v1/gateway/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  // 🔒 Catch 401 Unauthorized explicitly to handle token refresh
  if (response.status === 401 && !isRetry) {
    if (!refreshToken) {
      clearAuth();
      if (typeof window !== "undefined") window.location.href = "/login?session_expired=true";
      throw new Error("Session expired. No refresh token found.");
    }

    try {
      // Manually request a new token
      
      const refreshEndpoint = `${API_BASE_URL}/auth/refresh`;


      const refreshRes = await fetch(refreshEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshRes.ok) {
        throw new Error("Refresh token expired or invalid");
      }

      const data = await refreshRes.json();
      
      // Update global store with the new tokens
      setTokens(data.access_token, data.refresh_token || refreshToken);

      // Re-run the exact same stream function, but flag it as a retry so we don't loop
      return streamGatewayChat(payload, onToken, signal, true);

    } catch (refreshError) {
      clearAuth();
      if (typeof window !== "undefined") window.location.href = "/login?session_expired=true";
      throw new Error("Session expired and could not be refreshed.");
    }
  }

  if (!response.ok) {
    // Map native fetch errors to match Axios error structure so ChatComposer can natively detect 429/402
    const error: any = new Error(`Stream failed with status ${response.status}`);
    error.response = { status: response.status };
    throw error;
  }

  if (!response.body) {
    throw new Error("ReadableStream not supported in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Maintain buffer to safely handle tokens split across network chunk boundaries
      buffer += decoder.decode(value, { stream: true });

      // Handle both \n and \r\n backend line endings safely
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || ""; // Keep the last potentially incomplete line in the buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const token = line.slice(6);
          if (token.trim() === "[DONE]") return;
          onToken(token);
        }
      }
    }

    // Flush any remaining buffered data if the stream closes without a trailing newline
    if (buffer.startsWith("data: ")) {
      const token = buffer.slice(6);
      if (token.trim() !== "[DONE]") {
        onToken(token);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
