"use client";

import { use } from "react";
import { RequirePermission } from '@/components/layout/require-permission';
import Link from "next/link";
import {
  Megaphone,
  Percent,
  Gift,
  Package,
  Clock,
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Ticket,
  Mail,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MARKETING_SECTIONS = [
  {
    title: "Campaigns",
    description: "Launch email & SMS marketing to targeted client groups.",
    href: "campaigns",
    icon: Mail,
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-500/30",
    hoverShadow: "hover:shadow-blue-500/10",
    stats: "3 Active",
  },
  {
    title: "Discounts",
    description: "Create smart promo codes to boost bookings and sales.",
    href: "discounts",
    icon: Ticket,
    bgColor: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-emerald-500/10",
    stats: "12 Codes",
  },
  {
    title: "Gift Cards",
    description: "Sell and track digital gift cards for special occasions.",
    href: "gift-cards",
    icon: Gift,
    bgColor: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    hoverBorder: "hover:border-violet-500/30",
    hoverShadow: "hover:shadow-violet-500/10",
    stats: "$1.4k Balance",
  },
  {
    title: "Packages",
    description: "Bundle services together for memberships and premium deals.",
    href: "packages",
    icon: Package,
    bgColor: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/30",
    hoverShadow: "hover:shadow-amber-500/10",
    stats: "5 Bundles",
  },
  {
    title: "Waitlist",
    description: "Keep track of clients waiting for specific cancelled slots.",
    href: "waitlist",
    icon: Clock,
    bgColor: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    hoverBorder: "hover:border-rose-500/30",
    hoverShadow: "hover:shadow-rose-500/10",
    stats: "8 Waiting",
  },
];

export default function MarketingPage({ params }) {
  return (
    <RequirePermission page="marketing">
      <MarketingContent params={params} />
    </RequirePermission>
  );
}

function MarketingContent({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const basePath = `/dashboard/salon/${salonId}/marketing/`;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Decorative Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/10 p-8 sm:p-12 transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 group">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <Megaphone className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border text-sm font-medium w-fit shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Growth Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Marketing & Promotions
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed max-w-xl">
            Drive growth, retain clients, and increase sales with intelligent tools designed for modern salons.
          </p>
        </div>
      </div>

      {/* Quick Stats overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/20 group cursor-default">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Monthly Reach</CardTitle>
            <div className="p-2 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">2,450</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center bg-green-500/10 text-green-600 dark:text-green-400 w-fit px-2 py-0.5 rounded-md font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% <span className="text-muted-foreground ml-1 font-normal bg-transparent">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/20 group cursor-default">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Promo Usage</CardTitle>
            <div className="p-2 bg-emerald-500/5 rounded-full group-hover:bg-emerald-500/10 transition-colors">
              <Percent className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">148</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center">
              Active redemptions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-violet-500/20 group cursor-default">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Gift Card Sales</CardTitle>
            <div className="p-2 bg-violet-500/5 rounded-full group-hover:bg-violet-500/10 transition-colors">
              <DollarSign className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">$3,150</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center bg-green-500/10 text-green-600 dark:text-green-400 w-fit px-2 py-0.5 rounded-md font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8% <span className="text-muted-foreground ml-1 font-normal bg-transparent">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-rose-500/20 group cursor-default">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Waitlist Conversions</CardTitle>
            <div className="p-2 bg-rose-500/5 rounded-full group-hover:bg-rose-500/10 transition-colors">
              <Activity className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">64%</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center">
              Filled cancellations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tools Grid */}
      <div className="flex items-center justify-between mt-12 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Marketing Suite</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MARKETING_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className={`relative overflow-hidden group transition-all duration-500 border-border/50 bg-background/50 backdrop-blur-sm hover:-translate-y-1 ${section.hoverBorder} ${section.hoverShadow}`}
            >
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3.5 rounded-2xl ${section.bgColor} ${section.iconColor} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${section.bgColor} ${section.iconColor} cursor-default`}>
                    {section.stats}
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{section.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed max-w-[95%]">
                        {section.description}
                    </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-2">
                <Button
                  variant="outline"
                  asChild
                  className={`w-full justify-between transition-all duration-300 bg-background/50 hover:bg-background ${section.iconColor} border-border/50 group-hover:border-current/20`}
                >
                  <Link href={basePath + section.href}>
                    <span className="font-medium text-foreground">Manage {section.title}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
