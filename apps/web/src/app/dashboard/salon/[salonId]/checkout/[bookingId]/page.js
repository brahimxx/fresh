'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  CreditCard,
  Banknote,
  Gift,
  Percent,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Smartphone
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { useCheckout, useCreatePayment, useValidateDiscount, useCheckGiftCard, formatCurrency, PAYMENT_METHODS } from '@/hooks/use-payments';
import { useProducts } from '@/hooks/use-products';
import { AddProductDialog } from '@/components/checkout/add-product-dialog';
import { PaymentSuccessDialog } from '@/components/checkout/payment-success';

export default function CheckoutPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var bookingId = resolvedParams.bookingId;
  var router = useRouter();
  
  var [discountCode, setDiscountCode] = useState('');
  var [appliedDiscount, setAppliedDiscount] = useState(null);
  var [giftCardCode, setGiftCardCode] = useState('');
  var [appliedGiftCard, setAppliedGiftCard] = useState(null);
  var [tipAmount, setTipAmount] = useState(0);
  var [selectedMethod, setSelectedMethod] = useState('card');
  var [addedProducts, setAddedProducts] = useState([]);
  var [addProductOpen, setAddProductOpen] = useState(false);
  var [paymentSuccess, setPaymentSuccess] = useState(false);
  var [processing, setProcessing] = useState(false);
  
  var { data: checkout, isLoading } = useCheckout(bookingId);
  var { data: products } = useProducts(salonId);
  var createPayment = useCreatePayment();
  var validateDiscount = useValidateDiscount();
  var checkGiftCard = useCheckGiftCard();
  
  // Calculate totals
  var servicesTotal = checkout?.services?.reduce(function(sum, s) {
    return sum + Number(s.price || 0);
  }, 0) || 0;
  
  var productsTotal = addedProducts.reduce(function(sum, p) {
    return sum + (Number(p.price || 0) * (p.quantity || 1));
  }, 0);
  
  var subtotal = servicesTotal + productsTotal;
  
  var discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountAmount = subtotal * (appliedDiscount.value / 100);
    } else {
      discountAmount = appliedDiscount.value;
    }
  }
  
  var giftCardAmount = appliedGiftCard ? Math.min(appliedGiftCard.balance, subtotal - discountAmount) : 0;
  
  var total = subtotal - discountAmount - giftCardAmount + tipAmount;
  
  function handleApplyDiscount() {
    if (!discountCode) return;
    
    validateDiscount.mutate(
      { code: discountCode, salon_id: salonId, amount: subtotal },
      {
        onSuccess: function(data) {
          setAppliedDiscount(data);
          setDiscountCode('');
        },
      }
    );
  }
  
  function handleApplyGiftCard() {
    if (!giftCardCode) return;
    
    checkGiftCard.mutate(
      { code: giftCardCode, salon_id: salonId },
      {
        onSuccess: function(data) {
          setAppliedGiftCard(data);
          setGiftCardCode('');
        },
      }
    );
  }
  
  function handleAddProduct(product) {
    setAddedProducts(function(prev) {
      var existing = prev.find(function(p) { return p.id === product.id; });
      if (existing) {
        return prev.map(function(p) {
          if (p.id === product.id) {
            return { ...p, quantity: (p.quantity || 1) + 1 };
          }
          return p;
        });
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }
  
  function handleRemoveProduct(productId) {
    setAddedProducts(function(prev) {
      return prev.filter(function(p) { return p.id !== productId; });
    });
  }
  
  function handleTipPreset(amount) {
    setTipAmount(amount);
  }
  
  function handleProcessPayment() {
    setProcessing(true);
    
    var paymentData = {
      booking_id: bookingId,
      salon_id: salonId,
      method: selectedMethod,
      amount: total,
      tip_amount: tipAmount,
      discount_id: appliedDiscount?.id,
      gift_card_id: appliedGiftCard?.id,
      products: addedProducts.map(function(p) {
        return { product_id: p.id, quantity: p.quantity, price: p.price };
      }),
    };
    
    createPayment.mutate(paymentData, {
      onSuccess: function() {
        setProcessing(false);
        setPaymentSuccess(true);
      },
      onError: function() {
        setProcessing(false);
      },
    });
  }
  
  function handlePaymentComplete() {
    router.push('/dashboard/salon/' + salonId + '/calendar');
  }
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={function() { router.back(); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">
            Booking #{bookingId} • {checkout?.client?.name || 'Walk-in'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checkout?.services?.map(function(service, index) {
                return (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} min • {service.staff_name || 'Any staff'}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(service.price)}</p>
                  </div>
                );
              }) || (
                <p className="text-muted-foreground">No services</p>
              )}
            </CardContent>
          </Card>
          
          {/* Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Products</CardTitle>
              <Button variant="outline" size="sm" onClick={function() { setAddProductOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {addedProducts.length > 0 ? (
                addedProducts.map(function(product) {
                  return (
                    <div key={product.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={function() { handleRemoveProduct(product.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {product.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(product.price * (product.quantity || 1))}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-sm">No products added</p>
              )}
            </CardContent>
          </Card>
          
          {/* Discounts & Gift Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discounts & Gift Cards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Discount Code */}
              <div className="space-y-2">
                <Label>Discount Code</Label>
                {appliedDiscount ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">
                        {appliedDiscount.code} - {appliedDiscount.type === 'percentage' 
                          ? appliedDiscount.value + '% off' 
                          : formatCurrency(appliedDiscount.value) + ' off'}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={function() { setAppliedDiscount(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={function(e) { setDiscountCode(e.target.value); }}
                    />
                    <Button 
                      variant="outline"
                      onClick={handleApplyDiscount}
                      disabled={validateDiscount.isPending}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Gift Card */}
              <div className="space-y-2">
                <Label>Gift Card</Label>
                {appliedGiftCard ? (
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-600" />
                      <span className="text-purple-700">
                        Gift Card ({formatCurrency(appliedGiftCard.balance)} balance)
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={function() { setAppliedGiftCard(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Gift card code"
                      value={giftCardCode}
                      onChange={function(e) { setGiftCardCode(e.target.value); }}
                    />
                    <Button 
                      variant="outline"
                      onClick={handleApplyGiftCard}
                      disabled={checkGiftCard.isPending}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Tip */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {[0, 2, 5, 10, 15, 20].map(function(amount) {
                  return (
                    <Button
                      key={amount}
                      variant={tipAmount === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={function() { handleTipPreset(amount); }}
                    >
                      {amount === 0 ? 'No tip' : formatCurrency(amount)}
                    </Button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0">Custom:</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.50"
                  value={tipAmount}
                  onChange={function(e) { setTipAmount(parseFloat(e.target.value) || 0); }}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Summary & Payment */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Services</span>
                <span>{formatCurrency(servicesTotal)}</span>
              </div>
              {productsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Products</span>
                  <span>{formatCurrency(productsTotal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {giftCardAmount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Gift Card</span>
                  <span>-{formatCurrency(giftCardAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tip</span>
                  <span>{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {PAYMENT_METHODS.slice(0, 4).map(function(method) {
                var Icon = method.value === 'card' ? CreditCard : 
                           method.value === 'cash' ? Banknote :
                           method.value === 'card_terminal' ? Smartphone :
                           Gift;
                return (
                  <Button
                    key={method.value}
                    variant={selectedMethod === method.value ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={function() { setSelectedMethod(method.value); }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {method.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
          
          {/* Pay Button */}
          <Button 
            className="w-full h-12 text-lg"
            onClick={handleProcessPayment}
            disabled={processing || total <= 0}
          >
            {processing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            Pay {formatCurrency(total)}
          </Button>
        </div>
      </div>
      
      {/* Add Product Dialog */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        products={products || []}
        onAdd={handleAddProduct}
      />
      
      {/* Success Dialog */}
      <PaymentSuccessDialog
        open={paymentSuccess}
        amount={total}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
}
