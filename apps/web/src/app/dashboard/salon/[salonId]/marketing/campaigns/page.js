'use client';

import { useState } from 'react';
import { use } from 'react';
import { format } from 'date-fns';
import { 
  Plus,
  Search,
  Mail,
  MessageSquare,
  Send,
  Edit,
  Trash2,
  Eye,
  Users,
  BarChart3,
  Clock,
  MoreVertical,
  TrendingUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { 
  useCampaigns, 
  useDeleteCampaign,
  useSendCampaign,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES 
} from '@/hooks/use-campaigns';
import { CampaignForm } from '@/components/marketing/campaign-form';

export default function CampaignsPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var { toast } = useToast();
  
  var [searchQuery, setSearchQuery] = useState('');
  var [typeFilter, setTypeFilter] = useState('all');
  var [statusFilter, setStatusFilter] = useState('all');
  var [showDeleted, setShowDeleted] = useState(false);
  var [showForm, setShowForm] = useState(false);
  var [editingCampaign, setEditingCampaign] = useState(null);
  var [deleteCampaign, setDeleteCampaign] = useState(null);
  var [sendCampaign, setSendCampaign] = useState(null);
  
  var { data: campaigns, isLoading } = useCampaigns(salonId, {
    type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  var deleteCampaignMutation = useDeleteCampaign();
  var sendCampaignMutation = useSendCampaign();
  
  // Base filter for cancelled campaigns
  var filteredCampaigns = campaigns || [];
  if (!showDeleted) {
    filteredCampaigns = filteredCampaigns.filter(function(c) {
      return c.status !== 'cancelled';
    });
  }

  // Filter by search
  if (searchQuery) {
    var query = searchQuery.toLowerCase();
    filteredCampaigns = filteredCampaigns.filter(function(c) {
      return c.name.toLowerCase().includes(query) ||
             (c.subject && c.subject.toLowerCase().includes(query));
    });
  }
  
  // Stats
  var totalSent = (campaigns || []).filter(function(c) {
    return c.status === 'sent';
  }).length;
  
  var totalReached = (campaigns || []).reduce(function(sum, c) {
    return sum + Number(c.recipient_count || 0);
  }, 0);
  
  function handleDelete() {
    if (!deleteCampaign) return;
    
    deleteCampaignMutation.mutate(deleteCampaign.id, {
      onSuccess: function() {
        toast({ title: 'Campaign deleted' });
        setDeleteCampaign(null);
      },
    });
  }
  
  function handleSend() {
    if (!sendCampaign) return;
    
    sendCampaignMutation.mutate(sendCampaign.id, {
      onSuccess: function() {
        toast({ title: 'Campaign sent successfully!' });
        setSendCampaign(null);
      },
      onError: function(error) {
        toast({
          title: 'Error sending campaign',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }
  
  function getTypeIcon(type) {
    if (type === 'email') return Mail;
    return MessageSquare;
  }
  
  function getStatusBadge(status) {
    var config = CAMPAIGN_STATUSES[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and send email & SMS marketing campaigns.
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingCampaign(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>
      
      {/* Stats */}
      
  <div className="grid gap-4 md:grid-cols-4">
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
        <Mail className="w-16 h-16" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
          <Mail className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{(campaigns || []).length}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">Lifetime campaigns</p>
      </CardContent>
    </Card>
    
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
        <Send className="w-16 h-16" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Broadcasts Sent</CardTitle>
        <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
          <Send className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-green-600">{totalSent}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">Successfully dispatched</p>
      </CardContent>
    </Card>
    
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
        <Users className="w-16 h-16" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total Reached</CardTitle>
        <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-600">
          <Users className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{totalReached}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">Unique clients contacted</p>
      </CardContent>
    </Card>
    
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
        <BarChart3 className="w-16 h-16" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle>
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
          <BarChart3 className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">64%</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center text-green-600">
          <TrendingUp className="h-3 w-3 mr-1" /> +2.4% this month
        </p>
      </CardContent>
    </Card>
  </div>
  
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="showDeleted" 
            checked={showDeleted}
            onCheckedChange={setShowDeleted}
          />
          <label 
            htmlFor="showDeleted" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Show deleted
          </label>
        </div>
      </div>
      
      {/* Campaigns List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="space-y-4">
          {filteredCampaigns.map(function(campaign) {
            var TypeIcon = getTypeIcon(campaign.type);
            
            return (
              <Card 
                key={campaign.id} 
                className={`group transition-all duration-300 relative overflow-hidden ${
                  campaign.status === 'cancelled'
                    ? 'opacity-60 grayscale bg-muted/30 border-dashed'
                    : ['sent', 'completed'].includes(campaign.status) 
                    ? 'opacity-90' 
                    : 'hover:shadow-md hover:-translate-y-1 cursor-pointer'
                }`}
                onClick={function() {
                  if (['sent', 'completed', 'cancelled'].includes(campaign.status)) return;
                  setEditingCampaign(campaign);
                  setShowForm(true);
                }}
              >
                {/* Left accent border */}
                <div className={`absolute top-0 bottom-0 left-0 w-1 transition-colors ${
                  campaign.status === 'sent' ? 'bg-green-500' :
                  campaign.status === 'scheduled' ? 'bg-amber-500' :
                  campaign.status === 'completed' ? 'bg-blue-500' : 'bg-muted'
                }`} />

                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 pl-2">
                      <div className={
                        'p-2.5 rounded-xl transition-colors duration-300 ' + 
                        (campaign.type === 'email' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600')
                      }>
                        <TypeIcon className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <span className={campaign.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}>
                            {campaign.name}
                          </span>
                          {campaign.audience_type && (
                            <Badge variant="outline" className="ml-2 text-xs font-normal border-primary/20 text-primary">
                              {campaign.audience_type}
                            </Badge>
                          )}
                        </CardTitle>
                        {campaign.subject && (
                          <CardDescription className="mt-1.5 text-sm">
                            <span className="font-medium text-foreground/80">Subject: </span>
                            {campaign.subject}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(campaign.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                          {!['sent', 'completed', 'cancelled'].includes(campaign.status) && (
                            <DropdownMenuItem onClick={function(e) { 
                              e.stopPropagation();
                              setEditingCampaign(campaign); 
                              setShowForm(true); 
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'draft' && (
                            <DropdownMenuItem onClick={function(e) { 
                              e.stopPropagation();
                              setSendCampaign(campaign); 
                            }}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Now
                            </DropdownMenuItem>
                          )}
                          {campaign.status !== 'active' && campaign.status !== 'cancelled' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-100"
                                onClick={function(e) { 
                                  e.stopPropagation();
                                  setDeleteCampaign(campaign); 
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-4 pl-16">
                  <div className="flex items-center gap-8 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span><strong className="text-foreground">{campaign.recipient_count || 0}</strong> recipients</span>
                    </div>
                    {campaign.completed_at && (
                      <div className="flex items-center gap-1.5">
                        <Send className="h-4 w-4" />
                        <span>Sent on <strong className="text-foreground">{format(new Date(campaign.completed_at), 'MMM d, yyyy')}</strong></span>
                      </div>
                    )}
                    {campaign.scheduled_at && campaign.status === 'scheduled' && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span>Scheduled: <strong className="text-foreground">{format(new Date(campaign.scheduled_at), 'MMM d, HH:mm')}</strong></span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                {['sent', 'completed'].includes(campaign.status) && (
                  <CardFooter className="pt-3 pb-3 bg-muted/20 border-t mt-auto">
                    <div className="flex items-center gap-8 text-sm w-full pl-10">
                      {campaign.open_rate !== undefined ? (
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Open Rate</span>
                          <span className="font-medium text-base">{campaign.open_rate}%</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Open Rate</span>
                          <span className="font-medium text-base">--</span>
                        </div>
                      )}
                      
                      {campaign.click_rate !== undefined ? (
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Click Rate</span>
                          <span className="font-medium text-base">{campaign.click_rate}%</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Click Rate</span>
                          <span className="font-medium text-base">--</span>
                        </div>
                      )}
                    </div>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No campaigns</h3>
          <p className="text-muted-foreground mb-4">
            Create your first marketing campaign
          </p>
          <Button onClick={function() { setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      )}
      
      {/* Form Dialog */}
      <CampaignForm
        open={showForm}
        onOpenChange={setShowForm}
        salonId={salonId}
        campaign={editingCampaign}
        onSuccess={function() { setShowForm(false); setEditingCampaign(null); }}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCampaign} onOpenChange={function(open) { if (!open) setDeleteCampaign(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteCampaign?.name}&quot;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Send Confirmation */}
      <AlertDialog open={!!sendCampaign} onOpenChange={function(open) { if (!open) setSendCampaign(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send &quot;{sendCampaign?.name}&quot; to{' '}
              {sendCampaign?.recipients_count || 0} recipients? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
