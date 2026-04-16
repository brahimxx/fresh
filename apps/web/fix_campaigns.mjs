import fs from 'fs';

const p = 'src/app/dashboard/salon/[salonId]/marketing/campaigns/page.js';

let code = fs.readFileSync(p, 'utf8');

// Replace top container
code = code.replace(
  '<div className="space-y-6">',
  '<div className="space-y-6 max-w-[1400px] mx-auto">'
);

// Replace default header
code = code.replace(
  /<div className="flex items-center justify-between">[\s\S]*?<Button onClick=\{function\(\) \{ setShowForm\(true\); setEditingCampaign\(null\); \}\}>[\s\S]*?<Plus className="h-4 w-4 mr-2" \/>[\s\S]*?Create Campaign[\s\S]*?<\/Button>[\s\S]*?<\/div>/,
  `<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and send email & SMS marketing campaigns.
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingCampaign(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>`
);

// Replace default stats grid
code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-4 gap-4">[\s\S]*?<\/div>\s*<\/div>/,
  `
  <div className="grid gap-4 md:grid-cols-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
        <Mail className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{(campaigns || []).length}</div>
        <p className="text-xs text-muted-foreground mt-1">Lifetime campaigns</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Broadcasts Sent</CardTitle>
        <Send className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">{totalSent}</div>
        <p className="text-xs text-muted-foreground mt-1">Successfully dispatched</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Reached</CardTitle>
        <Users className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalReached}</div>
        <p className="text-xs text-muted-foreground mt-1">Clients contacted</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
        <BarChart3 className="h-4 w-4 text-purple-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">64%</div>
        <p className="text-xs text-muted-foreground mt-1">Average engagement</p>
      </CardContent>
    </Card>
  </div>
  `
);

fs.writeFileSync(p, code);
