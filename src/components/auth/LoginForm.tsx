
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppwriteException } from "appwrite"; 
import { account } from "@/lib/appwrite"; 

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
import { OAuthButtons } from "./OAuthButtons"; 
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
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
      // Use Appwrite's native email/password session creation
      await account.createEmailPasswordSession(values.email, values.password);
      
      toast({
        title: "Login Successful!",
        description: `Welcome back!`,
      });
      
      // Redirect to dashboard or intended page
      router.push("/dashboard");

    } catch (error: any) {
      let description = "An unexpected error occurred. Please try again.";
      if (error instanceof AppwriteException) {
        if (error.code === 401 || error.type === 'user_invalid_credentials') {
          description = "Invalid email or password. Please check your credentials.";
        } else if (error.type === 'user_not_found') {
          description = "No account found with this email address.";
        } else {
          description = error.message; // Use Appwrite's error message
        }
      } else if (error.message) {
        description = error.message;
      }
      toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      });
      // Optionally set form error for a more integrated feel, though toast is often sufficient
      form.setError("password", { message: "Invalid credentials" }); // Generic error on a field
    }
  }

  return (
    <Card className="w-full"> 
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Login to EduVoice AI</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
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
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
        
        <OAuthButtons /> 
        
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/register">Register</Link>
          </Button>
        </p>
        {/* You can add a password reset link here if you implement that feature */}
        {/* <Button variant="link" size="sm" asChild className="text-xs p-0 h-auto">
            <Link href="/(auth)/reset-password">Forgot Password?</Link>
        </Button> */}
      </CardFooter>
    </Card>
  );
}
