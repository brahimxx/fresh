"use client";

import { useState, useEffect } from "react";
import { DollarSign, Clock, Calendar, Check, AlertCircle, Plus, X, Sparkles, TrendingUp, Edit2, Trash2, Save } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  useStaffWages, 
  useUpdateStaffWages, 
  useStaffTimesheets, 
  useApproveTimesheet, 
  useCreateTimesheet,
  useEditTimesheet,
  useDeleteTimesheet,
  useAutoFillTimesheets
} from "@/hooks/use-staff";
import { useAuth } from "@/providers/auth-provider";
import { useSalon } from "@/providers/salon-provider";
import { formatCurrency } from "@/lib/format";

export function StaffWagesTab({ staffId }) {
  const { data: wageData, isLoading: wagesLoading } = useStaffWages(staffId);
  const { data: timesheetData, isLoading: timesheetsLoading } = useStaffTimesheets(staffId);
  const updateWages = useUpdateStaffWages();
  const approveTimesheet = useApproveTimesheet();
  const createTimesheet = useCreateTimesheet();
  const editTimesheet = useEditTimesheet();
  const deleteTimesheet = useDeleteTimesheet();
  const autoFillTimesheets = useAutoFillTimesheets();
  const { user } = useAuth();
  const { staffRole, salon } = useSalon();

  const [formData, setFormData] = useState({
    wageType: "hourly",
    hourlyRate: "0",
    salaryAmount: "0",
    salaryPeriod: "monthly",
    overtimeThresholdHours: "40.0",
    overtimeMultiplier: "1.5",
    notes: "",
  });

  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [timesheetForm, setTimesheetForm] = useState({
    clockIn: "",
    clockOut: "",
    breakDuration: "0",
    notes: "",
  });

  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [autoFillForm, setAutoFillForm] = useState({
    startDate: "",
    endDate: "",
    defaultBreakMinutes: "0",
  });

  const [editingTimesheetId, setEditingTimesheetId] = useState(null);
  const [editForm, setEditForm] = useState({
    clockIn: "",
    clockOut: "",
    breakDuration: "0",
    notes: "",
  });

  const canEdit = staffRole === 'owner' || (user && user.role === 'admin');

  useEffect(() => {
    if (wageData && wageData.settings) {
      const active = wageData.settings;
      setFormData({
        wageType: active.wageType || "hourly",
        hourlyRate: active.hourlyRate?.toString() || "0",
        salaryAmount: active.salaryAmount?.toString() || "0",
        salaryPeriod: active.salaryPeriod || "monthly",
        overtimeThresholdHours: active.overtimeThresholdHours?.toString() || "40.0",
        overtimeMultiplier: active.overtimeMultiplier?.toString() || "1.5",
        notes: active.notes || "",
      });
    }
  }, [wageData]);

  const handleWageChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWageTypeSelect = (type) => {
    if (!canEdit) return;
    setFormData((prev) => ({ ...prev, wageType: type }));
  };

  const handleSaveWages = () => {
    updateWages.mutate({
      staffId,
      data: {
        wageType: formData.wageType,
        hourlyRate: formData.hourlyRate,
        salaryAmount: formData.salaryAmount,
        salaryPeriod: formData.salaryPeriod,
        overtimeThresholdHours: formData.overtimeThresholdHours,
        overtimeMultiplier: formData.overtimeMultiplier,
        notes: formData.notes,
      },
    });
  };

  const handleTimesheetChange = (e) => {
    const { name, value } = e.target;
    setTimesheetForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoFillChange = (e) => {
    const { name, value } = e.target;
    setAutoFillForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoFillSubmit = (e) => {
    e.preventDefault();
    autoFillTimesheets.mutate({
      staffId,
      data: {
        startDate: autoFillForm.startDate,
        endDate: autoFillForm.endDate,
        defaultBreakMinutes: autoFillForm.defaultBreakMinutes,
      }
    }, {
      onSuccess: () => {
        setIsAutoFillOpen(false);
        // Reset form to empty to let placeholders show or manager can re-use
      }
    });
  };

  const handleApproveHours = (timesheetId) => {
    approveTimesheet.mutate({
      staffId,
      timesheetId,
    });
  };

  const handleAddManualTimesheet = (e) => {
    e.preventDefault();
    createTimesheet.mutate({
      staffId,
      data: {
        clockIn: timesheetForm.clockIn,
        clockOut: timesheetForm.clockOut,
        breakDuration: timesheetForm.breakDuration,
        notes: timesheetForm.notes,
      },
    }, {
      onSuccess: () => {
        setIsAddManualOpen(false);
        setTimesheetForm({
          clockIn: "",
          clockOut: "",
          breakDuration: "0",
          notes: "",
        });
      }
    });
  };

  const handleEditClick = (ts) => {
    setEditingTimesheetId(ts.id);
    
    // Convert UTC format to local datetime-local format if present
    const formatForInput = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      // Adjust to local timezone for datetime-local input
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    setEditForm({
      clockIn: formatForInput(ts.clockIn),
      clockOut: formatForInput(ts.clockOut),
      breakDuration: ts.breakDuration?.toString() || "0",
      notes: ts.notes || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingTimesheetId(null);
  };

  const handleSaveEdit = (tsId) => {
    editTimesheet.mutate({
      staffId,
      data: {
        timesheetId: tsId,
        clockIn: editForm.clockIn,
        clockOut: editForm.clockOut,
        breakDuration: editForm.breakDuration,
        notes: editForm.notes,
      }
    }, {
      onSuccess: () => {
        setEditingTimesheetId(null);
      }
    });
  };

  const handleDeleteTimesheet = (tsId) => {
    if (confirm("Are you sure you want to delete this timesheet entry?")) {
      deleteTimesheet.mutate({ staffId, timesheetId: tsId });
    }
  };

  if (wagesLoading || timesheetsLoading) {
    return (
      <Card className="border border-muted/50 shadow-sm">
        <CardHeader>
          <CardTitle>Wage & Timesheet Setup</CardTitle>
          <CardDescription>Retrieving compensation structures and logs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground py-6">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p>Loading wages configurations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDateTime = (dtStr) => {
    if (!dtStr) return "-";
    const d = new Date(dtStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* CARD 1: Compensation Configuration */}
      <Card className="border border-muted/50 shadow-sm overflow-hidden hover:border-muted-foreground/10 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/30 via-transparent to-transparent border-b border-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Wage Information</CardTitle>
              <CardDescription>Configure payment tiers and basic wage contract setups</CardDescription>
            </div>
            <Sparkles className="h-5 w-5 text-primary/80 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!canEdit && (
            <div className="mb-6 flex items-center space-x-2 text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>Only the salon owner can modify wage and payment tiers.</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Custom 3-Button Segmented Selector for Wage Type */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Wage Type</Label>
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-1.5 rounded-xl border border-muted/40 max-w-xl">
                {["hourly", "salary", "commission_only"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleWageTypeSelect(type)}
                    disabled={!canEdit || updateWages.isPending}
                    className={[
                      "py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 uppercase tracking-wider",
                      formData.wageType === type
                        ? "bg-background text-primary shadow-sm border border-muted/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    ].join(" ")}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs based on selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
              {formData.wageType === "hourly" && (
                <>
                  <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                    <Label htmlFor="hourlyRate" className="font-semibold text-sm">Hourly Rate ({salon?.currency || 'USD'})</Label>
                    <div className="relative mt-1">
                      <Input
                        id="hourlyRate"
                        name="hourlyRate"
                        type="number"
                        min="0"
                        value={formData.hourlyRate}
                        onChange={handleWageChange}
                        disabled={!canEdit || updateWages.isPending}
                        className="pl-8 pr-4 focus-visible:ring-primary/40 font-medium"
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
                        <span className="text-sm font-semibold">{salon?.currency === 'EUR' ? '€' : salon?.currency === 'GBP' ? '£' : '$'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Standard pay per logged hour in timesheets</p>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                    <Label htmlFor="overtimeThresholdHours" className="font-semibold text-sm">Overtime Threshold (Hours/Pay Run)</Label>
                    <Input
                      id="overtimeThresholdHours"
                      name="overtimeThresholdHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.overtimeThresholdHours}
                      onChange={handleWageChange}
                      disabled={!canEdit || updateWages.isPending}
                      className="mt-1 focus-visible:ring-primary/40 font-medium"
                    />
                    <p className="text-xs text-muted-foreground">After these hours, multiplier applies.</p>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                    <Label htmlFor="overtimeMultiplier" className="font-semibold text-sm">Overtime Multiplier (e.g. 1.5x)</Label>
                    <Input
                      id="overtimeMultiplier"
                      name="overtimeMultiplier"
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.overtimeMultiplier}
                      onChange={handleWageChange}
                      disabled={!canEdit || updateWages.isPending}
                      className="mt-1 focus-visible:ring-primary/40 font-medium"
                    />
                  </div>
                </>
              )}

              {formData.wageType === "salary" && (
                <>
                  <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                    <Label htmlFor="salaryAmount" className="font-semibold text-sm">Salary Amount ({salon?.currency || 'USD'})</Label>
                    <div className="relative mt-1">
                      <Input
                        id="salaryAmount"
                        name="salaryAmount"
                        type="number"
                        min="0"
                        value={formData.salaryAmount}
                        onChange={handleWageChange}
                        disabled={!canEdit || updateWages.isPending}
                        className="pl-8 pr-4 focus-visible:ring-primary/40 font-medium"
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
                        <span className="text-sm font-semibold">{salon?.currency === 'EUR' ? '€' : salon?.currency === 'GBP' ? '£' : '$'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                    <Label htmlFor="salaryPeriod" className="font-semibold text-sm">Salary Period</Label>
                    <select
                      id="salaryPeriod"
                      name="salaryPeriod"
                      value={formData.salaryPeriod}
                      onChange={handleWageChange}
                      disabled={!canEdit || updateWages.isPending}
                      className="w-full mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </>
              )}

              {formData.wageType === "commission_only" && (
                <div className="col-span-1 md:col-span-2 p-5 border rounded-xl bg-primary/[0.01] border-primary/20">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Commission Only Structure</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        This employee receives no basic base rate or fixed wage. Compensation is entirely derived from booking percentages set in the **Commissions** tab.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2 max-w-xl">
              <Label htmlFor="notes" className="font-semibold text-sm">Contract/Payment Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="E.g. Full-time stylist contract, reviewed annually..."
                value={formData.notes}
                onChange={handleWageChange}
                disabled={!canEdit || updateWages.isPending}
                className="mt-1 focus-visible:ring-primary/40 text-sm"
              />
            </div>

            {/* Save bar */}
            {canEdit && (
              <div className="flex justify-end pt-4 border-t max-w-xl">
                <Button 
                  onClick={handleSaveWages} 
                  disabled={updateWages.isPending}
                  className="font-semibold"
                >
                  {updateWages.isPending ? "Saving Wages..." : "Save Wage Settings"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Timesheet History & manual entries */}
      <Card className="border border-muted/50 shadow-sm overflow-hidden hover:border-muted-foreground/10 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/20 via-transparent to-transparent border-b border-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary/80" />
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Timesheet Log History</CardTitle>
                <CardDescription>Clock records, break logs, and Net calculated payroll hours</CardDescription>
              </div>
            </div>
            {canEdit && (
              <div className="flex space-x-2">
                <Button
                  variant={isAutoFillOpen ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => setIsAutoFillOpen(!isAutoFillOpen)}
                  className="font-semibold text-xs h-8 flex items-center space-x-1.5 border-primary/20 hover:bg-primary/5 hover:text-primary"
                >
                  {isAutoFillOpen ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span>Cancel Auto-Fill</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Auto-Fill from Roster</span>
                    </>
                  )}
                </Button>
                <Button
                  variant={isAddManualOpen ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => setIsAddManualOpen(!isAddManualOpen)}
                  className="font-semibold text-xs h-8 flex items-center space-x-1.5"
                >
                  {isAddManualOpen ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Log Manually</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Collapse Auto-Fill form */}
          {isAutoFillOpen && (
            <div className="p-6 bg-primary/5 border-b border-primary/10 transition-all duration-200">
              <form onSubmit={handleAutoFillSubmit} className="space-y-4 max-w-xl">
                <div className="flex items-center space-x-2 mb-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <h4 className="text-sm font-bold">Auto-Generate Timesheets from Schedule</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a date range. This will instantly create &quot;Approved&quot; timesheets for every day the staff member is scheduled to work according to their roster, skipping dates that already have timesheets.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1">
                    <Label htmlFor="startDate" className="text-xs font-semibold">Start Date</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                      value={autoFillForm.startDate}
                      onChange={handleAutoFillChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endDate" className="text-xs font-semibold">End Date</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      required
                      value={autoFillForm.endDate}
                      onChange={handleAutoFillChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="defaultBreakMinutes" className="text-xs font-semibold">Default Daily Break (Minutes)</Label>
                    <Input
                      id="defaultBreakMinutes"
                      name="defaultBreakMinutes"
                      type="number"
                      min="0"
                      required
                      value={autoFillForm.defaultBreakMinutes}
                      onChange={handleAutoFillChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">This will be subtracted from the total shift duration to calculate net paid hours.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={autoFillTimesheets.isPending}
                    size="sm"
                    className="font-semibold text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {autoFillTimesheets.isPending ? "Generating..." : "Generate Timesheets"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Collapse manual add form */}
          {isAddManualOpen && (
            <div className="p-6 bg-muted/10 border-b border-muted/20 transition-all duration-200">
              <form onSubmit={handleAddManualTimesheet} className="space-y-4 max-w-xl">
                <h4 className="text-sm font-bold text-foreground">Log Hours Manually</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="clockIn" className="text-xs font-semibold">Clock In Datetime</Label>
                    <Input
                      id="clockIn"
                      name="clockIn"
                      type="datetime-local"
                      required
                      value={timesheetForm.clockIn}
                      onChange={handleTimesheetChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="clockOut" className="text-xs font-semibold">Clock Out Datetime</Label>
                    <Input
                      id="clockOut"
                      name="clockOut"
                      type="datetime-local"
                      required
                      value={timesheetForm.clockOut}
                      onChange={handleTimesheetChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="breakDuration" className="text-xs font-semibold">Break Minutes</Label>
                    <Input
                      id="breakDuration"
                      name="breakDuration"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={timesheetForm.breakDuration}
                      onChange={handleTimesheetChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="timesheetNotes" className="text-xs font-semibold">Notes</Label>
                    <Input
                      id="timesheetNotes"
                      name="notes"
                      placeholder="Manual entry note..."
                      value={timesheetForm.notes}
                      onChange={handleTimesheetChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={createTimesheet.isPending}
                    size="sm"
                    className="font-semibold text-xs h-8"
                  >
                    {createTimesheet.isPending ? "Logging..." : "Submit Log Entry"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Timesheets List */}
          <div className="p-6">
            {timesheetData && timesheetData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/5">
                      <th className="py-3 px-4">Period / Time Slot</th>
                      <th className="py-3 px-4">Break Time</th>
                      <th className="py-3 px-4">Net Hours Worked</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {timesheetData.map((ts) => {
                      const isApproved = ts.status === "approved";
                      const isClockedIn = ts.status === "clocked_in";
                      
                      if (editingTimesheetId === ts.id) {
                        return (
                          <tr key={ts.id} className="border-b border-muted/20 bg-muted/5 text-sm">
                            <td className="py-4 px-4 font-medium" colSpan={canEdit ? 5 : 4}>
                              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                                <div className="space-y-1 sm:col-span-1">
                                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Clock In</Label>
                                  <Input type="datetime-local" value={editForm.clockIn} onChange={(e) => setEditForm(prev => ({...prev, clockIn: e.target.value}))} className="text-xs h-8" />
                                </div>
                                <div className="space-y-1 sm:col-span-1">
                                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Clock Out</Label>
                                  <Input type="datetime-local" value={editForm.clockOut} onChange={(e) => setEditForm(prev => ({...prev, clockOut: e.target.value}))} className="text-xs h-8" />
                                </div>
                                <div className="space-y-1 sm:col-span-1">
                                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Break (m)</Label>
                                  <Input type="number" min="0" value={editForm.breakDuration} onChange={(e) => setEditForm(prev => ({...prev, breakDuration: e.target.value}))} className="text-xs h-8" />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Notes</Label>
                                  <Input value={editForm.notes} onChange={(e) => setEditForm(prev => ({...prev, notes: e.target.value}))} placeholder="Notes..." className="text-xs h-8" />
                                </div>
                                <div className="flex space-x-2 pt-2 sm:col-span-5 justify-end">
                                  <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 text-xs">Cancel</Button>
                                  <Button size="sm" onClick={() => handleSaveEdit(ts.id)} disabled={editTimesheet.isPending} className="h-7 text-xs flex items-center space-x-1">
                                    <Save className="h-3 w-3" />
                                    <span>Save</span>
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={ts.id} className="border-b border-muted/10 hover:bg-accent/5 transition-colors text-sm">
                          <td className="py-4 px-4 font-medium">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="space-y-0.5">
                                <p className="font-semibold text-xs sm:text-sm text-foreground">
                                  {formatDateTime(ts.clockIn)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  to {ts.clockOut ? formatDateTime(ts.clockOut) : "Ongoing..."}
                                </p>
                                {ts.notes && (
                                  <p className="text-[11px] text-muted-foreground italic bg-muted/40 px-2 py-0.5 rounded border border-muted/10 inline-block mt-1">
                                    &quot;{ts.notes}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-semibold text-muted-foreground text-xs sm:text-sm">
                            {ts.breakDuration || 0}m
                          </td>

                          <td className="py-4 px-4 font-bold text-foreground text-xs sm:text-sm">
                            {ts.totalHours ? `${ts.totalHours.toFixed(2)} hrs` : "-"}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {isApproved ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                                  Approved
                                </span>
                                {ts.approvedByName && (
                                  <span className="text-[9px] text-muted-foreground mt-0.5">
                                    by {ts.approvedByName}
                                  </span>
                                )}
                              </div>
                            ) : isClockedIn ? (
                              <span className="relative flex h-5 w-20 items-center justify-center text-[10px] font-bold bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded border border-sky-500/20 uppercase tracking-wider animate-pulse">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                                Pending Approval
                              </span>
                            )}
                          </td>

                          {canEdit && (
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {!isApproved && !isClockedIn && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveHours(ts.id)}
                                    disabled={approveTimesheet.isPending}
                                    className="h-8 px-2 text-xs font-semibold hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors flex items-center space-x-1.5"
                                  >
                                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                    <span className="hidden sm:inline">Approve</span>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(ts)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors shrink-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTimesheet(ts.id)}
                                  disabled={deleteTimesheet.isPending}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-xl border-muted/50 my-6 mx-6">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm font-medium">No clock entries logged</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Clock records will be populated when staff check in/out.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
