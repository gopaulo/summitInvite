import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Loader2, Unlock } from "lucide-react";

const codeSchema = z.object({
  code: z.string().min(6, "Invitation code must be at least 6 characters"),
});

interface InviteCodeFormProps {
  onSuccess: (code: string) => void;
}

export default function InviteCodeForm({ onSuccess }: InviteCodeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof codeSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest('POST', '/api/validate-code', {
        code: values.code,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setError(null);
          toast({
            title: "Success",
            description: "Valid invitation code! Redirecting to registration...",
          });
          onSuccess(values.code);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message.includes('400:') 
          ? error.message.split('400: ')[1] 
          : 'Invalid or expired invitation code'
        : 'Invalid or expired invitation code';
      
      setError(errorMessage);
      toast({
        title: "Invalid Code",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter invitation code"
                  className="summit-code-input text-center"
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    field.onChange(value);
                    setError(null); // Clear error on input change
                  }}
                  maxLength={12}
                  data-testid="input-invite-code"
                />
              </FormControl>
              <FormMessage />
              {error && (
                <div className="text-sm text-red-600 mt-2" role="alert" data-testid="error-message">
                  {error}
                </div>
              )}
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          disabled={isLoading}
          className="summit-btn-primary w-full"
          data-testid="button-validate-code"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Unlock className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Validating..." : "Access Registration"}
        </Button>
      </form>
    </Form>
  );
}
