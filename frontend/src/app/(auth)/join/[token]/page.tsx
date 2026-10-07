import * as React from "react";
import { JoinOrgForm } from "@/components/auth/join-org-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Workspace | AI Support",
};

export default function JoinPage({ params }: { params: { token: string } }) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto py-8">
      <div className="flex justify-center mb-2">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-xl">AI</span>
        </div>
      </div>
      
      <JoinOrgForm token={params.token} />
    </div>
  );
}
