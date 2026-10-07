import * as React from "react";
import { ProfileForm } from "@/components/settings/profile-form";

export default function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          View your assigned username and access role.
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
