"use client";

import { useState, use } from 'react';
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
  Calendar,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { DataError } from '@/components/ui/data-error';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  useGiftCards,
  useCancelGiftCard,
  GIFT_CARD_STATUSES,
  getGiftCardStatus,
} from '@/hooks/use-gift-cards';
import { GiftCardForm } from '@/components/marketing/gift-card-form';

export default function GiftCardsPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [cancelGiftCard, setCancelGiftCard] = useState(null);

  const { data: giftCards, isLoading, error, refetch } = useGiftCards(salonId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const cancelGiftCardMutation = useCancelGiftCard(salonId);

  const filteredGiftCards = Object.values(giftCards || {}).filter((card) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (card.code && card.code.toLowerCase().includes(q)) ||
      (card.recipient_name && card.recipient_name.toLowerCase().includes(q)) ||
      (card.recipient_email && card.recipient_email.toLowerCase().includes(q))
    );
  });

  const totalOutstanding = Object.values(giftCards || {}).reduce((sum, card) => {
    if (getGiftCardStatus(card) !== 'cancelled') {
      return sum + Number(card.balance);
    }
    return sum;
  }, 0);

  const activeCount = Object.values(giftCards || {}).filter(
    (gc) => getGiftCardStatus(gc) === 'active'
  ).length;

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Gift card code copied to clipboard',
    });
  };

  const handleCancel = () => {
    if (!cancelGiftCard) return;

    cancelGiftCardMutation.mutate(cancelGiftCard.id, {
      onSuccess: () => {
        toast({ title: 'Gift card cancelled' });
        setCancelGiftCard(null);
      },
    });
  };

  const getStatusBadge = (giftCard) => {
    const status = getGiftCardStatus(giftCard);
    const config = GIFT_CARD_STATUSES[status];
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gift Cards</h1>
          <p className="text-muted-foreground mt-1">
            Create, issue, and manage digital gift cards.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Gift Card
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gift Cards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(giftCards || {}).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">With redeemable balances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total unused value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€1,450</div>
            <p className="text-xs text-muted-foreground mt-1">+12.5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        {error ? (
          <div className="p-6">
            <DataError
              title="Failed to load gift cards"
              message="Unable to fetch gift cards. Please try again."
              onRetry={refetch}
              error={error}
            />
          </div>
        ) : (
          <>
            <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b">
              <Tabs
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val)}
                className="w-full sm:w-auto"
              >
                <TabsList className="w-full sm:w-auto h-auto p-1 grid grid-cols-4 sm:flex">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs sm:text-sm">Active</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs sm:text-sm">Expired</TabsTrigger>
                  <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search codes or recipients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-6">
                  <TableSkeleton rows={4} columns={6} />
                </div>
              ) : filteredGiftCards.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Code & Recipient</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Remaining Balance</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGiftCards.map((giftCard) => {
                      const status = getGiftCardStatus(giftCard);

                      return (
                        <TableRow key={giftCard.id} className="group">
                          <TableCell className="pl-6">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded font-mono text-sm font-semibold tracking-wider text-primary">
                                  {giftCard.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleCopyCode(giftCard.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              {giftCard.recipient_name ? (
                                <div>
                                  <p className="text-sm font-medium mt-0.5">{giftCard.recipient_name}</p>
                                  {giftCard.recipient_email && (
                                    <p className="text-xs text-muted-foreground">
                                      {giftCard.recipient_email}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-muted-foreground">
                              €{Number(giftCard.initial_value).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              €{Number(giftCard.balance).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {giftCard.expires_at
                                  ? format(new Date(giftCard.expires_at), 'MMM d, yyyy')
                                  : 'Never'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(giftCard)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {status === 'active' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                  <DropdownMenuItem
                                    onClick={() => setCancelGiftCard(giftCard)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Cancel Card
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 cursor-not-allowed">
                                <span className="sr-only">No actions available</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Gift className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No gift cards found</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    You haven&apos;t issued any gift cards yet. Create one to boost your sales and attract new clients.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Issue First Gift Card
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Forms & Dialogs */}
      {showForm && (
        <GiftCardForm
          salonId={salonId}
          onClose={() => setShowForm(false)}
        />
      )}

      <AlertDialog
        open={!!cancelGiftCard}
        onOpenChange={(open) => !open && setCancelGiftCard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Gift Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the gift card{' '}
              <strong className="font-mono text-foreground">
                {cancelGiftCard?.code}
              </strong>
              ? This action cannot be undone, and the remaining balance will be voided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={cancelGiftCardMutation.isPending}
            >
              {cancelGiftCardMutation.isPending ? 'Cancelling...' : 'Cancel Card'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
