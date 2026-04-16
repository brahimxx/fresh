import fs from 'fs';

let content = fs.readFileSync('src/app/dashboard/salon/[salonId]/team/page.js', 'utf8');

// 1. Add imports
content = content.replace("useStaff,", "useStaff,\n  useStaffRequests,\n  useAcceptStaffRequest,\n  useDeclineStaffRequest,");
content = content.replace("Check, X,", "Check, X, MessageSquare,"); // Assuming Check and X might not be imported, let's just add icon imports properly
content = content.replace("UserPlus,", "UserPlus,\n  Check,\n  X,\n  MessageSquare,");

// 2. Add Hooks in the component
const hookReplacement = `  const { data: staff, isLoading } = useStaff(salonId);
  const { data: requests, isLoading: requestsLoading } = useStaffRequests(salonId);
  const acceptRequest = useAcceptStaffRequest();
  const declineRequest = useDeclineStaffRequest();`;
content = content.replace("  const { data: staff, isLoading } = useStaff(salonId);", hookReplacement);

// 3. Create the requests block right above active staff grid
const requestsBlock = `
        {/* Pending Requests */}
        {requests && requests.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-primary" />
              Pending Join Requests
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0">{requests.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((request) => (
                <Card key={request.id} className="relative overflow-hidden group border-primary/20 bg-card/50">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                  <CardContent className="p-5 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center space-x-4 mb-4">
                        <Avatar className="h-12 w-12 border border-border shadow-sm">
                          <AvatarImage src={request.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {request.first_name?.[0]}{request.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-[15px] group-hover:text-primary transition-colors flex items-center">
                            {request.first_name} {request.last_name}
                          </div>
                          <div className="flex flex-col text-sm text-muted-foreground mt-0.5">
                              <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1" /> {request.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Display Message */}
                      {request.message && (
                        <div className="mb-4 bg-muted/50 p-3 rounded-lg border border-border/50 text-sm">
                          <p className="flex items-center text-xs font-semibold text-muted-foreground mb-1"><MessageSquare className="w-3.5 h-3.5 mr-1"/> Note to Salon</p>
                          <p className="text-foreground italic">"{request.message}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                      <Button 
                        onClick={() => acceptRequest.mutate({ salonId, requestId: request.id })}
                        disabled={acceptRequest.isPending || declineRequest.isPending}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Accept
                      </Button>
                      <Button 
                        onClick={() => declineRequest.mutate({ salonId, requestId: request.id })}
                        disabled={acceptRequest.isPending || declineRequest.isPending}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
`;

content = content.replace("{/* Active Staff Grid */}", requestsBlock + "\n        {/* Active Staff Grid */}");

fs.writeFileSync('src/app/dashboard/salon/[salonId]/team/page.js', content);
