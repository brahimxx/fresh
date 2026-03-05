'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import {
  useMyProfile,
  useUpdateProfile,
  useUpcomingBookings,
  usePastBookings,
  useMyPackages,
  useMyGiftCards,
  useMyReviews,
  useMyAddresses,
  useAddAddress,
  useDeleteAddress,
} from '@/hooks/use-my-profile';

import { useJsApiLoader } from '@react-google-maps/api';

const MAPS_LIBRARIES = ['places'];

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Mail, Phone, MapPin, Calendar, Star, Gift, Package,
  ChevronLeft, ChevronRight, Pencil, Save, X, AlertCircle, Home, Briefcase, Heart, Building, Plus, Trash
} from 'lucide-react';
import Link from 'next/link';

// ─── Status Badge Helper ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    no_show: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    expired: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    used: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${map[status] || 'bg-muted text-muted-foreground'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

// ─── Star Rating ───────────────────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL INFO TAB
// ═══════════════════════════════════════════════════════════════════════════
function PersonalInfoTab({ profile, isLoading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const updateProfile = useUpdateProfile();

  const startEditing = () => {
    setFormData({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      gender: profile?.gender || '',
      dateOfBirth: profile?.dateOfBirth || '',
      address: profile?.address || '',
      city: profile?.city || '',
      postalCode: profile?.postalCode || '',
      country: profile?.country || '',
    });
    setErrorMsg('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setErrorMsg('');
    try {
      await updateProfile.mutateAsync(formData);
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  const fields = [
    { key: 'firstName', label: 'First Name', icon: User, type: 'text' },
    { key: 'lastName', label: 'Last Name', icon: User, type: 'text' },
    { key: 'email', label: 'Email', icon: Mail, type: 'email' },
    { key: 'phone', label: 'Phone', icon: Phone, type: 'tel' },
    { key: 'gender', label: 'Gender', icon: User, type: 'select', options: ['', 'male', 'female', 'other'] },
    { key: 'dateOfBirth', label: 'Date of Birth', icon: Calendar, type: 'date' },
    { key: 'address', label: 'Address', icon: MapPin, type: 'text' },
    { key: 'city', label: 'City', icon: MapPin, type: 'text' },
    { key: 'postalCode', label: 'Postal Code', icon: MapPin, type: 'text' },
    { key: 'country', label: 'Country', icon: MapPin, type: 'text' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Avatar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—'}
              </p>
            </div>
            <Button
              variant={isEditing ? 'outline' : 'default'}
              onClick={isEditing ? () => setIsEditing(false) : startEditing}
              className="shrink-0"
            >
              {isEditing ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Pencil className="h-4 w-4 mr-2" />Edit</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Fields Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const Icon = f.icon;
          const value = isEditing ? formData[f.key] : (profile?.[f.key] || '—');
          return (
            <Card key={f.key}>
              <CardContent className="p-4">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5" />{f.label}
                </label>
                {isEditing ? (
                  f.type === 'select' ? (
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData[f.key]}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    >
                      {f.options.map((o) => (
                        <option key={o} value={o}>{o || 'Select...'}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={f.type}
                      value={formData[f.key]}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    />
                  )
                ) : (
                  <p className="text-sm font-medium">{value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isEditing && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKINGS TAB
// ═══════════════════════════════════════════════════════════════════════════
function BookingsTab() {
  const [pastPage, setPastPage] = useState(1);
  const { data: upcoming, isLoading: loadingUpcoming } = useUpcomingBookings(5);
  const { data: pastData, isLoading: loadingPast } = usePastBookings(pastPage, 6);
  const past = pastData?.bookings || [];
  const pagination = pastData?.pagination || {};

  return (
    <div className="space-y-8">
      {/* Upcoming */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />Upcoming Appointments
        </h3>
        {loadingUpcoming ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : upcoming?.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((b) => (
              <Card key={b.id} className="border-l-4 border-l-primary">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{b.salonName}</h4>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{b.services}</p>
                  {b.staffName && <p className="text-sm text-muted-foreground">with {b.staffName}</p>}
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{new Date(b.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className="text-muted-foreground">at</span>
                    <span className="font-medium">{new Date(b.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming appointments</CardContent></Card>
        )}
      </div>

      {/* Past */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Past Appointments</h3>
        {loadingPast ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
        ) : past.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {past.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{b.salonName}</h4>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{b.services}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(b.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {b.paymentAmount != null && (
                      <p className="text-sm font-semibold mt-2">${b.paymentAmount.toFixed(2)}</p>
                    )}
                    {b.hasReview && (
                      <div className="mt-2"><StarRating rating={b.rating} /></div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPastPage((p) => Math.max(1, p - 1))}
                  disabled={pastPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pastPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPastPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pastPage >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No past appointments yet</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PACKAGES & GIFT CARDS TAB
// ═══════════════════════════════════════════════════════════════════════════
function PackagesGiftCardsTab({ userId }) {
  const { data: packages = [], isLoading: loadingPkgs } = useMyPackages(userId);
  const { data: giftCards = [], isLoading: loadingGCs } = useMyGiftCards(userId);

  return (
    <div className="space-y-8">
      {/* Packages */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />My Packages
        </h3>
        {loadingPkgs ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : packages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {packages.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{p.packageName}</h4>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{p.salonName}</p>
                  {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm">
                      {p.remainingUses != null ? <>{p.remainingUses} uses left</> : 'Unlimited'}
                    </span>
                    <span className="font-semibold">${p.purchasePrice.toFixed(2)}</span>
                  </div>
                  {p.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires {new Date(p.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No packages purchased yet</CardContent></Card>
        )}
      </div>

      {/* Gift Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />My Gift Cards
        </h3>
        {loadingGCs ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : giftCards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {giftCards.map((gc) => (
              <Card key={gc.id} className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{gc.code}</code>
                    <StatusBadge status={gc.status} />
                  </div>
                  {gc.recipientName && (
                    <p className="text-sm text-muted-foreground">To: {gc.recipientName}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-muted-foreground">
                      Balance: <span className="font-semibold text-foreground">${parseFloat(gc.remainingBalance).toFixed(2)}</span>
                      <span className="text-muted-foreground/50"> / ${parseFloat(gc.initialBalance).toFixed(2)}</span>
                    </span>
                  </div>
                  {gc.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires {new Date(gc.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No gift cards purchased yet</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS TAB
// ═══════════════════════════════════════════════════════════════════════════
function ReviewsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyReviews(page, 10);
  const reviews = data?.reviews || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />My Reviews
      </h3>
      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
      ) : reviews.length > 0 ? (
        <>
          <div className="space-y-4">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{r.salonName}</h4>
                      {r.salonCity && <p className="text-xs text-muted-foreground">{r.salonCity}</p>}
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {r.ownerReply && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Salon reply</p>
                      <p className="text-sm">{r.ownerReply}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">You haven't written any reviews yet</CardContent></Card>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ADDRESSES TAB
// ═══════════════════════════════════════════════════════════════════════════
function AddressesTab() {
  const { data: addresses = [], isLoading } = useMyAddresses();
  const addAddress = useAddAddress();
  const deleteAddress = useDeleteAddress();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ label: '', full_address: '', lat: '', lng: '', icon_name: 'Home', is_default: false });

  const ICONS = { Home, Briefcase, Heart, MapPin, Building, Star };

  const handleSave = async () => {
    try {
      await addAddress.mutateAsync({
        ...formData,
        lat: formData.lat || 48.8566, // fallback Paris lat
        lng: formData.lng || 2.3522,  // fallback Paris lng
      });
      setIsAdding(false);
      setFormData({ label: '', full_address: '', lat: '', lng: '', icon_name: 'Home', is_default: false });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />My Addresses
        </h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />Add New
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add New Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Label</label>
                <Input placeholder="e.g. Gym, Mom's House" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Icon</label>
                <div className="flex gap-2">
                  {[
                    { name: 'Home', Icon: Home },
                    { name: 'Briefcase', Icon: Briefcase },
                    { name: 'Heart', Icon: Heart },
                    { name: 'MapPin', Icon: MapPin },
                    { name: 'Building', Icon: Building },
                    { name: 'Star', Icon: Star }
                  ].map(({ name, Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon_name: name })}
                      className={`h-10 flex-1 rounded-md border flex items-center justify-center transition-colors ${formData.icon_name === name ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Full Address</label>
              <AddressAutocomplete
                value={formData.full_address}
                onChange={(loc) => {
                  setFormData({
                    ...formData,
                    full_address: loc.full_address,
                    lat: loc.lat || formData.lat,
                    lng: loc.lng || formData.lng,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_default" checked={formData.is_default} onChange={e => setFormData({ ...formData, is_default: e.target.checked })} />
              <label htmlFor="is_default" className="text-sm cursor-pointer">Set as default address</label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formData.label || !formData.full_address || addAddress.isPending}>
                {addAddress.isPending ? 'Saving...' : 'Save Address'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
      ) : addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((addr) => {
            const IconComponent = ICONS[addr.iconName] || MapPin;
            return (
              <Card key={addr.id} className={addr.isDefault ? "border-primary" : ""}>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className={"p-3 rounded-full " + (addr.isDefault ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base truncate">{addr.label}</h4>
                      {addr.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{addr.fullAddress}</p>
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => deleteAddress.mutate(addr.id)} className="text-xs text-destructive hover:underline">Remove</button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        !isAdding && <Card><CardContent className="p-8 text-center text-muted-foreground">You haven't added any addresses yet</CardContent></Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE

// ═══════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading } = useMyProfile();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/choose');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show nothing while auth is loading or user is not authenticated
  if (authLoading || !isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-12 w-full mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <Calendar className="h-4 w-4 hidden sm:block" />
            <span>Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="h-4 w-4 hidden sm:block" />
            <span>Packages</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4 hidden sm:block" />
            <span>Reviews</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4 hidden sm:block" />
            <span>Addresses</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <PersonalInfoTab profile={profile} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingsTab />
        </TabsContent>

        <TabsContent value="packages">
          <PackagesGiftCardsTab userId={profile?.id} />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
