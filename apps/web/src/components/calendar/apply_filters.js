const fs = require('fs');
const file = 'calendar-view.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  'import { useStaff, getStaffColor } from "@/hooks/use-staff";',
  `import { useStaff, getStaffColor } from "@/hooks/use-staff";\nimport { useServices } from "@/hooks/use-services";`
);
content = content.replace(
  'import { Badge } from "@/components/ui/badge";',
  `import { Badge } from "@/components/ui/badge";\nimport { Input } from "@/components/ui/input";`
);
content = content.replace(
  'import { ChevronLeft, ChevronRight, Filter, Settings, CalendarPlus, Clock, CalendarDays } from "lucide-react";',
  `import { ChevronLeft, ChevronRight, Filter, Settings, CalendarPlus, Clock, CalendarDays, SlidersHorizontal, ChevronDown, ChevronUp, Calendar, ClipboardList, Globe, Coins, Tag, Heart } from "lucide-react";`
);
content = content.replace(
  'import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";',
  `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";\nimport { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";`
);

// 2. FilterSection component at the top of file after imports
if (!content.includes('function FilterSection')) {
  const filterSectionCode = `
function FilterSection({ title, icon, options, selected, onChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b py-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-2">
        {options.map(opt => (
          <div key={opt.id} className="flex items-center space-x-2 py-1">
            <Checkbox id={\`\${title}-\${opt.id}\`} checked={selected.includes(opt.id)} onCheckedChange={() => onChange(opt.id)} />
            <Label htmlFor={\`\${title}-\${opt.id}\`} className="flex-1 font-normal cursor-pointer">{opt.label}</Label>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
`;
  content = content.replace('export function CalendarView', filterSectionCode + '\nexport function CalendarView');
  content = content.replace('import { useRef, useState, useCallback, useMemo, useEffect } from "react";', 'import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";');
}

// 3. State
content = content.replace(
  'var [hourHeight, setHourHeight] = useState(80);',
  `var [hourHeight, setHourHeight] = useState(80);
  
  var [filters, setFilters] = useState({
    status: [],
    type: [],
    paymentStatus: [],
    services: [],
    creationDate: { start: "", end: "" },
    staff: []
  });
  var [draftFilters, setDraftFilters] = useState(filters);
  var [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  useEffect(() => {
    if (isFilterDrawerOpen) {
      setDraftFilters(filters);
    }
  }, [isFilterDrawerOpen, filters]);
`
);

// 4. Fetch services
content = content.replace(
  '  var { salonId, salon } = useSalon();',
  `  var { salonId, salon } = useSalon();\n  var { data: salonServicesData } = useServices(salonId);\n  var salonServices = salonServicesData || [];`
);

// 5. filteredBookings
const filteredBookingsCode = `
  var filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];
    return bookings.filter(b => {
      if (filters.staff && filters.staff.length > 0) {
        var hasStaff = b.services?.some(s => filters.staff.includes(s.staffId || b.staffId || b.staff?.id)) || filters.staff.includes(b.staffId || b.staff?.id);
        if (!hasStaff) return false;
      }
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(b.status)) return false;
      }
      if (filters.type && filters.type.length > 0) {
        if (b.type === "time_off") {
          if (!filters.type.includes("time_off")) return false;
        } else {
          var fType = b.fulfillmentType || "physical";
          if (!filters.type.includes(fType)) return false;
        }
      }
      if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        var pStatus = b.paymentStatus || 'pending';
        if (!filters.paymentStatus.includes(pStatus)) return false;
      }
      if (filters.services && filters.services.length > 0) {
        if (!b.services || !b.services.some(s => filters.services.includes(String(s.service_id || s.id)))) return false;
      }
      if (filters.creationDate && filters.creationDate.start && filters.creationDate.end) {
        if (!b.createdAt) return false;
        var created = new Date(b.createdAt);
        var start = new Date(filters.creationDate.start);
        var end = new Date(filters.creationDate.end);
        end.setHours(23, 59, 59, 999);
        if (created < start || created > end) return false;
      }
      return true;
    });
  }, [bookings, filters]);
`;

