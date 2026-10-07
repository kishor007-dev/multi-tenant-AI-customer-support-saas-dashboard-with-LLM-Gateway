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

const signupSchema = z.object({
  org_name: z.string().min(2, "Organization name must be at least 2 characters").max(80, "Organization name too long"),
  org_slug: z
    .string()
    .min(2, "URL must be at least 2 characters")
    .max(40, "URL too long")
    .regex(/^[a-z0-9-]+$/, "Lowercase and hyphens only")
    .optional(),
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormData = z.infer<typeof signupSchema>;

const fieldClass = "h-11 bg-muted/50 transition-colors duration-200 focus:bg-background";

export function SignupForm() {
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { setTokens } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    try {
      const payload = { ...data, plan: "starter" };
      const response = await apiClient.post("/auth/signup/owner", payload);

      setTokens(response.data.access_token, response.data.refresh_token);
      router.push("/overview");
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError("That organization URL is taken - try another.");
      } else {
        setError("Couldn't create your organization. Please check your details and try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-2 w-full space-y-8">
      {error && <ErrorState variant="section" message={error} />}

      <div className="space-y-4">
        <h3 className="border-b border-border pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Organization Details
        </h3>
        <div className="space-y-2">
          <Label htmlFor="org_name" className="font-semibold">
            Organization Name
          </Label>
          <Input
            id="org_name"
            type="text"
            placeholder="Acme Corp"
            className={fieldClass}
            {...register("org_name")}
          />
          {errors.org_name && <ErrorState variant="field" message={errors.org_name.message as string} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="org_slug" className="font-semibold">
            Organization URL
          </Label>
          <Input
            id="org_slug"
            type="text"
            placeholder="acme-corp"
            className={`${fieldClass} font-mono lowercase`}
            {...register("org_slug")}
          />
          {errors.org_slug && <ErrorState variant="field" message={errors.org_slug.message as string} />}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="border-b border-border pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Owner Account
        </h3>
        <div className="space-y-2">
          <Label htmlFor="username" className="font-semibold">
            Username
          </Label>
          <Input id="username" type="text" className={fieldClass} {...register("username")} />
          {errors.username && <ErrorState variant="field" message={errors.username.message as string} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="font-semibold">
            Password
          </Label>
          <Input id="password" type="password" className={fieldClass} {...register("password")} />
          {errors.password && <ErrorState variant="field" message={errors.password.message as string} />}
        </div>
      </div>

      <Button
        type="submit"
        className="mt-6 h-11 w-full text-base font-semibold shadow-soft transition-all active:scale-[0.98]"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}