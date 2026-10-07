import * as React from "react";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export default function SettingsAppearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Update your UI settings.
        </p>
      </div>
      <ThemeToggle />
    </div>
  );
}
