"use client";

import { useState } from "react";
import { 
  CreditCard, 
  CheckCircle2, 
  Download, 
  Zap, 
  ShieldCheck, 
  Building2,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const INVOICES_MOCK = [
  { id: "INV-2026-004", date: "Apr 01, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-2026-003", date: "Mar 01, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-2026-002", date: "Feb 01, 2026", amount: "$49.00", status: "Paid" },
];

export default function BillingSettingsPage() {
  const [isUpgrading, setIsUpgrading] = useState(false);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-extrabold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Manage your platform subscription plan, payment methodology, and review your invoice history.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Current Plan & Upgrade */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Plan Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-primary/20 shadow-lg shadow-primary/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Zap className="w-48 h-48" />
              </div>
              
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 backdrop-blur-md px-3 py-1 font-semibold uppercase tracking-wider text-xs">
                    Active Plan
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Next billing: May 01, 2026
                  </span>
                </div>
                <CardTitle className="text-3xl font-bold">Pro Salon Tier</CardTitle>
                <CardDescription className="text-base">
                  $49.00 / month • Billed monthly
                </CardDescription>
              </CardHeader>

              <CardContent className="relative z-10 space-y-6">
                <div className="space-y-3">
                  {["Unlimited Staff Members", "Advanced Analytics Engine", "Priority Email Support", "Custom Booking Widget"].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="bg-muted/30 border-t border-border/50 p-6 flex items-center justify-between relative z-10">
                <p className="text-sm text-muted-foreground font-medium">Want enterprise-level capacity?</p>
                <Button 
                  onClick={() => setIsUpgrading(true)} 
                  disabled={isUpgrading}
                  className="bg-primary shadow-md hover:shadow-lg transition-all rounded-xl"
                >
                  {isUpgrading ? "Processing..." : "Upgrade to Enterprise"}
                  <ArrowUpRight className="w-4 h-4 ml-1.5 opacity-70" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Payment Method */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Payment Method</CardTitle>
                    <CardDescription>The primary card used for recurring billing.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg">Update Card</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 border border-border/50 rounded-2xl bg-muted/20">
                  <div className="w-16 h-10 rounded-md bg-[#5433FF] flex items-center justify-center shrink-0 shadow-inner">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold tracking-tight text-foreground">Visa ending in **** 4242</p>
                    <p className="text-sm text-muted-foreground font-medium">Expires 12/2028</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">Default</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Invoices & Security */}
        <div className="space-y-8">
          
          {/* Billing History */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Invoice History</CardTitle>
                <CardDescription>Recent billing statements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {INVOICES_MOCK.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between group">
                    <div>
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">{inv.amount}</p>
                      <p className="text-sm text-muted-foreground">{inv.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground border-border/50 shadow-sm">
                        {inv.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="link" className="px-0 w-full justify-center text-muted-foreground hover:text-primary">
                  View full history
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
             <Card className="border-none bg-muted/40 shadow-inner">
                <CardContent className="p-6">
                   <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm">
                         <ShieldCheck className="w-6 h-6 text-emerald-500" />
                      </div>
                      <h4 className="font-bold">Secure Transactions</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                         Your payment information is encrypted and securely processed by our PCI-compliant financial partner.
                      </p>
                   </div>
                </CardContent>
             </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
