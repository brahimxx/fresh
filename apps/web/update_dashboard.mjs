import fs from 'fs';

const filePath = 'src/app/dashboard/page.js';
let content = fs.readFileSync(filePath, 'utf8');

const newCode = `    if (!salons || salons.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 h-full min-h-[calc(100vh-4rem)]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Fresh!</CardTitle>
              <CardDescription>
                Create your first salon to get started with managing
                appointments, clients, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => router.push("/onboarding")}>
                <Plus className="mr-2 h-4 w-4" />
                Complete Setup
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }`;

// Find the start and end indices
const startIndex = content.indexOf('    if (!salons || salons.length === 0) {');
const endIndex = content.indexOf('    }', startIndex) + 5; 
// Wait, the end of the block is a } but it's nested. The end we want is the } before return <div className="flex...Loader2
const nextReturnIndex = content.indexOf('    return (', startIndex);
const blockEndIndex = content.lastIndexOf('    }', nextReturnIndex) + 5;

content = content.substring(0, startIndex) + newCode + content.substring(blockEndIndex);

fs.writeFileSync(filePath, content);
console.log('Done!');
