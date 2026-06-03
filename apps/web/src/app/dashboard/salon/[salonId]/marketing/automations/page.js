"use client";

import { useState, use } from "react";
import { RequirePermission } from '@/components/layout/require-permission';
import { 
  Sparkles,
  Cake,
  Clock,
  Star,
  ArrowLeft,
  Settings2,
  Mail,
  MessageSquare,
  Activity,
  Save
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useAutomatedCampaigns, useUpdateAutomatedCampaign, useCreateAutomatedCampaign } from "@/hooks/use-campaigns";

// Predefined trigger info for rich UI
const TRIGGER_INFO = {
  birthday: {
    icon: Cake,
    color: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    border: "border-fuchsia-500/20",
    description: "Sends automatically on the morning of a client's birthday."
  },
  lapsed_client: {
    icon: Clock,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    description: "Re-engages clients who haven't visited in a set number of days."
  },
  post_visit_review: {
    icon: Star,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    description: "Requests feedback exactly X days after a completed appointment."
  }
};

export default function AutomationsPage({ params }) {
  return (
    <RequirePermission page="marketing">
      <AutomationsContent params={params} />
    </RequirePermission>
  );
}

function AutomationsContent({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const { toast } = useToast();
  
  const { data: automations, isLoading } = useAutomatedCampaigns(salonId);
  const updateMutation = useUpdateAutomatedCampaign(salonId);
  const createMutation = useCreateAutomatedCampaign(salonId);

  const [editingAuto, setEditingAuto] = useState(null);
  const [formData, setFormData] = useState({});

  const handleInitializeDefaults = async () => {
    const defaults = [
      {
        name: "Happy Birthday Blast",
        trigger_type: "birthday",
        trigger_days_offset: 0,
        is_active: 0,
        type: "email",
        subject: "Happy Birthday! 🎉",
        content: "Here is a 20% off coupon for your special day!"
      },
      {
        name: "We Miss You (Win-Back)",
        trigger_type: "lapsed_client",
        trigger_days_offset: 90,
        is_active: 0,
        type: "email",
        subject: "It's been a while! We miss you.",
        content: "It's been exactly 90 days since your last visit. Book today and get 10% off!"
      },
      {
        name: "How was your visit?",
        trigger_type: "post_visit_review",
        trigger_days_offset: 1,
        is_active: 0,
        type: "email",
        subject: "We'd love your feedback!",
        content: "Thank you for visiting us! Could you take a moment to leave us a review?"
      }
    ];

    try {
      for (const rule of defaults) {
        await createMutation.mutateAsync(rule);
      }
      toast({ title: "Default automations generated successfully!" });
    } catch (err) {
      toast({ title: "Error generating defaults", description: err.message, variant: "destructive" });
    }
  };

  const handleToggle = (autoId, currentActive) => {
    updateMutation.mutate({
      autoId,
      data: { is_active: !currentActive }
    }, {
      onSuccess: () => {
        toast({ title: "Automation updated successfully" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleEditClick = (auto) => {
    setEditingAuto(auto);
    setFormData({
      subject: auto.subject || '',
      content: auto.content || '',
      trigger_days_offset: auto.trigger_days_offset || 0,
    });
  };

  const handleSaveEdit = () => {
    if (!editingAuto) return;
    
    updateMutation.mutate({
      autoId: editingAuto.id,
      data: formData
    }, {
      onSuccess: () => {
        toast({ title: "Template saved successfully" });
        setEditingAuto(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
          <Link href={`/dashboard/salon/${salonId}/marketing`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketing Hub
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-6 w-6 text-fuchsia-500" />
              <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
            </div>
            <p className="text-muted-foreground">
              Set-and-forget smart triggers that run silently in the background to grow your business.
            </p>
          </div>
        </div>
      </div>

      {/* Automations Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[250px] rounded-xl" />
          <Skeleton className="h-[250px] rounded-xl" />
          <Skeleton className="h-[250px] rounded-xl" />
        </div>
      ) : automations && automations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((auto) => {
            const info = TRIGGER_INFO[auto.trigger_type] || { 
              icon: Activity, 
              color: "bg-primary/10 text-primary", 
              border: "border-primary/20",
              description: "Custom automated trigger."
            };
            const Icon = info.icon;

            return (
              <Card 
                key={auto.id} 
                className={`flex flex-col relative overflow-hidden transition-all duration-300 group hover:shadow-md hover:-translate-y-1 ${
                  auto.is_active 
                    ? 'border-primary/20 shadow-sm bg-card' 
                    : 'border-border/50 bg-muted/10'
                }`}
              >
                {/* Top Accent Line */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-300 ${
                  auto.is_active ? info.color.split(' ')[1].replace('text-', 'bg-') : 'bg-transparent'
                }`} />

                <CardHeader className="pb-4 pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-center">
                      <div className={`p-2.5 rounded-xl transition-colors duration-300 ${
                        auto.is_active ? info.color : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <Badge variant={auto.is_active ? "default" : "secondary"} className={`transition-all duration-300 ${
                        auto.is_active ? 'bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-none' : ''
                      }`}>
                        {auto.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={auto.is_active === 1}
                        onCheckedChange={() => handleToggle(auto.id, auto.is_active === 1)}
                        disabled={updateMutation.isPending}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>
                  <div className="mt-5">
                    <CardTitle className="text-xl flex items-center gap-2 font-semibold">
                      {auto.name}
                      {auto.type === 'email' ? (
                        <Mail className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed min-h-[40px]">
                      {info.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 pb-4">
                  <div className={`rounded-lg p-3.5 border text-sm transition-colors duration-300 ${
                    auto.is_active ? 'bg-background border-border/60' : 'bg-muted/50 border-border/30'
                  }`}>
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 flex items-center">
                      Subject Line Preview
                    </div>
                    <div className="font-medium text-foreground truncate" title={auto.subject}>
                      {auto.subject || "No subject set"}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-0 pb-4 mt-auto">
                  <Button 
                    variant="outline" 
                    className={`w-full group-hover:border-primary/30 transition-all ${
                      auto.is_active ? 'hover:bg-primary hover:text-primary-foreground' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleEditClick(auto)}
                  >
                    <Settings2 className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                      auto.is_active ? 'group-hover:rotate-45' : ''
                    }`} />
                    Configure Rules & Template
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed rounded-xl p-12 text-center bg-muted/20">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No Automations Configured</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Your salon currently does not have any smart triggers configured in the database.
          </p>
          <Button 
            onClick={handleInitializeDefaults} 
            disabled={createMutation.isPending}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
          >
            {createMutation.isPending ? "Generating..." : "Generate Default Automations"}
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Drawer */}
      <Sheet open={!!editingAuto} onOpenChange={(open) => !open && setEditingAuto(null)}>
        <SheetContent className="sm:max-w-md w-full flex flex-col h-full p-0 border-l shadow-2xl">
          <div className="px-6 py-6 border-b">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Configure {editingAuto?.name}
              </SheetTitle>
              <SheetDescription>
                Customize the message clients will receive when this trigger fires.
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {editingAuto && (
              <div className="space-y-6">
                {editingAuto.trigger_type === 'lapsed_client' && (
                  <div className="space-y-2">
                    <Label htmlFor="days_offset" className="font-semibold">Days Since Last Visit</Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="days_offset" 
                        type="number" 
                        min="1"
                        className="w-24"
                        value={formData.trigger_days_offset}
                        onChange={(e) => setFormData({...formData, trigger_days_offset: e.target.value})}
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Clients will receive this exactly {formData.trigger_days_offset} days after their last completed appointment.
                    </p>
                  </div>
                )}
                
                {editingAuto.trigger_type === 'post_visit_review' && (
                  <div className="space-y-2">
                    <Label htmlFor="days_offset" className="font-semibold">Days After Appointment</Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="days_offset" 
                        type="number" 
                        min="0"
                        className="w-24"
                        value={formData.trigger_days_offset}
                        onChange={(e) => setFormData({...formData, trigger_days_offset: e.target.value})}
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Clients will receive this exactly {formData.trigger_days_offset} days after an appointment is marked completed. (0 = same day)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="subject" className="font-semibold">Email Subject Line</Label>
                  <Input 
                    id="subject" 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g., We miss you!"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content" className="font-semibold">Message Content</Label>
                    <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider">Supports HTML</Badge>
                  </div>
                  <Textarea 
                    id="content" 
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Write your beautiful message here..."
                    className="min-h-[250px] resize-y font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can use HTML tags like &lt;b&gt;, &lt;br&gt;, or inline styles to format the email body.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/20 mt-auto">
            <SheetFooter>
              <Button variant="outline" onClick={() => setEditingAuto(null)} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
