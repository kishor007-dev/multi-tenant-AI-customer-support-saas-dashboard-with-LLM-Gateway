"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";

export function OrganizationInfoCard() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [orgDetails, setOrgDetails] = React.useState({
    name: "",
    slug: "",
  });

  let orgId = "Unknown";
  if (accessToken) {
    try {
      const decoded: any = jwtDecode(accessToken);
      orgId = decoded.org_id || "Unknown";
    } catch (e) {
      // ignore
    }
  }

  React.useEffect(() => {
    async function fetchOrgDetails() {
      if (!accessToken) return;
      
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        const res = await fetch(`${API_BASE}/org`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setOrgDetails({
            name: data.name || "My Workspace",
            slug: data.slug || "my-workspace",
          });
        } else {
          throw new Error("Backend not ready or returned an error");
        }
      } catch (error) {
        // Fallback for UI testing if the backend API endpoint isn't fully built yet
        setOrgDetails({
          name: "Acme Corp",
          slug: "acme-corp",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchOrgDetails();
  }, [accessToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>
          Basic information about your tenant workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center text-sm text-muted-foreground py-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading organization data...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input 
                id="orgName" 
                value={orgDetails.name} 
                readOnly 
                className="bg-muted/50 cursor-default" 
              />
            </div>
            
            <div className="space-y-2 pt-1">
              <Label htmlFor="orgSlug">Workspace Slug</Label>
              <Input 
                id="orgSlug" 
                value={orgDetails.slug} 
                readOnly 
                className="bg-muted/50 cursor-default text-muted-foreground" 
              />
            </div>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t border-border">
          <Label htmlFor="orgId">Organization ID</Label>
          <Input 
            id="orgId" 
            value={orgId} 
            readOnly 
            className="font-mono text-xs bg-muted/50 cursor-not-allowed" 
          />
        </div>
      </CardContent>
    </Card>
  );
}