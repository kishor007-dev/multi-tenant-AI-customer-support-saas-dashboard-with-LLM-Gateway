"use client"; import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { jwtDecode } from "jwt-decode";
interface RoleGateProps {
allowedRoles: string[];
children: React.ReactNode;
fallback?: React.ReactNode;
}
/**
* RoleGate ensures UI-level visibility based on the authenticated
user's role.
* IMPORTANT: This is NOT a security boundary. The backend remains
authoritative.
*/
export function RoleGate({ allowedRoles, children, fallback = null }:
RoleGateProps) {
const { accessToken } = useAuthStore();
const role = React.useMemo(() => {
if (!accessToken) return null;
try {
// Decode role directly from JWT to avoid broken /auth/me endpoint
const decoded: any = jwtDecode(accessToken);
return decoded.role || null;
} catch (e) {
return null;
}
}, [accessToken]);
// If no role is found, render fallback
if (!role) {
return <>{fallback}</>;
}
// If allowedRoles is populated, check membership
if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
return <>{fallback}</>;
}
return <>{children}</>;
}
