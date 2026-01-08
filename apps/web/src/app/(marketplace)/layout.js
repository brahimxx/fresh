'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, MapPin, Menu, X, User } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryProvider } from '@/providers/query-provider';

export default function MarketplaceLayout({ children }) {
  var [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  var pathname = usePathname();
  
  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="font-bold text-xl hidden sm:block">Fresha</span>
              </Link>
              
              {/* Search Bar - Desktop */}
              <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for services or salons..."
                    className="pl-10 bg-gray-50"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Location"
                    className="pl-10 w-40 bg-gray-50"
                  />
                </div>
                <Button>Search</Button>
              </div>
              
              {/* Right Side */}
              <div className="flex items-center gap-4">
                <Link href="/for-business" className="hidden sm:block text-sm font-medium hover:text-primary">
                  For Business
                </Link>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Log in</span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={function() { setMobileMenuOpen(!mobileMenuOpen); }}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search services or salons..." className="pl-10" />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Location" className="pl-10" />
              </div>
              <Button className="w-full">Search</Button>
              <Link href="/for-business" className="block text-center text-sm font-medium">
                For Business
              </Link>
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main>
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Discover</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="/salons" className="hover:text-white">Hair Salons</Link></li>
                  <li><Link href="/salons?category=nails" className="hover:text-white">Nail Salons</Link></li>
                  <li><Link href="/salons?category=spa" className="hover:text-white">Spas</Link></li>
                  <li><Link href="/salons?category=barber" className="hover:text-white">Barbershops</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">For Business</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="/for-business" className="hover:text-white">Partner with us</Link></li>
                  <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                  <li><Link href="/features" className="hover:text-white">Features</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              © 2026 Fresha. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </QueryProvider>
  );
}
