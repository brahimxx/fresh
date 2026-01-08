'use client';

import { use } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

var MARKETING_SECTIONS = [
  {
    title: 'Campaigns',
    description: 'Create and manage email & SMS marketing campaigns',
    href: 'campaigns',
    icon: Megaphone,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'Discounts',
    description: 'Set up discount codes and promotional offers',
    href: 'discounts',
    icon: Percent,
    color: 'bg-green-100 text-green-600',
  },
  {
    title: 'Gift Cards',
    description: 'Manage gift card products and track redemptions',
    href: 'gift-cards',
    icon: Gift,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'Packages',
    description: 'Create service bundles and membership packages',
    href: 'packages',
    icon: Package,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    title: 'Waitlist',
    description: 'Manage clients waiting for available slots',
    href: 'waitlist',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-600',
  },
];

export default function MarketingPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var basePath = '/dashboard/salon/' + salonId + '/marketing/';
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing</h1>
        <p className="text-muted-foreground">
          Promote your business and grow your client base
        </p>
      </div>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">245</p>
                <p className="text-sm text-muted-foreground">Clients Reached</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">$1,450</p>
                <p className="text-sm text-muted-foreground">Gift Cards Sold</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Section Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MARKETING_SECTIONS.map(function(section) {
          var Icon = section.icon;
          return (
            <Card key={section.href} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={'p-3 rounded-lg ' + section.color}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href={basePath + section.href}>
                    Manage {section.title}
                    <ArrowRight className="h-4 w-4 ml-2" />
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
