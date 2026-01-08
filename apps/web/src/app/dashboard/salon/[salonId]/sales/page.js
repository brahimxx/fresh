'use client';

import { useState } from 'react';
import { use } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  Search,
  Filter,
  Download,
  Eye,
  RotateCcw,
  CreditCard,
  Banknote,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { usePayments, formatCurrency, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/hooks/use-payments';
import { PaymentDetailDialog } from '@/components/sales/payment-detail';
import { RefundDialog } from '@/components/sales/refund-dialog';

export default function SalesPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  
  var [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  var [statusFilter, setStatusFilter] = useState('all');
  var [methodFilter, setMethodFilter] = useState('all');
  var [searchQuery, setSearchQuery] = useState('');
  var [selectedPayment, setSelectedPayment] = useState(null);
  var [refundPayment, setRefundPayment] = useState(null);
  
  var { data: payments, isLoading, refetch } = usePayments(salonId, {
    start_date: format(dateRange.from, 'yyyy-MM-dd'),
    end_date: format(dateRange.to, 'yyyy-MM-dd'),
    status: statusFilter !== 'all' ? statusFilter : undefined,
    method: methodFilter !== 'all' ? methodFilter : undefined,
  });
  
  // Filter by search
  var filteredPayments = payments || [];
  if (searchQuery) {
    var query = searchQuery.toLowerCase();
    filteredPayments = filteredPayments.filter(function(p) {
      return (p.client_name && p.client_name.toLowerCase().includes(query)) ||
             (p.booking_id && String(p.booking_id).includes(query)) ||
             (p.id && String(p.id).includes(query));
    });
  }
  
  // Calculate stats
  var totalRevenue = filteredPayments.reduce(function(sum, p) {
    if (p.status === 'completed') {
      return sum + Number(p.amount || 0);
    }
    return sum;
  }, 0);
  
  var totalTransactions = filteredPayments.filter(function(p) {
    return p.status === 'completed';
  }).length;
  
  var refundedAmount = filteredPayments.reduce(function(sum, p) {
    if (p.status === 'refunded' || p.status === 'partial_refund') {
      return sum + Number(p.refunded_amount || p.amount || 0);
    }
    return sum;
  }, 0);
  
  var avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  function getMethodIcon(method) {
    if (method === 'card' || method === 'card_terminal') {
      return CreditCard;
    }
    return Banknote;
  }
  
  function getMethodLabel(method) {
    var found = PAYMENT_METHODS.find(function(m) { return m.value === method; });
    return found ? found.label : method;
  }
  
  function getStatusBadge(status) {
    var config = PAYMENT_STATUSES[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
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
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            View payment history and transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={function() { refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Receipt className="h-4 w-4" />
            <span className="text-sm">Transactions</span>
          </div>
          <p className="text-2xl font-bold">{totalTransactions}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Avg. Transaction</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(avgTransaction)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm">Refunded</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(refundedAmount)}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, booking ID..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
            className="pl-9"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[240px] justify-start">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={function(range) { 
                if (range?.from && range?.to) {
                  setDateRange(range); 
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {PAYMENT_METHODS.map(function(method) {
              return (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
      {/* Payments Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredPayments.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(function(payment) {
                var MethodIcon = getMethodIcon(payment.method);
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.client_name || 'Walk-in'}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        #{payment.booking_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MethodIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{getMethodLabel(payment.method)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                      {payment.tip_amount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          incl. {formatCurrency(payment.tip_amount)} tip
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={function() { setSelectedPayment(payment); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {payment.status === 'completed' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={function() { setRefundPayment(payment); }}
                          >
                            <RotateCcw className="h-4 w-4" />
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
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No transactions found for the selected period
          </p>
        </div>
      )}
      
      {/* Payment Detail Dialog */}
      <PaymentDetailDialog
        open={!!selectedPayment}
        onOpenChange={function(open) { if (!open) setSelectedPayment(null); }}
        payment={selectedPayment}
      />
      
      {/* Refund Dialog */}
      <RefundDialog
        open={!!refundPayment}
        onOpenChange={function(open) { if (!open) setRefundPayment(null); }}
        payment={refundPayment}
        onSuccess={function() { setRefundPayment(null); refetch(); }}
      />
    </div>
  );
}
