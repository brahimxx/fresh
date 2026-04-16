import fs from 'fs';

let content = fs.readFileSync('src/hooks/use-staff.js', 'utf8');

// Add "requests" to staffKeys
content = content.replace("all: ['staff'],", "all: ['staff'],\n  requests: function(salonId) { return [...staffKeys.all, 'requests', salonId]; },");

// 1. Add hook for useStaffRequests
const staffRequestsHook = `
export function useStaffRequests(salonId, options) {
  var resolvedOptions = options ?? {};
  return useQuery({
    queryKey: staffKeys.requests(salonId),
    queryFn: function() { return api.get('/salons/' + salonId + '/staff-requests'); },
    enabled: !!salonId,
    select: function(response) { return response.data?.requests || []; },
    ...resolvedOptions,
  });
}
`;
content = content.replace("// ============ STAFF MUTATIONS ============", staffRequestsHook + "\n// ============ STAFF MUTATIONS ============");

// 2. Add mutations for accepting and declining
const acceptDeclineHooks = `
export function useAcceptStaffRequest() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(params) { return api.post('/salons/' + params.salonId + '/staff-requests/' + params.requestId + '/accept'); },
    onSuccess: function(response, variables) {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.requests(variables.salonId) });
      toast.success('Join request accepted');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to accept request');
    },
  });
}

export function useDeclineStaffRequest() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(params) { return api.post('/salons/' + params.salonId + '/staff-requests/' + params.requestId + '/decline'); },
    onSuccess: function(response, variables) {
      queryClient.invalidateQueries({ queryKey: staffKeys.requests(variables.salonId) });
      toast.success('Join request declined');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to decline request');
    },
  });
}
`;
content = content.replace("export function useCreateStaff() {", acceptDeclineHooks + "\nexport function useCreateStaff() {");

fs.writeFileSync('src/hooks/use-staff.js', content);
