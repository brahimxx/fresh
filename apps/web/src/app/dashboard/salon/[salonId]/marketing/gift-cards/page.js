'use client';

import { useState } from 'react';
import { use } from 'react';
import { format } from 'date-fns';
import { 
  Plus,
  Search,
  Gift,
  Copy,
  Eye,
  Ban,
  DollarSign,
  CreditCard,
  Calendar
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  useGiftCards, 
  useCancelGiftCard,
  GIFT_CARD_STATUSES,
  getGiftCardStatus,
  formatCurrency 
} from '@/hooks/use-gift-cards';
import { GiftCardForm } from '@/components/marketing/gift-card-form';
import { GiftCardDetail } from '@/components/marketing/gift-card-detail';

export default function GiftCardsPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var { toast } = useToast();
  
  var [searchQuery, setSearchQuery] = useState('');
  var [statusFilter, setStatusFilter] = useState('all');
  var [showForm, setShowForm] = useState(false);
  var [viewGiftCard, setViewGiftCard] = useState(null);
  var [cancelGiftCard, setCancelGiftCard] = useState(null);
  
  var { data: giftCards, isLoading } = useGiftCards(salonId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  var cancelGiftCardMutation = useCancelGiftCard();
  
  // Filter by search
  var filteredGiftCards = giftCards || [];
  if (searchQuery) {
    var query = searchQuery.toLowerCase();
    filteredGiftCards = filteredGiftCards.filter(function(gc) {
      return gc.code.toLowerCase().includes(query) ||
             (gc.recipient_name && gc.recipient_name.toLowerCase().includes(query)) ||
             (gc.recipient_email && gc.recipient_email.toLowerCase().includes(query));
    });
  }
  
  // Stats
  var totalValue = (giftCards || []).reduce(function(sum, gc) {
    return sum + Number(gc.initial_value || 0);
  }, 0);
  
  var outstandingBalance = (giftCards || []).reduce(function(sum, gc) {
    var status = getGiftCardStatus(gc);
    if (status === 'active') {
      return sum + Number(gc.balance || 0);
    }
    return sum;
  }, 0);
  
  var activeCount = (giftCards || []).filter(function(gc) {
    return getGiftCardStatus(gc) === 'active';
  }).length;
  
  function handleCopyCode(code) {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Gift card code copied to clipboard',
    });
  }
  
  function handleCancel() {
    if (!cancelGiftCard) return;
    
    cancelGiftCardMutation.mutate(cancelGiftCard.id, {
      onSuccess: function() {
        toast({ title: 'Gift card cancelled' });
        setCancelGiftCard(null);
      },
    });
  }
  
  function getStatusBadge(giftCard) {
    var status = getGiftCardStatus(giftCard);
    var config = GIFT_CARD_STATUSES[status];
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
          <h1 className="text-2xl font-bold">Gift Cards</h1>
          <p className="text-muted-foreground">
            Create and manage gift cards
          </p>
        </div>
        <Button onClick={function() { setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Gift Card
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gift className="h-4 w-4" />
            <span className="text-sm">Total Gift Cards</span>
          </div>
          <p className="text-2xl font-bold">{(giftCards || []).length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Sold</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Outstanding Balance</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(outstandingBalance)}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or recipient..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="redeemed">Redeemed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredGiftCards.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGiftCards.map(function(giftCard) {
                var status = getGiftCardStatus(giftCard);
                
                return (
                  <TableRow key={giftCard.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {giftCard.code}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={function() { handleCopyCode(giftCard.code); }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {giftCard.recipient_name ? (
                        <div>
                          <p className="font-medium">{giftCard.recipient_name}</p>
                          {giftCard.recipient_email && (
                            <p className="text-sm text-muted-foreground">
                              {giftCard.recipient_email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(giftCard.initial_value)}
                    </TableCell>
                    <TableCell>
                      <span className={status === 'active' ? 'text-green-600 font-medium' : ''}>
                        {formatCurrency(giftCard.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {giftCard.expires_at ? (
                        format(new Date(giftCard.expires_at), 'MMM d, yyyy')
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(giftCard)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={function() { setViewGiftCard(giftCard); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {status === 'active' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600"
                            onClick={function() { setCancelGiftCard(giftCard); }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No gift cards</h3>
          <p className="text-muted-foreground mb-4">
            Create your first gift card to sell to customers
          </p>
          <Button onClick={function() { setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Gift Card
          </Button>
        </div>
      )}
      
      {/* Form Dialog */}
      <GiftCardForm
        open={showForm}
        onOpenChange={setShowForm}
        salonId={salonId}
        onSuccess={function() { setShowForm(false); }}
      />
      
      {/* Detail Dialog */}
      <GiftCardDetail
        open={!!viewGiftCard}
        onOpenChange={function(open) { if (!open) setViewGiftCard(null); }}
        giftCard={viewGiftCard}
      />
      
      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelGiftCard} onOpenChange={function(open) { if (!open) setCancelGiftCard(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Gift Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel gift card &quot;{cancelGiftCard?.code}&quot;? 
              The remaining balance of {formatCurrency(cancelGiftCard?.balance)} will be voided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Gift Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
