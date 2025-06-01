
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(128, { message: "Username cannot exceed 128 characters."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (typeof window === 'undefined') return;
    form.clearErrors(); 

    try {
      // The backend API /api/custom-auth/register now handles:
      // 1. Creating user in Appwrite Auth
      // 2. Creating corresponding document in custom 'users' collection with initial tokens
      const response = await fetch('/api/custom-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      let result;
      let responseTextForError = "";
      try {
        if (!response.ok) {
          // Try to get text for error context if JSON parsing fails
          responseTextForError = await response.text();
        }
        result = JSON.parse(responseTextForError || await response.text()); // If responseTextForError is empty, parse original text
      } catch (jsonError: any) {
        console.error("API response was not valid JSON. Status:", response.status, "Raw response snippet:", responseTextForError.substring(0, 500) || "Response body was empty or unreadable.");
        toast({
          title: "Registration Failed",
          description: `Received an invalid response from the server (status ${response.status}). ${responseTextForError ? `Details: ${responseTextForError.substring(0,100)}...` : 'Please check server logs.'}`,
          variant: "destructive",
        });
        return;
      }

      if (!response.ok) {
        toast({
          title: "Registration Failed",
          description: result.message || "An unknown error occurred during registration.",
          variant: "destructive",
        });
        if (result.type === 'user_email_already_exists' || result.message?.toLowerCase().includes('email already exists')) {
            form.setError("email", {message: "This email address is already in use."});
        } else if (result.type === 'user_already_exists' || result.message?.toLowerCase().includes('user already exists')) {
             form.setError("username", {message: "This username is already taken."});
        }
        return;
      }
      
      toast({
        title: "Registration Successful!",
        description: `Your account for ${values.email} has been created. Please log in.`,
      });
      router.push("/login"); // Redirect to login page after successful registration

    } catch (error: any) {
      console.error("Network or unexpected error during registration:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected network error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Join EduVoice AI to start your learning journey. 
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="yourusername" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              {form.formState.isSubmitting ? "Creating Account..." : "Register"}
            </Button>
          </form>
        </Form>
        
        <OAuthButtons /> 
        
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/login">Login</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
