import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import WaitlistForm from "@/components/WaitlistForm";

export default function WaitlistPage() {
  const [, setLocation] = useLocation();

  // Set page title and meta description for SEO
  useEffect(() => {
    document.title = "Join Waitlist - The Summit 25";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Join The Summit 25 waitlist to be the first to know when registration opens for this exclusive industry event.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Join The Summit 25 waitlist to be the first to know when registration opens for this exclusive industry event.';
      document.head.appendChild(meta);
    }
  }, []);

  const handleSuccess = () => {
    // Redirect to home page after successful submission
    setTimeout(() => {
      setLocation('/');
    }, 2000);
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
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Waitlist Form */}
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="summit-card">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">
              Join the Waitlist
            </CardTitle>
            <p className="text-muted-foreground">
              Be the first to know when registration opens for The Summit 25
            </p>
          </CardHeader>
          
          <CardContent>
            <WaitlistForm onSuccess={handleSuccess} />
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Already have an invitation code?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal text-summit-primary"
                  onClick={() => setLocation('/invite')}
                  data-testid="link-access-registration"
                >
                  Access registration
                </Button>
                {" "}directly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}