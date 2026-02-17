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
  MoreVertical
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  
  // Filter by search
  var filteredCampaigns = campaigns || [];
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
  
  var totalRecipients = (campaigns || []).reduce(function(sum, c) {
    return sum + Number(c.recipients_count || 0);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and send email & SMS marketing campaigns
          </p>
        </div>
        <Button onClick={function() { setShowForm(true); setEditingCampaign(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Mail className="h-4 w-4" />
            <span className="text-sm">Total Campaigns</span>
          </div>
          <p className="text-2xl font-bold">{(campaigns || []).length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Send className="h-4 w-4" />
            <span className="text-sm">Sent</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalSent}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Recipients</span>
          </div>
          <p className="text-2xl font-bold">{totalRecipients}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Drafts</span>
          </div>
          <p className="text-2xl font-bold">
            {(campaigns || []).filter(function(c) { return c.status === 'draft'; }).length}
          </p>
        </div>
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
          </SelectContent>
        </Select>
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
              <Card key={campaign.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={
                        'p-2 rounded-lg ' + 
                        (campaign.type === 'email' ? 'bg-blue-100' : 'bg-green-100')
                      }>
                        <TypeIcon className={
                          'h-5 w-5 ' +
                          (campaign.type === 'email' ? 'text-blue-600' : 'text-green-600')
                        } />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        {campaign.subject && (
                          <CardDescription className="mt-1">
                            {campaign.subject}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(campaign.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={function() { 
                            setEditingCampaign(campaign); 
                            setShowForm(true); 
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {campaign.status === 'draft' && (
                            <DropdownMenuItem onClick={function() { setSendCampaign(campaign); }}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={function() { setDeleteCampaign(campaign); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{campaign.recipients_count || 0} recipients</span>
                    </div>
                    {campaign.audience_type && (
                      <div>
                        Audience: {campaign.audience_type}
                      </div>
                    )}
                    {campaign.sent_at && (
                      <div>
                        Sent: {format(new Date(campaign.sent_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                    {campaign.scheduled_at && campaign.status === 'scheduled' && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Scheduled: {format(new Date(campaign.scheduled_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                </CardContent>
                {campaign.status === 'sent' && (
                  <CardFooter className="pt-2 border-t">
                    <div className="flex items-center gap-6 text-sm">
                      {campaign.open_rate !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Open Rate: </span>
                          <span className="font-medium">{campaign.open_rate}%</span>
                        </div>
                      )}
                      {campaign.click_rate !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Click Rate: </span>
                          <span className="font-medium">{campaign.click_rate}%</span>
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
