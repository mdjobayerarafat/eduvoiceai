
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
      await account.createEmailPasswordSession(values.email, values.password);
      
      toast({
        title: "Login Successful!",
        description: `Welcome back!`,
      });
      
      router.push("/dashboard");

    } catch (error: any) {
      let toastDescription = "An unexpected error occurred. Please try again.";
      let formFieldError: string | null = "Login failed. Please check your details.";

      if (error instanceof AppwriteException) {
        if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
          toastDescription = "Network Error: Could not connect to Appwrite. Please check your internet connection, Appwrite server status, and CORS configuration in your Appwrite project settings. Ensure NEXT_PUBLIC_APPWRITE_ENDPOINT is correct.";
          formFieldError = "Network error. Please try again later.";
        } else if (error.code === 401 || error.type === 'user_invalid_credentials') {
          toastDescription = "Invalid email or password. Please check your credentials.";
          formFieldError = "Invalid email or password.";
        } else if (error.type === 'user_not_found') {
          toastDescription = "No account found with this email address.";
          formFieldError = "Account not found.";
        } else {
          toastDescription = error.message; 
          formFieldError = error.message.substring(0, 50); // Keep form error concise
        }
      } else if (error.message) {
        toastDescription = error.message;
        if (error.message.toLowerCase().includes("failed to fetch")) {
           toastDescription = "Network Error: Could not connect. Please check your internet connection and server status.";
           formFieldError = "Network error. Please try again.";
        }
      }
      
      toast({
        title: "Login Failed",
        description: toastDescription,
        variant: "destructive",
        duration: 7000,
      });
      
      if (formFieldError) {
        form.setError("email", { message: formFieldError });
      }
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
      </CardFooter>
    </Card>
  );
}
