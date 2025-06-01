
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { AppwriteException } from "appwrite"; // No longer using account.createEmailPasswordSession
// import { account } from "@/lib/appwrite"; // No longer using account.createEmailPasswordSession

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
// import { OAuthButtons } from "./OAuthButtons"; // OAuth is incompatible with custom DB auth flow for now
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch('/api/custom-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Login Failed",
          description: result.message || "Invalid email or password.",
          variant: "destructive",
        });
        form.setError("password", { message: result.message || "Invalid credentials" });
        return;
      }
      
      // IMPORTANT: This illustrative example does NOT handle session creation or token storage.
      // The user is technically "verified" against your custom DB but not truly "logged in"
      // with a persistent session. A real implementation would need to:
      // 1. Return a session token (e.g., JWT) from the API.
      // 2. Store this token securely on the client (e.g., HttpOnly cookie).
      // 3. Send this token with subsequent requests to protected API routes.

      toast({
        title: "Login Successful (Custom DB)",
        description: `Welcome back, ${result.user?.username || result.user?.email}! (Note: Full login/session not implemented in this example).`,
      });
      
      // For this example, we'll just redirect to dashboard.
      // A real app would store the session/user data in a global state/context.
      router.push("/dashboard");

    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected network error occurred. Please try again.",
        variant: "destructive",
      });
      form.setError("password", { message: "Invalid credentials" });
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Login (Custom DB)</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
          (Demo: Uses custom DB, not Appwrite Auth. Insecure password handling in this example.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login (Custom)"}
            </Button>
          </form>
        </Form>
        {/* 
        <OAuthButtons /> 
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Note: OAuth buttons use Appwrite's native authentication and are not compatible
          with this custom database login flow. They are disabled for this example.
        </p>
        */}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/register">Register</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
