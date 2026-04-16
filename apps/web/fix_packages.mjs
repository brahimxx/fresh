import fs from 'fs';

const p = 'src/app/dashboard/salon/[salonId]/marketing/packages/page.js';

let code = fs.readFileSync(p, 'utf8');

// Replace top container
code = code.replace(
  '<div className="space-y-6">',
  '<div className="space-y-6 max-w-[1400px] mx-auto">'
);

// Replace default header with nice header
code = code.replace(
  /<div className="flex items-center justify-between">[\s\S]*?<Button onClick=\{function\(\) \{ setShowForm\(true\); setEditingPackage\(null\); \}\}>[\s\S]*?<Plus className="h-4 w-4 mr-2" \/>[\s\S]*?Create Package[\s\S]*?<\/Button>[\s\S]*?<\/div>/,
  `<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Packages</h1>
          <p className="text-muted-foreground mt-1">
            Create bundled service packages with special pricing.
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingPackage(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>`
);

// We should also replace the top stats box slightly if it is basic.
code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-4 gap-4">[\s\S]*?<\/div>\s*<\/div>/,
  `
  <div className="grid gap-4 md:grid-cols-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{(packages || []).length}</div>
        <p className="text-xs text-muted-foreground mt-1">Available to purchase</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Bundles</CardTitle>
        <Package className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        <p className="text-xs text-muted-foreground mt-1">Currently listed</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
        <Users className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalSold}</div>
        <p className="text-xs text-muted-foreground mt-1">Package redemptions</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Package Revenue</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
        <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
      </CardContent>
    </Card>
  </div>
  `
);

fs.writeFileSync(p, code);
