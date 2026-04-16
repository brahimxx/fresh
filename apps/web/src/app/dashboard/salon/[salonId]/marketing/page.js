"use client";

import { use } from "react";
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
    color: "bg-blue-100 text-blue-600",
    stats: "3 Active",
  },
  {
    title: "Discounts",
    description: "Create smart promo codes to boost bookings and sales.",
    href: "discounts",
    icon: Ticket,
    color: "bg-emerald-100 text-emerald-600",
    stats: "12 Codes",
  },
  {
    title: "Gift Cards",
    description: "Sell and track digital gift cards for special occasions.",
    href: "gift-cards",
    icon: Gift,
    color: "bg-violet-100 text-violet-600",
    stats: "$1.4k Balance",
  },
  {
    title: "Packages",
    description: "Bundle services together for memberships and premium deals.",
    href: "packages",
    icon: Package,
    color: "bg-amber-100 text-amber-600",
    stats: "5 Bundles",
  },
  {
    title: "Waitlist",
    description: "Keep track of clients waiting for specific cancelled slots.",
    href: "waitlist",
    icon: Clock,
    color: "bg-rose-100 text-rose-600",
    stats: "8 Waiting",
  },
];

export default function MarketingPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  const basePath = `/dashboard/salon/${salonId}/marketing/`;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Marketing & Promotions</h1>
        <p className="text-muted-foreground text-lg">
          Drive growth, retain clients, and increase sales with built-in tools.
        </p>
      </div>

      {/* Quick Stats overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Reach</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,450</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+12%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promo Usage</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">148</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              Active redemptions
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gift Card Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,150</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+8%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waitlist Conversions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">64%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              Filled cancellations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tools Grid */}
      <h2 className="text-xl font-semibold mt-10 mb-[-1rem]">Marketing Suite</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MARKETING_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="group hover:border-primary/50 transition-all duration-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-xl ${section.color} flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {section.stats}
                  </div>
                </div>
                <CardTitle className="mt-4 text-lg">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-between hover:bg-secondary/60 group-hover:bg-secondary"
                >
                  <Link href={basePath + section.href}>
                    Manage {section.title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
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
