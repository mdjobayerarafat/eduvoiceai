
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
      const response = await fetch('/api/custom-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError: any) {
        let textResponse = "";
        try {
          textResponse = await response.text();
        } catch (textError) {
          // Ignore if reading as text also fails
        }
        console.error("API response was not valid JSON. Status:", response.status, "Raw response snippet:", textResponse.substring(0, 500));
        toast({
          title: "Registration Failed",
          description: `Received an invalid response from the server (status ${response.status}). ${textResponse ? `Details: ${textResponse.substring(0,100)}...` : 'Please check server logs.'}`,
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
        // Optionally set form errors if your API returns specific field errors
        // For example: if (result.fieldErrors?.email) form.setError("email", { message: result.fieldErrors.email });
        return;
      }
      
      toast({
        title: "Registration Successful!",
        description: `Your account for ${result.user?.email || values.email} has been created. Please log in.`,
      });
      router.push("/login");

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
        <CardTitle className="font-headline text-2xl">Create an Account (Custom DB)</CardTitle>
        <CardDescription>
          Join EduVoice AI to start your learning journey. 
          (Demo: Uses custom DB. Insecure password handling in this example.)
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
            {/* Removed form.formState.errors.root?.serverError as it's not standard */}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating Account..." : "Register (Custom)"}
            </Button>
          </form>
        </Form>
        {/* 
        <OAuthButtons /> 
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Note: OAuth buttons use Appwrite's native authentication and are not compatible
          with this custom database registration flow. They are disabled for this example.
        </p>
        */}
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
