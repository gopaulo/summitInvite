import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { waitlistSubmissionSchema, type WaitlistData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { Loader2, Send, Shield } from "lucide-react";

interface WaitlistFormProps {
  onSuccess: () => void;
}

export default function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isReady: recaptchaReady, executeRecaptcha } = useRecaptcha({ action: 'waitlist' });

  const form = useForm<WaitlistData>({
    resolver: zodResolver(waitlistSubmissionSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      companyRevenue: "$100k-$500k" as const,
      role: "",
      companyWebsite: "",
      motivation: "",
    },
  });

  const onSubmit = async (values: WaitlistData) => {
    setIsLoading(true);
    try {
      // Execute reCAPTCHA before submission
      const recaptchaToken = await executeRecaptcha();
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed. Please try again.');
      }

      const response = await apiRequest('POST', '/api/waitlist', {
        ...values,
        recaptchaToken,
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Application Submitted",
          description: "Thank you! We'll review your application and get back to you soon.",
        });
        form.reset();
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message.includes('400:') 
          ? error.message.split('400: ')[1]
          : 'Failed to submit application'
        : 'Failed to submit application';
      
      toast({
        title: "Submission Failed",
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
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} className="summit-input" data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} className="summit-input" data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input {...field} type="email" className="summit-input" data-testid="input-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} className="summit-input" data-testid="input-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="companyRevenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Revenue</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="summit-input" data-testid="select-company-revenue">
                      <SelectValue placeholder="Select company revenue" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="$100k-$500k">$100k-$500k per year</SelectItem>
                    <SelectItem value="$500k-$1mi">$500k-$1mi per year</SelectItem>
                    <SelectItem value="$1mi-$3mi">$1mi-$3mi per year</SelectItem>
                    <SelectItem value="$3mi-$5mi">$3mi-$5mi per year</SelectItem>
                    <SelectItem value="$5mi+">$5mi+ per year</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title/Role</FormLabel>
                <FormControl>
                  <Input {...field} className="summit-input" data-testid="input-role" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="companyWebsite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Website (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="url" className="summit-input" data-testid="input-company-website" placeholder="https://yourcompany.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="motivation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Why do you want to attend The Summit 25?</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  className="summit-input resize-none"
                  placeholder="Tell us about your interest in attending..."
                  data-testid="textarea-motivation"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* reCAPTCHA Indicator */}
        <div className="bg-muted rounded-lg p-4 text-center">
          <Shield className="w-8 h-8 text-accent mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">
            {recaptchaReady ? 'Protected by reCAPTCHA' : 'Loading reCAPTCHA protection...'}
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !recaptchaReady}
          className="summit-btn-accent w-full py-4 text-lg"
          data-testid="button-submit-waitlist"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          {isLoading ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </Form>
  );
}
