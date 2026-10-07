"use client";
import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function UpgradeModal({ currentPlan, onClose, onSuccess }: any) {
  const { accessToken, setAccessToken } = useAuthStore();

  const isCurrentlyPro = currentPlan?.toLowerCase() === "pro";
  const [selectedPlan, setSelectedPlan] = React.useState<"pro" | "enterprise">(
    isCurrentlyPro ? "enterprise" : "pro"
  );

  const [loading, setLoading] = React.useState(false);

  const planPrices = {
    pro: "$29 / month",
    enterprise: "$99 / month",
  };

  const handleSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${API_BASE}/org/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          new_plan: selectedPlan,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          setAccessToken(data.access_token);
        }
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Payment failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upgrade your workspace"
      description={
        isCurrentlyPro
          ? "You are on the Pro plan. Upgrade to Enterprise to unlock maximum limits."
          : "Choose your tier and enter your simulated payment details below."
      }
    >
      <form onSubmit={handleSimulatedPayment} className="space-y-5">
        <div className={cn("grid gap-3", isCurrentlyPro ? "grid-cols-1" : "grid-cols-2")}>
          {!isCurrentlyPro && (
            <button
              type="button"
              onClick={() => setSelectedPlan("pro")}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                selectedPlan === "pro"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="text-sm font-semibold text-foreground">Pro Plan</div>
              <div className="mt-0.5 text-xs font-bold text-primary">{planPrices.pro}</div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedPlan("enterprise")}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              selectedPlan === "enterprise"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/40"
            )}
          >
            <div className="text-sm font-semibold text-foreground">Enterprise Plan</div>
            <div className="mt-0.5 text-xs font-bold text-primary">{planPrices.enterprise}</div>
          </button>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label>Cardholder Name</Label>
            <Input required type="text" placeholder="John Doe" />
          </div>

          <div className="space-y-1.5">
            <Label>Card Number (Simulated)</Label>
            <Input required type="text" placeholder="4242 4242 4242 4242" className="font-mono" />
          </div>

          <div className="flex gap-3">
            <div className="w-1/2 space-y-1.5">
              <Label>Expires</Label>
              <Input required type="text" placeholder="MM/YY" />
            </div>
            <div className="w-1/2 space-y-1.5">
              <Label>CVC</Label>
              <Input required type="text" placeholder="123" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Processing payment…" : `Pay ${planPrices[selectedPlan]}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}