import * as React from "react";
import { OrganizationInfoCard } from "@/components/settings/organization-info-card";

export default function SettingsOrganizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organization</h3>
        <p className="text-sm text-muted-foreground">
          View your tenant details and plan.
        </p>
      </div>
      <OrganizationInfoCard />
    </div>
  );
}
