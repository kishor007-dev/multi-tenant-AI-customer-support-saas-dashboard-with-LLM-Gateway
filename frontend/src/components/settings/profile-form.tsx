"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { jwtDecode } from "jwt-decode";

export function ProfileForm() {
  const { accessToken } = useAuthStore();

  let username = "Unknown";
  let role = "Unknown";
  let userId = "Unknown";

  if (accessToken) {
    try {
      const decoded: any = jwtDecode(accessToken);
      username = decoded.username || "Unknown";
      role = decoded.role || "Unknown";
      userId = decoded.sub || decoded.user_id || "Unknown";
    } catch (e) {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>
          Your personal account information. Profile updates are currently unsupported by the backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} readOnly className="bg-muted/50 cursor-not-allowed" />
        </div>
        
        <div className="space-y-2 pt-2">
          <Label>Assigned Role</Label>
          <div className="pt-1">
            <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
              {role}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2 pt-4">
          <Label htmlFor="userId">User ID</Label>
          <Input id="userId" value={userId} readOnly className="font-mono text-xs bg-muted/50 cursor-not-allowed" />
        </div>
      </CardContent>
    </Card>
  );
}
