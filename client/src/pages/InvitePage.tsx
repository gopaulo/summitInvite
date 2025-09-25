import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import InviteCodeForm from "@/components/InviteCodeForm";

export default function InvitePage() {
  const [, setLocation] = useLocation();

  // Set page title and meta description for SEO
  useEffect(() => {
    document.title = "Access Registration - The Summit 25";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Enter your exclusive invitation code to register for The Summit 25, an exclusive gathering of industry leaders and innovators.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Enter your exclusive invitation code to register for The Summit 25, an exclusive gathering of industry leaders and innovators.';
      document.head.appendChild(meta);
    }
  }, []);

  const handleInviteCodeSuccess = (code: string) => {
    setLocation(`/register?code=${code}`);
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

      {/* Invitation Code Form */}
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="summit-card">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">
              Access Registration
            </CardTitle>
            <p className="text-muted-foreground">
              Enter your exclusive invitation code to register for The Summit 25
            </p>
          </CardHeader>
          
          <CardContent>
            <InviteCodeForm onSuccess={handleInviteCodeSuccess} />
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Don't have an invitation code?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal text-summit-primary"
                  onClick={() => setLocation('/waitlist')}
                  data-testid="link-join-waitlist"
                >
                  Join the waitlist
                </Button>
                {" "}to be notified when registration opens.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}