import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import Logo from "@/components/Logo";
import StatsCard from "@/components/StatsCard";
import {
  Users,
  Key,
  List,
  Share2,
  ArrowUp,
  Eye,
  Trash2,
  Download,
  Plus,
  UserPlus,
  ArrowLeft,
  LogIn,
  LogOut,
} from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [codeCount, setCodeCount] = useState("5");
  const [selectedUser, setSelectedUser] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize login form (must be at top level to avoid hook ordering issues)
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Check admin authentication status
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/session'],
    retry: false,
  });

  useEffect(() => {
    if (!authLoading) {
      if (authData?.isAdmin === true) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [authData, authLoading]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    retry: false,
    enabled: isAuthenticated === true,
  });

  const { data: waitlistData, isLoading: waitlistLoading } = useQuery({
    queryKey: ['/api/admin/waitlist'],
    retry: false,
    enabled: isAuthenticated === true,
  });

  const { data: codes } = useQuery({
    queryKey: ['/api/admin/codes'],
    retry: false,
    enabled: isAuthenticated === true,
  });

  const promoteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('POST', `/api/admin/waitlist/${userId}/promote`);
    },
    onSuccess: () => {
      toast({
        title: "User Promoted",
        description: "User has been promoted from waitlist and sent an invitation code.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Promotion Failed",
        description: error instanceof Error ? error.message : "Failed to promote user",
        variant: "destructive",
      });
    },
  });

  const generateCodesMutation = useMutation({
    mutationFn: async ({ userId, count }: { userId: string; count: number }) => {
      await apiRequest('POST', '/api/admin/codes/generate', { userId, count });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Codes Generated",
        description: `Generated ${variables.count} invitation codes successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/codes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate codes",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      await apiRequest('POST', '/api/admin/login', credentials);
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['/api/session'] });
      toast({
        title: "Login Successful",
        description: "Welcome to the admin dashboard",
      });
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message.split(': ')[1] || "Invalid credentials" : "Login failed",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been logged out of the admin dashboard",
      });
    },
  });

  const handlePromoteUser = (userId: string) => {
    promoteUserMutation.mutate(userId);
  };

  const handleBulkPromote = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to promote",
        variant: "destructive",
      });
      return;
    }

    selectedUsers.forEach(userId => {
      promoteUserMutation.mutate(userId);
    });
    setSelectedUsers([]);
  };

  const handleGenerateCodes = () => {
    if (!selectedUser) {
      toast({
        title: "No User Selected",
        description: "Please select a user to assign codes to",
        variant: "destructive",
      });
      return;
    }

    generateCodesMutation.mutate({ 
      userId: selectedUser, 
      count: parseInt(codeCount) 
    });
  };

  const handleExportWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/waitlist/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'summit25-waitlist.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Waitlist data has been downloaded",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export waitlist data",
        variant: "destructive",
      });
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const getPriorityBadgeClass = (score: number) => {
    if (score >= 70) return "priority-badge-high";
    if (score >= 40) return "priority-badge-medium";
    return "priority-badge-low";
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 70) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  };

  if (statsLoading || waitlistLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle login form submission
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  // Show login form if not authenticated
  if (isAuthenticated === false) {

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md summit-card">
          <CardHeader className="text-center">
            <Logo className="w-48 h-8 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-primary">Admin Login</CardTitle>
            <p className="text-muted-foreground">Access the admin dashboard</p>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter username"
                          {...field}
                          data-testid="input-admin-username"
                          className="summit-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          {...field}
                          data-testid="input-admin-password"
                          className="summit-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="summit-btn-primary w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-admin-login"
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Logging in...
                    </div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                onClick={() => setLocation('/dashboard')}
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                className="text-white hover:text-summit-accent"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button 
                variant="ghost" 
                className="text-white hover:text-red-400"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-admin-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage invitations, waitlist, and event registrations</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Registered"
            value={stats?.totalRegistered || 0}
            icon={<Users className="w-6 h-6" />}
            trend="+12% from last week"
            trendUp={true}
          />
          <StatsCard
            title="Active Codes"
            value={stats?.activeCodes || 0}
            icon={<Key className="w-6 h-6" />}
            trend="+8% codes generated"
            trendUp={true}
          />
          <StatsCard
            title="Waitlist"
            value={stats?.waitlistCount || 0}
            icon={<List className="w-6 h-6" />}
            trend="+5% pending review"
            trendUp={true}
          />
          <StatsCard
            title="Referrals"
            value={stats?.totalReferrals || 0}
            icon={<Share2 className="w-6 h-6" />}
            trend="+15% successful referrals"
            trendUp={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Waitlist Management */}
          <div className="lg:col-span-2">
            <Card className="summit-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-primary">Waitlist Management</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleExportWaitlist}
                      className="summit-btn-accent px-4 py-2 text-sm"
                      data-testid="button-export-waitlist"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={handleBulkPromote}
                      disabled={selectedUsers.length === 0}
                      className="summit-btn-primary px-4 py-2 text-sm"
                      data-testid="button-bulk-promote"
                    >
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Bulk Promote
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                          <Checkbox />
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Company</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Priority</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Submitted</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistData && waitlistData.length > 0 ? (
                        waitlistData.map((person: any) => (
                          <tr key={person.id} className="hover:bg-muted/50 border-b border-border">
                            <td className="py-3 px-4">
                              <Checkbox
                                checked={selectedUsers.includes(person.id)}
                                onCheckedChange={(checked) => 
                                  handleUserSelection(person.id, checked as boolean)
                                }
                                data-testid={`checkbox-user-${person.id}`}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{person.firstName} {person.lastName}</div>
                              <div className="text-sm text-muted-foreground">{person.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{person.company}</div>
                              <div className="text-sm text-muted-foreground">{person.companySize}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getPriorityBadgeClass(person.priorityScore)}>
                                {getPriorityLabel(person.priorityScore)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(person.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePromoteUser(person.id)}
                                  className="text-accent hover:text-accent/80"
                                  data-testid={`button-promote-${person.id}`}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  data-testid={`button-view-${person.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive/80"
                                  data-testid={`button-remove-${person.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No waitlist entries found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Code Management & Activity */}
          <div className="space-y-6">
            {/* Code Management */}
            <Card className="summit-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">Code Management</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Generate Codes</label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="5"
                        value={codeCount}
                        onChange={(e) => setCodeCount(e.target.value)}
                        className="summit-input flex-1"
                        min="1"
                        max="10"
                        data-testid="input-code-count"
                      />
                      <Button 
                        onClick={handleGenerateCodes}
                        className="summit-btn-primary px-4 py-2"
                        data-testid="button-generate-codes"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Assign to User</label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="summit-input" data-testid="select-user">
                        <SelectValue placeholder="Select User..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerateCodes}
                    className="summit-btn-accent w-full"
                    disabled={!selectedUser}
                    data-testid="button-assign-codes"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Codes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="summit-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">Recent Activity</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New registration</p>
                      <p className="text-xs text-muted-foreground">Code ABC123 used by John Doe</p>
                    </div>
                    <span className="text-xs text-muted-foreground">2m ago</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Waitlist promotion</p>
                      <p className="text-xs text-muted-foreground">Sarah Johnson promoted</p>
                    </div>
                    <span className="text-xs text-muted-foreground">1h ago</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Code generated</p>
                      <p className="text-xs text-muted-foreground">5 codes for Lisa Wang</p>
                    </div>
                    <span className="text-xs text-muted-foreground">3h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
