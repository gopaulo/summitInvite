import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";
import InviteCodeForm from "@/components/InviteCodeForm";
import WaitlistForm from "@/components/WaitlistForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, X } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  const handleInviteCodeSuccess = (code: string) => {
    setLocation(`/register?code=${code}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-summit-primary shadow-lg relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo className="w-48 h-8" />
            <div className="hidden md:flex space-x-4">
              <Button variant="ghost" className="text-white hover:text-summit-accent">
                Home
              </Button>
              <Button variant="ghost" className="text-white hover:text-summit-accent" onClick={() => setLocation('/admin')}>
                Admin
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Background */}
        <div className="absolute inset-0 summit-hero opacity-95"></div>
        <div className="absolute inset-0 summit-hero-overlay"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Logo className="w-64 h-20 mx-auto mb-8" />
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              THE SUMMIT <span className="text-summit-accent">25</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-2xl mx-auto">
              An exclusive gathering of industry leaders, innovators, and visionaries shaping the future of business.
            </p>
          </motion.div>

          {/* Action Cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
          >
            {/* Invitation Code Entry */}
            <Card className="summit-card bg-card/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-primary mb-6 text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">Enter Your Invitation Code</h3>
                  <p className="text-muted-foreground mt-2">You've received an exclusive invitation</p>
                </div>
                
                <InviteCodeForm onSuccess={handleInviteCodeSuccess} />
              </CardContent>
            </Card>

            {/* Waitlist Signup */}
            <Card className="summit-card bg-card/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-primary mb-6 text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">Join the Waitlist</h3>
                  <p className="text-muted-foreground mt-2">Request consideration for invitation</p>
                </div>
                
                <Button 
                  onClick={() => setShowWaitlistModal(true)}
                  className="summit-btn-accent w-full"
                  data-testid="button-join-waitlist"
                >
                  Request Invitation
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Event Details */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16"
          >
            <Card className="summit-card bg-card/90 backdrop-blur-sm max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h4 className="text-2xl font-bold text-primary mb-6 text-center">Event Details</h4>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6 text-accent" />
                    </div>
                    <div className="font-semibold text-primary">March 15-16, 2025</div>
                    <div className="text-sm text-muted-foreground">Two Days</div>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-6 h-6 text-accent" />
                    </div>
                    <div className="font-semibold text-primary">San Francisco</div>
                    <div className="text-sm text-muted-foreground">Exclusive Venue</div>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <div className="font-semibold text-primary">500 Leaders</div>
                    <div className="text-sm text-muted-foreground">Invitation Only</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-primary">Join the Waitlist</DialogTitle>
          </DialogHeader>
          <WaitlistForm onSuccess={() => setShowWaitlistModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
