import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { Metadata } from "next";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Workspace | SupportAI",
};

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[85dvh] w-full max-w-lg flex-col justify-center gap-6 px-4 py-8 lg:min-h-0 lg:px-0 lg:py-0">
      <div className="mb-2 flex flex-col items-center gap-3 lg:hidden">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-aurora opacity-20 blur-md" />
          <Sparkles className="h-6 w-6" />
        </div>
        <span className="text-base font-bold tracking-tight text-foreground">Auto-Resolution Copilot</span>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-primary/10 bg-card p-6 shadow-soft-lg sm:p-8 lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="text-center lg:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your workspace</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Set up your organization and owner account</p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          Already have an organization?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}