import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { 
  CheckCircle, 
  Calendar, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Mail,
  ArrowLeft 
} from "lucide-react";

// Types for the API response
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  companySize: string;
  role: string;
  linkedinUrl?: string;
  status: string;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
};

type InviteCode = {
  id: string;
  code: string;
  assignedToUserId: string;
  usedByUserId?: string;
  isUsed: boolean;
  expiresAt: string;
  reservedForEmail?: string;
  reservedAt?: string;
  createdAt: string;
  usedAt?: string;
};

type DashboardData = {
  user: User;
  inviteCodes: InviteCode[];
  referrals: User[];
};

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const { toast } = useToast();

  const sendInvitationMutation = useMutation({
    mutationFn: async (inviteData: { email: string; personalMessage?: string }) => {
      return apiRequest('POST', '/api/send-invitation', inviteData);
    },
    onSuccess: (response) => {
      console.log('Email invitation response:', response); // Debug log
      const sentCode = response?.sentCode || 'unknown';
      const sentTo = response?.sentTo || emailInput;
      toast({
        title: "Invitation Sent!",
        description: `Your invitation code ${sentCode} was sent to ${sentTo}`,
      });
      setShowEmailModal(false);
      setEmailInput("");
      setPersonalMessage("");
      // Invalidate cache to refresh dashboard with updated code status
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/me'],
    retry: false,
  });

  const handleCopyCode = async (text: string, isUrl: boolean = false) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      toast({
        title: isUrl ? "Link Copied" : "Code Copied",
        description: isUrl ? "Invitation link copied to clipboard" : "Invitation code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleShareInvites = () => {
    const availableCodes = data?.inviteCodes?.filter(code => !code.isUsed && !code.reservedForEmail) || [];
    if (availableCodes.length === 0) {
      toast({
        title: "No Codes Available",
        description: "You don't have any unused invitation codes to share",
        variant: "destructive",
      });
      return;
    }

    const firstCode = availableCodes[0];
    const inviteUrl = `${window.location.origin}/?code=${firstCode.code}`;
    const shareText = `🎉 I got exclusive access to The Summit 25 and want to share it with you!\n\nThis is the most exclusive tech event of the year - limited spots only.\n\nJoin me: ${inviteUrl}\n\n#TheSummit25 #ExclusiveAccess`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Me at The Summit 25 - Exclusive Invitation',
        text: shareText,
        url: inviteUrl,
      });
    } else {
      handleCopyCode(shareText);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-summit-primary shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Logo className="w-48 h-8" />
              <Button 
                variant="ghost" 
                className="text-white hover:text-summit-accent"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </nav>
        
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <Card className="summit-card">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-primary mb-4">Access Restricted</h2>
              <p className="text-muted-foreground mb-6">
                Please complete your registration first to access your dashboard.
              </p>
              <Button 
                onClick={() => setLocation('/')}
                className="summit-btn-primary"
              >
                Go to Registration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { user, inviteCodes = [], referrals = [] } = data;
  const availableCodes = inviteCodes.filter((code: InviteCode) => !code.isUsed && !code.reservedForEmail);
  const reservedCodes = inviteCodes.filter((code: InviteCode) => !code.isUsed && code.reservedForEmail);
  const usedCodes = inviteCodes.filter((code: InviteCode) => code.isUsed);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-summit-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo className="w-48 h-8" />
            <div className="flex space-x-4">
              <Button 
                variant="ghost" 
                className="text-white hover:text-summit-accent"
                onClick={() => setLocation('/admin')}
              >
                Admin
              </Button>
              <Button 
                variant="ghost" 
                className="text-white hover:text-summit-accent"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <Card className="summit-card mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">Welcome to The Summit 25</h1>
                <p className="text-muted-foreground">You've been confirmed for this exclusive event</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">{user?.firstName} {user?.lastName}</div>
                <div className="text-sm text-muted-foreground">{user?.role} at {user?.company}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Status */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="summit-card text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-primary mb-2">Confirmed</h3>
              <p className="text-sm text-muted-foreground">Your registration is complete</p>
            </CardContent>
          </Card>

          <Card className="summit-card text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-bold text-primary mb-2">Event Date</h3>
              <p className="text-sm text-muted-foreground">March 15-16, 2025</p>
            </CardContent>
          </Card>

          <Card className="summit-card text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-primary mb-2">Your Referrals</h3>
              <p className="text-sm text-muted-foreground">{referrals.length} people joined</p>
            </CardContent>
          </Card>
        </div>

        {/* Invitation Codes */}
        <Card className="summit-card mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-primary">Your Invitation Codes</CardTitle>
                <p className="text-muted-foreground">Share these exclusive codes with peers you'd like to invite</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-accent">{availableCodes.length}</div>
                <div className="text-sm text-muted-foreground">remaining invites</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {inviteCodes.map((code: InviteCode) => {
                const inviteUrl = `${window.location.origin}/?code=${code.code}`;
                return (
                  <div key={code.id} className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${
                        code.isUsed 
                          ? 'bg-muted' 
                          : code.reservedForEmail 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}></div>
                      <code className={`font-mono text-lg font-bold tracking-wider ${
                        code.isUsed 
                          ? 'text-muted-foreground' 
                          : code.reservedForEmail 
                            ? 'text-yellow-600' 
                            : 'text-primary'
                      }`}>
                        {code.code}
                      </code>
                      {code.isUsed && (
                        <Badge variant="secondary" className="text-xs">Used</Badge>
                      )}
                      {!code.isUsed && code.reservedForEmail && (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Reserved</Badge>
                      )}
                    </div>
                    {!code.isUsed && !code.reservedForEmail && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code, false)}
                          className="text-accent hover:text-accent/80"
                          data-testid={`button-copy-code-${code.code}`}
                          title="Copy code"
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(inviteUrl, true)}
                          className="text-accent hover:text-accent/80"
                          data-testid={`button-copy-url-${code.code}`}
                          title="Copy invite link"
                        >
                          {copiedCode === inviteUrl ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleShareInvites}
                className="summit-btn-accent flex-1"
                data-testid="button-share-invites"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Invitations
              </Button>
              <Button 
                onClick={() => setShowEmailModal(true)}
                className="summit-btn-primary flex-1"
                data-testid="button-email-invites"
                disabled={!data?.inviteCodes?.some(code => !code.isUsed)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Invitations
              </Button>
            </div>

            {/* Email Invitation Modal */}
            {showEmailModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4">Send Invitation</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="friend@example.com"
                        data-testid="input-invitation-email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
                      <textarea
                        value={personalMessage}
                        onChange={(e) => setPersonalMessage(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                        placeholder="Add a personal note..."
                        data-testid="input-personal-message"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (emailInput) {
                            sendInvitationMutation.mutate({
                              email: emailInput,
                              personalMessage,
                            });
                          }
                        }}
                        disabled={!emailInput || sendInvitationMutation.isPending}
                        className="flex-1 summit-btn-primary"
                        data-testid="button-send-invitation"
                      >
                        {sendInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                      <Button
                        onClick={() => setShowEmailModal(false)}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-cancel-invitation"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Network */}
        <Card className="summit-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Your Referral Network</CardTitle>
          </CardHeader>
          
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No referrals yet. Share your invitation codes to build your network!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral: any) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback className="bg-accent text-white">
                          {referral.firstName?.[0]}{referral.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{referral.firstName} {referral.lastName}</div>
                        <div className="text-sm text-muted-foreground">{referral.role} at {referral.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">Registered</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
