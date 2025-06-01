
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

const INITIAL_FREE_TOKENS = 60000;

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
      const newUser = await account.create('unique()', values.email, values.password, values.username);
      
      await account.createEmailPasswordSession(values.email, values.password);

      try {
        const tokenUpdateResponse = await fetch('/api/user/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: newUser.$id, 
            token_balance: INITIAL_FREE_TOKENS,
            subscription_status: 'free_tier', 
          }),
        });

        if (!tokenUpdateResponse.ok) {
          let errorData = { message: "Failed to set initial tokens. Server responded with an error." };
          try {
            errorData = await tokenUpdateResponse.json();
          } catch (parseErr) {
            // If parsing JSON fails, use the status text or a generic message
            errorData.message = `Failed to set initial tokens. Server status: ${tokenUpdateResponse.status} ${tokenUpdateResponse.statusText}`;
          }
          console.error('Failed to set initial tokens for new user:', errorData);
          toast({
            title: "Account Created, Token Init Failed",
            description: `Your account was created, but we couldn't set your initial tokens: ${errorData.message}. Please contact support.`,
            variant: "destructive",
            duration: 8000, 
          });
        } else {
           toast({
            title: "Registration Successful!",
            description: `Your account has been created with ${INITIAL_FREE_TOKENS.toLocaleString()} free tokens. You are now logged in.`,
          });
        }
      } catch (initError: any) {
        console.error('Error calling initial token setup API:', initError);
        toast({
          title: "Account Created, Token Setup Network Error",
          description: `Your account was created, but there was a network issue setting up your initial tokens: ${initError.message || 'Please check your connection or contact support.'}.`,
          variant: "destructive",
          duration: 8000,
        });
      }
      router.push("/dashboard"); 

    } catch (error: any) {
      let finalErrorMessage: string;

      if (error instanceof AppwriteException) {
        finalErrorMessage = error.message;
        if (error.code === 409) { 
            form.setError("email", { message: "This email is already registered. Try logging in." });
            finalErrorMessage = "This email is already registered. Try logging in or using a different email.";
        } else if (error.type === 'user_password_short' || error.message.toLowerCase().includes('password')) {
             form.setError("password", { type: "manual", message: error.message });
        } else if (error.type === 'user_name_invalid' || error.message.toLowerCase().includes('name')) {
            form.setError("username", { type: "manual", message: error.message });
        } else {
            form.setError("root.serverError", { type: "manual", message: error.message });
        }
      } else {
        finalErrorMessage = "An unexpected error occurred. Please check your network connection and Appwrite server configuration.";
        form.setError("root.serverError", { type: "manual", message: finalErrorMessage });
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
            {form.formState.errors.root?.serverError && (
              <FormMessage>{form.formState.errors.root.serverError.message}</FormMessage>
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
