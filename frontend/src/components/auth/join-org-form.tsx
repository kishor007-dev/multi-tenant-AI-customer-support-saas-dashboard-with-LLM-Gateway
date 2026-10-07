"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; import * as z from "zod";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle }
from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { InviteInvalidState } from "./invite-invalid-state";
const joinSchema = z.object({
username: z.string().min(3, "Username must be at least 3characters").max(50, "Username too long"),
password: z.string().min(8, "Password must be at least 8characters"),
});
type JoinFormData = z.infer<typeof joinSchema>;
export function JoinOrgForm({ token }: { token: string }) {
const [error, setError] = React.useState<string | null>(null);
const [isInvalidToken, setIsInvalidToken] =
React.useState<boolean>(false);
const router = useRouter();
const { setTokens } = useAuthStore();
const {
register,
handleSubmit,
formState: { errors, isSubmitting },
} = useForm<JoinFormData>({
resolver: zodResolver(joinSchema),
});
const onSubmit = async (data: JoinFormData) => {
setError(null);
try {
const payload = {
invite_token: token,
username: data.username,
password: data.password,
};
const response = await apiClient.post("/org/join", payload);
setTokens(response.data.access_token,
response.data.refresh_token); router.push("/overview");
} catch (err: any) {
if (err.response?.status === 400 || err.response?.status === 403
|| err.response?.status === 404) {
setIsInvalidToken(true);
} else {
setError("Couldn't join the organization. Please check your details and try again.");
}
}
};
if (isInvalidToken) {
return <InviteInvalidState />;
}
return (
<Card className="w-full">
<CardHeader className="text-center">
<CardTitle className="text-2xl font-bold">Join
Organization</CardTitle>
<CardDescription>Set up your account to accept the
invite</CardDescription>
</CardHeader>
<CardContent>
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
{error && <ErrorState variant="section" message={error} />}
<div className="space-y-2">
<Label htmlFor="username">Username</Label>
<Input id="username" type="text" {...register("username")}
/>
{errors.username && <ErrorState variant="field"
message={errors.username.message as string} />}
</div>
<div className="space-y-2">
<Label htmlFor="password">Password</Label>
<Input id="password" type="password"
{...register("password")} />
{errors.password && <ErrorState variant="field"
message={errors.password.message as string} />}
</div>
<Button type="submit" className="w-full mt-6"
disabled={isSubmitting}>
{isSubmitting ? "Joining..." : "Join Workspace"}
</Button> </form>
</CardContent>
</Card>
);
}