content = content.replace(
  '  // Convert bookings to FullCalendar events (for Week/Month)',
  filteredBookingsCode + '\n  // Convert bookings to FullCalendar events (for Week/Month)'
);

// Use filteredBookings instead of bookings
content = content.replace(
  '      if (!bookings || !Array.isArray(bookings)) return [];\n      return bookings\n        .filter(function (booking) {\n          if (!selectedStaff || selectedStaff.length === 0) return true;\n          return booking.services?.some(s => selectedStaff.includes(s.staffId || booking.staffId || booking.staff?.id)) || selectedStaff.includes(booking.staffId || booking.staff?.id);\n        })',
  `      if (!filteredBookings || !Array.isArray(filteredBookings)) return [];\n      return filteredBookings`
);
content = content.replace('[bookings, selectedStaff, staffColorMap]', '[filteredBookings, staffColorMap]');

content = content.replace(
  '    if (bookings && Array.isArray(bookings)) {\n      bookings.forEach(function (booking) {',
  `    if (filteredBookings && Array.isArray(filteredBookings)) {\n      filteredBookings.forEach(function (booking) {`
);
content = content.replace('[bookings, staff]', '[filteredBookings, staff]');

// activeStaff logic
content = content.replace(
  'var activeStaff = staff && Array.isArray(staff) ? staff : [];',
  `var activeStaff = staff && Array.isArray(staff) ? staff : [];
  if (filters.staff && filters.staff.length > 0) {
     activeStaff = activeStaff.filter(s => filters.staff.includes(s.id));
  }`
);

// UI Replacement for Staff + Filter Buttons
const oldUI = `          {/* Staff filter (Week/Month only) */}
          {!isDayView && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Staff{" "}
                  {selectedStaff && selectedStaff.length > 0 && "(" + selectedStaff.length + ")"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Filter by Staff</span>
                    {selectedStaff && selectedStaff.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearStaffFilter}>
                        Clear
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {staff && Array.isArray(staff) && staff.map(function (member, index) {
                        var color = member.color || getStaffColor(index).hex;
                        return (
                          <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              id={"staff-" + member.id}
                              checked={selectedStaff && selectedStaff.includes(member.id)}
                              onCheckedChange={function () { toggleStaffFilter(member.id); }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border-2 border-background shadow-sm flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <Label htmlFor={"staff-" + member.id} className="cursor-pointer flex-1 font-medium">
                              {member.firstName} {member.lastName}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          )}`;

