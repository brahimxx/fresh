'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, Calendar, LayoutDashboard, Settings } from 'lucide-react';
import { useState, Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/marketplace/search-bar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MarketplaceLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const isOwner = user?.role === 'owner';

  // Show header search on all pages except the homepage
  const showHeaderSearch = pathname !== '/';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${pathname === '/salons' ? 'max-w-[1800px]' : 'max-w-7xl'}`}>
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-primary-foreground font-bold text-lg">F</span>
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">Fresh</span>
            </Link>

            {/* Search Bar - Desktop */}
            {showHeaderSearch && (
              <div className="hidden md:block flex-1 max-w-2xl mx-8">
                <Suspense fallback={<div className="h-10 w-full bg-muted rounded-full animate-pulse" />}>
                  <SearchBar
                    size="compact"
                    className=""
                  />
                </Suspense>
              </div>
            )}

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {!isAuthenticated && pathname === '/' && (
                <Link href="/auth/choose" className="hidden sm:block text-sm font-medium hover:text-primary">
                  For Business
                </Link>
              )}
              {isAuthenticated && !isOwner && pathname === '/' && (
                <Link href="/onboarding" className="hidden sm:block text-sm font-medium hover:text-primary">
                  List Your Business
                </Link>
              )}
              {isAuthenticated && isOwner && (
                <Link href="/dashboard" className="hidden sm:block text-sm font-medium hover:text-primary">
                  Dashboard
                </Link>
              )}

              <ThemeToggle />

              {!isAuthenticated ? (
                <Link href="/auth/choose">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Log in</span>
                  </Button>
                </Link>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isOwner ? (
                      <Link href="/dashboard">
                        <DropdownMenuItem className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Owner Dashboard</span>
                        </DropdownMenuItem>
                      </Link>
                    ) : (
                      <Link href="/bookings">
                        <DropdownMenuItem className="cursor-pointer">
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>My Bookings</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => logout()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={function () { setMobileMenuOpen(!mobileMenuOpen); }}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 space-y-4">
            {pathname !== '/' && (
              <div className="mb-2">
                <Suspense fallback={<div className="h-10 w-full bg-muted rounded-full animate-pulse" />}>
                  <SearchBar
                    size="compact"
                  />
                </Suspense>
              </div>
            )}
            {!isAuthenticated && (
              <Link href="/login?type=professional" className="block text-center text-sm font-medium">
                For Business
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      {pathname !== '/salons' && (
        <footer className="bg-muted/30 border-t border-border/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Discover</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/salons" className="hover:text-foreground">Hair Salons</Link></li>
                  <li><Link href="/salons?category=nails" className="hover:text-foreground">Nail Salons</Link></li>
                  <li><Link href="/salons?category=spa" className="hover:text-foreground">Spas</Link></li>
                  <li><Link href="/salons?category=barber" className="hover:text-foreground">Barbershops</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">For Business</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/register?type=professional" className="hover:text-foreground">Partner with us</Link></li>
                  <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                  <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
              © 2026 Fresh. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
