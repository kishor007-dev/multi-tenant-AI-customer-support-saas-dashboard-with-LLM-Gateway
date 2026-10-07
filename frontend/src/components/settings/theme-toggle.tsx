"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; 
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the theme for your dashboard. This is saved locally to your device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            className="flex-1 justify-start gap-3 h-12"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-5 w-5" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            className="flex-1 justify-start gap-3 h-12"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-5 w-5" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            className="flex-1 justify-start gap-3 h-12"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-5 w-5" />
            System
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
