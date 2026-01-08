import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stats grid skeleton (4 cards)
export function StatsGridSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map(function(_, i) {
        return <StatsCardSkeleton key={i} />;
      })}
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b">
      {Array.from({ length: columns }).map(function(_, i) {
        return (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: i === 0 ? '150px' : i === columns - 1 ? '80px' : '100px' }}
          />
        );
      })}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        {/* Table header */}
        <div className="flex items-center gap-4 py-3 border-b">
          {Array.from({ length: columns }).map(function(_, i) {
            return <Skeleton key={i} className="h-4 w-20" />;
          })}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map(function(_, i) {
          return <TableRowSkeleton key={i} columns={columns} />;
        })}
      </CardContent>
    </Card>
  );
}

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Time column + days */}
        <div className="grid grid-cols-8 gap-2">
          {/* Time column header */}
          <Skeleton className="h-8 w-full" />
          {/* Day headers */}
          {Array.from({ length: 7 }).map(function(_, i) {
            return <Skeleton key={i} className="h-8 w-full" />;
          })}
        </div>
        {/* Time slots */}
        <div className="mt-4 space-y-2">
          {Array.from({ length: 10 }).map(function(_, i) {
            return (
              <div key={i} className="grid grid-cols-8 gap-2">
                <Skeleton className="h-12 w-full" />
                {Array.from({ length: 7 }).map(function(_, j) {
                  return <Skeleton key={j} className="h-12 w-full opacity-30" />;
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: fields }).map(function(_, i) {
          return (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          );
        })}
        <Skeleton className="h-10 w-28 ml-auto" />
      </CardContent>
    </Card>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="p-0">
        {Array.from({ length: items }).map(function(_, i) {
          return <ListItemSkeleton key={i} />;
        })}
      </CardContent>
    </Card>
  );
}

// Chart skeleton
export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-between gap-2 pt-4">
          {Array.from({ length: 12 }).map(function(_, i) {
            var height = 40 + Math.random() * 200;
            return (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: height + 'px' }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-4">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(function(m) {
            return <Skeleton key={m} className="h-3 w-6" />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Detail page skeleton
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FormSkeleton fields={4} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ListSkeleton items={5} />
      </div>
    </div>
  );
}
