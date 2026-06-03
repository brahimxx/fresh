"use client";

import { useState } from "react";
import { Receipt, Plus, FileText, Download, CheckCircle, Trash2, Printer, Undo } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { useSalon } from "@/providers/salon-provider";
import { useAuth } from "@/providers/auth-provider";
import { useStaffPayRuns, useGeneratePayRun, useUpdatePayRunStatus, useDeletePayRun, useStaffMember } from "@/hooks/use-staff";

export function StaffPayRunsTab({ staffId }) {
  const { salon, staffRole } = useSalon();
  const { user } = useAuth();
  const { data: payRuns, isLoading } = useStaffPayRuns(staffId);
  const { data: staffMember } = useStaffMember(staffId);
  const generatePayRun = useGeneratePayRun();
  const updatePayRun = useUpdatePayRunStatus();
  const deletePayRun = useDeletePayRun();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [formData, setFormData] = useState({
    periodStart: "",
    periodEnd: "",
  });
  const [gapWarning, setGapWarning] = useState("");

  const canEdit = staffRole === 'owner' || (user && user.role === 'admin');

  const handleGenerate = (e) => {
    e.preventDefault();
    generatePayRun.mutate({
      staffId,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd,
    }, {
      onSuccess: () => {
        setIsGenerateOpen(false);
        setFormData({ periodStart: "", periodEnd: "" });
      }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'periodStart' && payRuns && payRuns.length > 0) {
      const lastRun = payRuns[0];
      const lastDate = new Date(lastRun.period_end || lastRun.periodEnd);
      lastDate.setDate(lastDate.getDate() + 1);
      const expectedDateStr = lastDate.toISOString().split('T')[0];
      
      if (value && value > expectedDateStr) {
        setGapWarning(`Warning: There is a gap between your last pay run (${format(new Date(lastRun.period_end || lastRun.periodEnd), "MMM d, yyyy")}) and this start date. Unpaid bookings may be orphaned.`);
      } else {
        setGapWarning("");
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-muted/50 shadow-sm">
        <CardHeader>
          <CardTitle>Pay Runs</CardTitle>
          <CardDescription>Loading payroll records...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground py-6">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p>Loading pay runs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-muted/50 shadow-sm overflow-hidden hover:border-muted-foreground/10 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/20 via-transparent to-transparent border-b border-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary/80" />
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Payroll Runs & Payslips</CardTitle>
                <CardDescription>Locked historical payouts and generated payslips</CardDescription>
              </div>
            </div>
            {canEdit && (
              <Button
                variant={isGenerateOpen ? "ghost" : "default"}
                size="sm"
                onClick={() => {
                  if (!isGenerateOpen && payRuns && payRuns.length > 0) {
                    const lastRun = payRuns[0];
                    const lastDate = new Date(lastRun.period_end || lastRun.periodEnd);
                    lastDate.setDate(lastDate.getDate() + 1);
                    const nextStartDate = lastDate.toISOString().split('T')[0];
                    setFormData({ periodStart: nextStartDate, periodEnd: "" });
                    setGapWarning("");
                  } else if (!isGenerateOpen) {
                    setFormData({ periodStart: "", periodEnd: "" });
                    setGapWarning("");
                  }
                  setIsGenerateOpen(!isGenerateOpen);
                }}
                className="font-semibold text-xs h-8 flex items-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isGenerateOpen ? "Cancel" : "Generate Pay Run"}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isGenerateOpen && (
            <div className="p-6 bg-muted/10 border-b border-muted/20 transition-all duration-200">
              <form onSubmit={handleGenerate} className="space-y-4 max-w-xl">
                <h4 className="text-sm font-bold text-foreground">Generate New Pay Run</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Generating a pay run takes a permanent snapshot of all completed bookings, sales, and timesheets within this period. This data is locked and will not change even if bookings are modified later.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="periodStart" className="text-xs font-semibold">Period Start Date</Label>
                    <Input
                      id="periodStart"
                      name="periodStart"
                      type="date"
                      required
                      value={formData.periodStart}
                      onChange={handleChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="periodEnd" className="text-xs font-semibold">Period End Date</Label>
                    <Input
                      id="periodEnd"
                      name="periodEnd"
                      type="date"
                      required
                      value={formData.periodEnd}
                      onChange={handleChange}
                      className="text-xs h-9 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                {gapWarning && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-3 rounded-md text-xs font-medium border border-orange-200/50 flex items-start gap-2">
                    <Undo className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{gapWarning}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={generatePayRun.isPending}
                    size="sm"
                    className="font-semibold text-xs h-8"
                  >
                    {generatePayRun.isPending ? "Generating..." : "Generate & Lock Pay Run"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="p-0">
            {payRuns && payRuns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/5">
                      <th className="py-4 px-6">Pay Period</th>
                      <th className="py-4 px-6 text-right">Revenue Generated</th>
                      <th className="py-4 px-6 text-right">Total Commissions</th>
                      <th className="py-4 px-6 text-right">Base Wages</th>
                      <th className="py-4 px-6 text-right text-foreground">Net Payout</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payRuns.map((run) => (
                      <tr key={run.id} className="border-b border-muted/10 hover:bg-accent/5 transition-colors text-sm">
                        <td className="py-4 px-6 font-medium">
                          <p className="font-bold text-foreground">
                            {format(new Date(run.periodStart), 'MMM d, yyyy')} - {format(new Date(run.periodEnd), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Generated on {format(new Date(run.createdAt), 'MMM d, yyyy')}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right text-muted-foreground font-medium">
                          {formatCurrency(run.totalRevenue, salon?.currency)}
                        </td>
                        <td className="py-4 px-6 text-right text-muted-foreground font-medium">
                          {formatCurrency(run.totalServicesCommission + run.totalProductsCommission + run.totalTipsCommission, salon?.currency)}
                        </td>
                        <td className="py-4 px-6 text-right text-muted-foreground font-medium">
                          {formatCurrency(run.totalWages, salon?.currency)}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base">
                          {formatCurrency(run.totalPayout, salon?.currency)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {run.status === 'paid' ? (
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
                              Paid
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-sky-500/10 text-sky-600 px-2 py-1 rounded border border-sky-500/20 uppercase tracking-wider">
                              Locked
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {canEdit && run.status === 'generated' && (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      disabled={updatePayRun.isPending}
                                      title="Mark as Paid"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Mark Pay Run as Paid?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently mark the payroll period from{" "}
                                        <span className="font-semibold text-foreground">
                                          {format(new Date(run.periodStart), 'MMM d, yyyy')}
                                        </span>{" "}
                                        to{" "}
                                        <span className="font-semibold text-foreground">
                                          {format(new Date(run.periodEnd), 'MMM d, yyyy')}
                                        </span>{" "}
                                        as fully paid. This action locks the run and disables deletion.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => updatePayRun.mutate({ staffId, payRunId: run.id, status: 'paid' })}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                                      >
                                        Mark as Paid
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      disabled={deletePayRun.isPending}
                                      title="Delete Pay Run"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Pay Run Lock?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the pay run lock for{" "}
                                        <span className="font-semibold text-foreground">
                                          {format(new Date(run.periodStart), 'MMM d, yyyy')}
                                        </span>{" "}
                                        to{" "}
                                        <span className="font-semibold text-foreground">
                                          {format(new Date(run.periodEnd), 'MMM d, yyyy')}
                                        </span>
                                        ? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deletePayRun.mutate({ staffId, payRunId: run.id })}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                                      >
                                        Delete Permanently
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            {canEdit && run.status === 'paid' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/10"
                                    disabled={updatePayRun.isPending}
                                    title="Revert to Draft"
                                  >
                                    <Undo className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revert Pay Run to Locked Draft?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will move the pay period from{" "}
                                      <span className="font-semibold text-foreground">
                                        {format(new Date(run.periodStart), 'MMM d, yyyy')}
                                      </span>{" "}
                                      to{" "}
                                      <span className="font-semibold text-foreground">
                                        {format(new Date(run.periodEnd), 'MMM d, yyyy')}
                                      </span>{" "}
                                      back to "Locked" status. You will be able to delete or modify the record again.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => updatePayRun.mutate({ staffId, payRunId: run.id, status: 'generated' })}
                                      className="bg-primary text-primary-foreground font-semibold"
                                    >
                                      Revert Status
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted/10">
                                  <Download className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Payslip</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-background border border-muted/50 shadow-2xl">
                                <style>{`
                                  @media print {
                                    body * {
                                      visibility: hidden !important;
                                    }
                                    #payslip-print-area-${run.id}, #payslip-print-area-${run.id} * {
                                      visibility: visible !important;
                                    }
                                    #payslip-print-area-${run.id} {
                                      position: absolute;
                                      left: 0;
                                      top: 0;
                                      width: 100%;
                                      padding: 40px !important;
                                      background: white !important;
                                      color: black !important;
                                    }
                                    .no-print {
                                      display: none !important;
                                    }
                                  }
                                `}</style>
                                <DialogHeader className="p-6 bg-gradient-to-r from-muted/20 via-transparent to-transparent border-b border-muted/20 flex flex-row items-center justify-between no-print">
                                  <div>
                                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Payslip Statement</DialogTitle>
                                    <DialogDescription className="text-xs">
                                      Detailed pay statement for period ending {format(new Date(run.periodEnd), 'MMM d, yyyy')}
                                    </DialogDescription>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="font-semibold text-xs h-8 gap-1.5 shadow-sm"
                                    onClick={() => window.print()}
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                    <span>Print Statement</span>
                                  </Button>
                                </DialogHeader>
                                
                                <div id={`payslip-print-area-${run.id}`} className="p-8 space-y-6">
                                  {/* Payslip Header */}
                                  <div className="flex justify-between items-start border-b border-muted/30 pb-6">
                                    <div>
                                      <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                                        {salon?.name || "Fresh Platform"}
                                      </h2>
                                      <p className="text-xs text-muted-foreground mt-0.5">Official Earnings & Commission Statement</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border border-muted/55 bg-muted/10 mb-2">
                                        PAYSLIP #PAY-{run.id}
                                      </div>
                                      <p className="text-xs text-muted-foreground">Generated on {format(new Date(run.createdAt), 'MMM d, yyyy')}</p>
                                    </div>
                                  </div>

                                  {/* Party Details Grid */}
                                  <div className="grid grid-cols-2 gap-8 text-sm">
                                    <div className="space-y-1.5">
                                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">EMPLOYER</h4>
                                      <p className="font-bold text-foreground">{salon?.name || "Fresh Salon"}</p>
                                      <p className="text-xs text-muted-foreground">Salon Platform ID: {salon?.id}</p>
                                    </div>
                                    <div className="space-y-1.5 text-right">
                                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">EMPLOYEE</h4>
                                      <p className="font-bold text-foreground">
                                        {staffMember?.firstName || "Team"} {staffMember?.lastName || "Member"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">Role: <span className="capitalize">{staffMember?.role || "Staff"}</span></p>
                                      {staffMember?.email && <p className="text-xs text-muted-foreground">{staffMember?.email}</p>}
                                    </div>
                                  </div>

                                  {/* Period metadata */}
                                  <div className="bg-muted/10 border border-muted/20 rounded-lg px-4 py-3 flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground uppercase tracking-wider">Pay Period Range:</span>
                                    <span className="text-foreground">
                                      {format(new Date(run.periodStart), 'MMMM d, yyyy')} — {format(new Date(run.periodEnd), 'MMMM d, yyyy')}
                                    </span>
                                  </div>

                                  {/* Earnings Section */}
                                  <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-muted/20 pb-1.5">Earnings & Commissions</h3>
                                    <div className="space-y-2.5">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Base Hourly Wages (Approved Hours)</span>
                                        <span className="font-bold text-foreground">{formatCurrency(run.totalWages, salon?.currency)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Service Commission</span>
                                        <span className="font-bold text-foreground">{formatCurrency(run.totalServicesCommission, salon?.currency)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Product Commission</span>
                                        <span className="font-bold text-foreground">{formatCurrency(run.totalProductsCommission, salon?.currency)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Tips Payout (100% Retained)</span>
                                        <span className="font-bold text-foreground">{formatCurrency(run.totalTipsCommission, salon?.currency)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Metrics Summary Section */}
                                  <div className="pt-2 space-y-2 border-t border-muted/10">
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                      <span>Total Service & Product Revenue Generated</span>
                                      <span>{formatCurrency(run.totalRevenue, salon?.currency)}</span>
                                    </div>
                                  </div>

                                  {/* Net Total Block */}
                                  <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between">
                                    <div>
                                      <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">NET PAYOUT</h4>
                                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
                                        {formatCurrency(run.totalPayout, salon?.currency)}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs text-muted-foreground block mb-1.5 font-medium">Payout Status</span>
                                      {run.status === 'paid' ? (
                                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-600 px-3 py-1 rounded border border-emerald-500/30 uppercase tracking-widest">
                                          PAID
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold bg-sky-500/20 text-sky-600 px-3 py-1 rounded border border-sky-500/30 uppercase tracking-widest">
                                          LOCKED
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Footer disclaimer */}
                                  <div className="text-center pt-4 border-t border-muted/20 text-[10px] text-muted-foreground/80 font-medium">
                                    This pay statement constitutes a permanent financial ledger record locked by the Fresh multi-tenant OS.
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-xl border-muted/50 my-6 mx-6">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm font-medium">No pay runs generated yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Generate a pay run to lock in commissions and wages for a period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