const newUI = `          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full h-9 px-4">
                {filters.staff && filters.staff.length > 0 ? filters.staff.length + " selected" : "All team"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filter by Team</span>
                  {filters.staff && filters.staff.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, staff: [] }))}>
                      Clear
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {staff && Array.isArray(staff) && staff.map(function (member, index) {
                      var color = member.color || getStaffColor(index).hex;
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                          <Checkbox
                            id={"staff-" + member.id}
                            checked={filters.staff && filters.staff.includes(member.id)}
                            onCheckedChange={function () { 
                               setFilters(prev => ({
                                  ...prev,
                                  staff: prev.staff.includes(member.id) 
                                    ? prev.staff.filter(id => id !== member.id)
                                    : [...prev.staff, member.id]
                               }));
                            }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border-2 border-background shadow-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <Label htmlFor={"staff-" + member.id} className="cursor-pointer flex-1 font-medium">
                            {member.firstName} {member.lastName}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
               <SheetHeader className="p-6 pb-2">
                 <div className="flex items-center justify-between">
                   <SheetTitle className="text-xl">All filters</SheetTitle>
                 </div>
               </SheetHeader>
               
               <ScrollArea className="flex-1 px-6 py-4">
                 <div className="space-y-4">
                   <FilterSection 
                      title="Appointment status" icon={<CalendarDays className="w-5 h-5" />}
                      options={[{id: 'pending', label: 'Pending'}, {id: 'confirmed', label: 'Confirmed'}, {id: 'completed', label: 'Completed'}, {id: 'cancelled', label: 'Cancelled'}, {id: 'no-show', label: 'No-Show'}]}
                      selected={draftFilters.status}
                      onChange={(id) => setDraftFilters(p => ({...p, status: p.status.includes(id) ? p.status.filter(x => x !== id) : [...p.status, id]}))}
                   />
                   <FilterSection 
                      title="Type" icon={<ClipboardList className="w-5 h-5" />}
                      options={[{id: 'physical', label: 'In-Salon'}, {id: 'mobile', label: 'Mobile'}, {id: 'virtual', label: 'Virtual'}, {id: 'time_off', label: 'Time Off'}]}
                      selected={draftFilters.type}
                      onChange={(id) => setDraftFilters(p => ({...p, type: p.type.includes(id) ? p.type.filter(x => x !== id) : [...p.type, id]}))}
                   />
                   <FilterSection 
                      title="Payment status" icon={<Coins className="w-5 h-5" />}
                      options={[{id: 'pending', label: 'Pending'}, {id: 'partially_paid', label: 'Partially Paid'}, {id: 'paid', label: 'Paid'}]}
                      selected={draftFilters.paymentStatus}
                      onChange={(id) => setDraftFilters(p => ({...p, paymentStatus: p.paymentStatus.includes(id) ? p.paymentStatus.filter(x => x !== id) : [...p.paymentStatus, id]}))}
                   />
                   <FilterSection 
                      title="Services" icon={<Tag className="w-5 h-5" />}
                      options={(salonServices || []).map(s => ({ id: String(s.id), label: s.name }))}
                      selected={draftFilters.services}
                      onChange={(id) => setDraftFilters(p => ({...p, services: p.services.includes(id) ? p.services.filter(x => x !== id) : [...p.services, id]}))}
                   />
                   
                   <Collapsible className="border-b py-3">
                     <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                       <div className="flex items-center gap-3">
                         <Calendar className="w-5 h-5 text-muted-foreground" />
                         <span className="font-medium">Appointment creation date</span>
                       </div>
                       <ChevronDown className="w-4 h-4 text-muted-foreground" />
                     </CollapsibleTrigger>
                     <CollapsibleContent className="pt-4 space-y-3">
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <Label>From</Label>
                           <Input type="date" value={draftFilters.creationDate.start} onChange={e => setDraftFilters(p => ({...p, creationDate: {...p.creationDate, start: e.target.value}}))} />
                         </div>
                         <div className="space-y-1">
                           <Label>To</Label>
                           <Input type="date" value={draftFilters.creationDate.end} onChange={e => setDraftFilters(p => ({...p, creationDate: {...p.creationDate, end: e.target.value}}))} />
                         </div>
                       </div>
                     </CollapsibleContent>
                   </Collapsible>

                   <FilterSection 
                      title="Requested team member" icon={<Heart className="w-5 h-5" />}
                      options={(staff || []).map(s => ({ id: s.id, label: \`\${s.firstName} \${s.lastName}\` }))}
                      selected={draftFilters.staff}
                      onChange={(id) => setDraftFilters(p => ({...p, staff: p.staff.includes(id) ? p.staff.filter(x => x !== id) : [...p.staff, id]}))}
                   />
                 </div>
               </ScrollArea>

               <div className="p-6 border-t bg-background flex items-center gap-4">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setDraftFilters({ status: [], type: [], paymentStatus: [], services: [], creationDate: {start: "", end: ""}, staff: [] })}>
                    Clear filters
                  </Button>
                  <Button className="flex-1 rounded-full" onClick={() => { setFilters(draftFilters); setIsFilterDrawerOpen(false); }}>
                    Apply
                  </Button>
               </div>
            </SheetContent>
          </Sheet>`;

content = content.replace(oldUI, newUI);

fs.writeFileSync(file, content, 'utf8');
console.log('Filters replaced successfully');
