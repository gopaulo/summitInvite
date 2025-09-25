import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { registrationSchema, type RegistrationData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import Logo from "@/components/Logo";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { Loader2, CheckCircle, Shield } from "lucide-react";

export default function Registration() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isReady: recaptchaReady, executeRecaptcha } = useRecaptcha({ action: 'register' });

  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      inviteCode: "",
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      companyRevenue: "$100k-$500k" as const,
      role: "",
      companyWebsite: "",
    },
  });

  // Extract invite code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      form.setValue('inviteCode', code.toUpperCase());
    }
  }, [form]);

  const onSubmit = async (values: RegistrationData) => {
    setIsLoading(true);
    try {
      // Execute reCAPTCHA before submission
      const recaptchaToken = await executeRecaptcha();
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed. Please try again.');
      }

      const response = await apiRequest('POST', '/api/register', {
        ...values,
        recaptchaToken,
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Registration Successful!",
          description: "Welcome to The Summit 25. Check your email for next steps.",
        });
        // Redirect to dashboard
        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message.includes('400:') 
          ? error.message.split('400: ')[1]
          : 'Registration failed'
        : 'Registration failed';
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-summit-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo className="w-48 h-8" />
            <Button 
              variant="ghost" 
              className="text-white hover:text-summit-accent"
              onClick={() => setLocation('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Registration Form */}
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="summit-card">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">
              Complete Your Registration
            </CardTitle>
            <p className="text-muted-foreground">
              Join an exclusive community of industry leaders
            </p>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="summit-code-input text-center"
                          disabled
                          data-testid="input-invite-code-display"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  className="summit-btn-primary w-full py-4 text-lg"
                  data-testid="button-submit-registration"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  )}
                  {isLoading ? "Registering..." : "Complete Registration"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
