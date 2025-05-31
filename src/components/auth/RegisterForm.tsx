
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
    try {
      await account.create('unique()', values.email, values.password, values.username);
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. You are now logged in.",
      });
      router.push("/dashboard"); 

    } catch (error: any) {
      console.error("Registration error object:", error); // Log the actual error object

      let finalErrorMessage: string;

      if (error instanceof AppwriteException) {
        finalErrorMessage = error.message; // Appwrite's message is usually good
        if (error.code === 409) { // User with the same email already exists
            form.setError("email", { message: "This email is already registered." });
            finalErrorMessage = "This email is already registered. Try logging in or using a different email.";
        } else if (error.type === 'user_password_short' || error.message.toLowerCase().includes('password')) {
             form.setError("password", { message: error.message });
        } else if (error.type === 'user_name_invalid' || error.message.toLowerCase().includes('name')) {
            form.setError("username", { message: error.message });
        } else {
            // For other Appwrite errors, set a root error
            form.setError("root", { message: error.message });
        }
      } else {
        // Non-Appwrite Error
        if (error && error.message) {
          finalErrorMessage = `An unexpected error occurred: ${error.message}. Please check your network connection and Appwrite server configuration (endpoint, project ID, platform hostname).`;
        } else {
          finalErrorMessage = "An unexpected error occurred. Please check your network connection and Appwrite server configuration. The server might be unreachable or not configured for this domain.";
        }
        form.setError("root", { message: finalErrorMessage });
      }

      toast({
        title: "Registration Failed",
        description: finalErrorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
        <CardDescription>Join EduVoice AI to start your learning journey.</CardDescription>
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
            {form.formState.errors.root && (
              <FormMessage>{form.formState.errors.root.message}</FormMessage>
            )}
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
