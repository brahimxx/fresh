import fs from 'fs';

const p = 'src/app/dashboard/salon/[salonId]/marketing/waitlist/page.js';

let code = fs.readFileSync(p, 'utf8');

code = code.replace(
  '<div className="space-y-6">',
  '<div className="space-y-6 max-w-[1400px] mx-auto">'
);

code = code.replace(
  /<div className="flex items-center justify-between">[\s\S]*?<Button onClick=\{function\(\) \{ setShowForm\(true\); setEditingEntry\(null\); \}\}>[\s\S]*?<Plus className="h-4 w-4 mr-2" \/>[\s\S]*?Add to Waitlist[\s\S]*?<\/Button>[\s\S]*?<\/div>/,
  `<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waitlist</h1>
          <p className="text-muted-foreground mt-1">
            Manage clients waiting for available slots.
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingEntry(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add to Waitlist
        </Button>
      </div>`
);

code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-4 gap-4">[\s\S]*?<\/div>\s*<\/div>/,
  `
  <div className="grid gap-4 md:grid-cols-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Waiting</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalWaiting}</div>
        <p className="text-xs text-muted-foreground mt-1">Active waitlist requests</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pending Today</CardTitle>
        <Clock className="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-amber-600">{todayWaiting}</div>
        <p className="text-xs text-muted-foreground mt-1">Hoping for spots today</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Successfully Notified</CardTitle>
        <Bell className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{notifiedCount}</div>
        <p className="text-xs text-muted-foreground mt-1">Pending their response</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Booked</CardTitle>
        <CheckCircle className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">{bookedCount}</div>
        <p className="text-xs text-muted-foreground mt-1">Converted to appointments</p>
      </CardContent>
    </Card>
  </div>
  `
);

fs.writeFileSync(p, code);
