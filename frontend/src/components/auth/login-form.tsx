"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/error-state";

const loginSchema = z.object({
  org_slug: z
    .string()
    .min(1, "Organization URL is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase and hyphens only"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const fieldClass = "h-11 bg-muted/50 transition-colors duration-200 focus:bg-background";

export function LoginForm() {
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const response = await apiClient.post("/auth/login", data);
      setTokens(response.data.access_token, response.data.refresh_token);
      router.push("/overview");
    } catch (err: any) {
      setError("Couldn't sign you in — check your org, username, and password");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && <ErrorState variant="section" message={error} />}

      <div className="space-y-2">
        <Label htmlFor="org_slug">Organization URL</Label>
        <Input
          id="org_slug"
          type="text"
          placeholder="acme-corp"
          className={cnField("font-mono lowercase")}
          {...register("org_slug")}
        />
        {errors.org_slug && <ErrorState variant="field" message={errors.org_slug.message as string} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" type="text" className={fieldClass} {...register("username")} />
        {errors.username && <ErrorState variant="field" message={errors.username.message as string} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" className={fieldClass} {...register("password")} />
        {errors.password && <ErrorState variant="field" message={errors.password.message as string} />}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function cnField(extra: string) {
  return `${fieldClass} ${extra}`;
}