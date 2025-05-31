
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Key, Save, Eye, EyeOff, Sparkles } from "lucide-react";

const apiKeyFormSchema = z.object({
  geminiApiKey: z.string().optional().describe("Your Google AI Gemini API Key."),
  openaiApiKey: z.string().optional().describe("Your OpenAI API Key."),
  claudeApiKey: z.string().optional().describe("Your Anthropic Claude API Key."),
});

type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

// In a real app, you would fetch and save these keys to a secure backend.
// For this prototype, we'll simulate loading and saving in local state/local storage.

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    geminiApiKey: false,
    openaiApiKey: false,
    claudeApiKey: false,
  });

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      geminiApiKey: "",
      openaiApiKey: "",
      claudeApiKey: "",
    },
  });

  useEffect(() => {
    // Simulate loading saved keys
    try {
      const savedKeysRaw = localStorage.getItem("eduvoice_api_keys");
      if (savedKeysRaw) {
        const savedKeys = JSON.parse(savedKeysRaw);
        form.reset({
          geminiApiKey: savedKeys.geminiApiKey || "",
          openaiApiKey: savedKeys.openaiApiKey || "",
          claudeApiKey: savedKeys.claudeApiKey || "",
        });
      }
    } catch (error) {
      console.error("Failed to load API keys from local storage:", error);
      toast({
        title: "Error",
        description: "Could not load saved API keys.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [form, toast]);

  async function onSubmit(data: ApiKeyFormValues) {
    setIsLoading(true);
    // Simulate saving keys
    try {
      localStorage.setItem("eduvoice_api_keys", JSON.stringify(data));
      toast({
        title: "API Keys Updated",
        description: "Your API keys have been (conceptually) saved.",
        action: (
          <div className="w-full">
            {data.geminiApiKey && <p className="text-xs">Gemini: ...{data.geminiApiKey.slice(-4)}</p>}
            {data.openaiApiKey && <p className="text-xs">OpenAI: ...{data.openaiApiKey.slice(-4)}</p>}
            {data.claudeApiKey && <p className="text-xs">Claude: ...{data.claudeApiKey.slice(-4)}</p>}
          </div>
        ),
      });
    } catch (error) {
       console.error("Failed to save API keys to local storage:", error);
       toast({
        title: "Error Saving Keys",
        description: "Could not save API keys to local storage. Your changes might not persist.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  const toggleShowKey = (keyField: keyof ApiKeyFormValues) => {
    setShowKeys(prev => ({ ...prev, [keyField]: !prev[keyField] }));
  };

  const apiProviders = [
    { name: "geminiApiKey" as keyof ApiKeyFormValues, label: "Google AI Gemini API Key", placeholder: "Enter your Gemini API Key (starts with 'AIza...')", icon: <Sparkles className="h-5 w-5 text-yellow-500" /> },
    { name: "openaiApiKey" as keyof ApiKeyFormValues, label: "OpenAI API Key", placeholder: "Enter your OpenAI API Key (starts with 'sk-...')", icon: <Sparkles className="h-5 w-5 text-green-500" /> },
    { name: "claudeApiKey" as keyof ApiKeyFormValues, label: "Anthropic Claude API Key", placeholder: "Enter your Claude API Key (starts with 'sk-ant-...')", icon: <Sparkles className="h-5 w-5 text-purple-500" /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Key className="mr-3 h-8 w-8 text-primary" /> Manage API Keys
        </h1>
        <p className="text-muted-foreground mt-1">
          Securely manage your personal API keys for various AI services. These keys allow EduVoice AI to leverage your accounts for enhanced features and potentially higher usage limits. Your keys are stored locally in your browser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Your API Keys</CardTitle>
          <CardDescription>
            Enter your API keys below. They will be used for features like Topic Lectures and Mock Interviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {apiProviders.map((provider) => (
                <FormField
                  key={provider.name}
                  control={form.control}
                  name={provider.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        {provider.icon}
                        <span className="ml-2">{provider.label}</span>
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type={showKeys[provider.name] ? "text" : "password"}
                            placeholder={provider.placeholder}
                            {...field}
                            disabled={isLoading}
                            className="text-sm"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => toggleShowKey(provider.name)}
                          disabled={isLoading}
                          aria-label={showKeys[provider.name] ? "Hide API key" : "Show API key"}
                        >
                          {showKeys[provider.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button type="submit" disabled={isLoading || form.formState.isSubmitting} className="w-full md:w-auto">
                {isLoading || form.formState.isSubmitting ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save API Keys</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
       <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-semibold text-foreground">Security:</span> Your API keys are sensitive. For this prototype, they are stored in your browser's local storage. In a production application, API keys should be managed and stored securely on a backend server and never exposed directly to the client-side.
          </p>
          <p>
            <span className="font-semibold text-foreground">Usage:</span> Providing your own keys may give you access to different models or higher rate limits based on your personal account with each AI provider. EduVoice AI will use these keys when generating content for features like Topic Lectures or conducting Mock Interviews.
          </p>
           <p>
            <span className="font-semibold text-foreground">Cost:</span> Be aware that usage of your API keys will incur costs directly on your AI provider accounts according to their pricing models. EduVoice AI is not responsible for these charges.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    