import * as React from "react";
import { Sparkles, MessageSquareText, GitBranch, ShieldCheck } from "lucide-react";
import { AuthTransition } from "@/components/auth/auth-transition";

const FEATURES = [
  { icon: MessageSquareText, text: "Answers customers from your own knowledge base" },
  { icon: GitBranch, text: "Escalates to a human the moment it's unsure" },
  { icon: ShieldCheck, text: "Every action logged for audit and review" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full">
          <AuthTransition>{children}</AuthTransition>
        </div>
      </div>

      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar px-16 py-16 lg:flex">
        {/* Faint AI-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--sidebar-foreground)) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient gradient blobs */}
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl motion-safe:animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div
          className="pointer-events-none absolute -bottom-52 -left-24 h-[28rem] w-[28rem] rounded-full bg-violet/10 blur-3xl motion-safe:animate-pulse"
          style={{ animationDuration: "8s", animationDelay: "1s" }}
        />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-64 w-64 rounded-full bg-success/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-bg font-bold fontstyle-timesnewroman tracking-tight text-sidebar-foreground">
            SupportAI
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-sidebar-foreground">
            Support that resolves itself, escalates when it shouldn&apos;t.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-muted-foreground">
            One workspace for your team and your AI copilot to handle customer conversations together.
          </p>

          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 flex items-start gap-3 text-sm text-sidebar-foreground/90 motion-safe:duration-500 motion-safe:fill-mode-both"
                style={{ animationDelay: `${150 + i * 120}ms` }}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-sidebar-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-muted-foreground">
          © {new Date().getFullYear()} SupportAI
        </p>
      </div>
    </div>
  );
}