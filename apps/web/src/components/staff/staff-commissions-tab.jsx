"use client";

import { useState, useEffect } from "react";
import { Percent, AlertCircle, Sparkles, Sliders, Check, HelpCircle, ShoppingBag, Scissors, TrendingUp, Receipt } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useStaffCommissions, useUpdateStaffCommissions, useStaffMember } from "@/hooks/use-staff";
import { useAuth } from "@/providers/auth-provider";
import { useSalon } from "@/providers/salon-provider";
import { formatCurrency } from "@/lib/format";

export function StaffCommissionsTab({ staffId }) {
  const { data, isLoading } = useStaffCommissions(staffId);
  const updateCommissions = useUpdateStaffCommissions();
  const { data: staff } = useStaffMember(staffId);
  const { user } = useAuth();
  const { staffRole, salon } = useSalon();

  const [formData, setFormData] = useState({
    serviceCommission: "0",
    productCommission: "0",
    tipCommission: "100",
  });

  // Overrides state: { [id]: { isOverridden: boolean, rate: string } }
  const [serviceOverrides, setServiceOverrides] = useState({});
  const [productOverrides, setProductOverrides] = useState({});
  const [activeTab, setActiveTab] = useState("services"); // "services" | "products"

  const canEdit = staffRole === 'owner' || (user && user.role === 'admin');

  useEffect(() => {
    if (data) {
      const active = data.settings;
      setFormData({
        serviceCommission: active?.serviceCommission?.toString() || "0",
        productCommission: active?.productCommission?.toString() || "0",
        tipCommission: active?.tipCommission?.toString() || "100",
      });

      // Initialize service overrides
      const sOverrides = {};
      if (data.services) {
        data.services.forEach((s) => {
          sOverrides[s.id] = {
            isOverridden: s.isOverridden,
            rate: s.overrideRate !== null ? s.overrideRate.toString() : "",
          };
        });
      }
      setServiceOverrides(sOverrides);

      // Initialize product overrides
      const pOverrides = {};
      if (data.products) {
        data.products.forEach((p) => {
          pOverrides[p.id] = {
            isOverridden: p.isOverridden,
            rate: p.overrideRate !== null ? p.overrideRate.toString() : "",
          };
        });
      }
      setProductOverrides(pOverrides);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleServiceOverride = (id) => {
    if (!canEdit) return;
    setServiceOverrides((prev) => {
      const current = prev[id] || { isOverridden: false, rate: "" };
      return {
        ...prev,
        [id]: {
          ...current,
          isOverridden: !current.isOverridden,
          rate: !current.isOverridden ? (formData.serviceCommission || "0") : "",
        },
      };
    });
  };

  const handleServiceOverrideRateChange = (id, val) => {
    setServiceOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        rate: val,
      },
    }));
  };

  const handleToggleProductOverride = (id) => {
    if (!canEdit) return;
    setProductOverrides((prev) => {
      const current = prev[id] || { isOverridden: false, rate: "" };
      return {
        ...prev,
        [id]: {
          ...current,
          isOverridden: !current.isOverridden,
          rate: !current.isOverridden ? (formData.productCommission || "0") : "",
        },
      };
    });
  };

  const handleProductOverrideRateChange = (id, val) => {
    setProductOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        rate: val,
      },
    }));
  };

  const handleSave = () => {
    const overridesPayload = [];

    // Gather service overrides
    Object.entries(serviceOverrides).forEach(([id, config]) => {
      if (config.isOverridden) {
        const rate = parseFloat(config.rate);
        overridesPayload.push({
          itemType: "service",
          itemId: parseInt(id),
          commissionRate: isNaN(rate) ? 0 : rate,
        });
      }
    });

    // Gather product overrides
    Object.entries(productOverrides).forEach(([id, config]) => {
      if (config.isOverridden) {
        const rate = parseFloat(config.rate);
        overridesPayload.push({
          itemType: "product",
          itemId: parseInt(id),
          commissionRate: isNaN(rate) ? 0 : rate,
        });
      }
    });

    updateCommissions.mutate({
      staffId,
      data: {
        serviceCommission: formData.serviceCommission,
        productCommission: formData.productCommission,
        tipCommission: formData.tipCommission,
        overrides: overridesPayload,
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="border border-muted/50 shadow-sm">
        <CardHeader>
          <CardTitle>Commission Structure</CardTitle>
          <CardDescription>Service and product commission rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground py-6">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p>Loading commissions configurations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group services by category
  const servicesByCategory = (data?.services || []).reduce((acc, s) => {
    const category = s.categoryName || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(s);
    return acc;
  }, {});

  // Group products by category
  const productsByCategory = (data?.products || []).reduce((acc, p) => {
    const category = p.categoryName || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* 1. General Commission Rate Configuration Card */}
      <Card className="border border-muted/50 shadow-sm overflow-hidden hover:border-muted-foreground/20 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/30 via-transparent to-transparent border-b border-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Commission Structure</CardTitle>
              <CardDescription>Set the default commission rates for services, products, and tips</CardDescription>
            </div>
            <Sparkles className="h-5 w-5 text-primary/80 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!canEdit && (
            <div className="mb-6 flex items-center space-x-2 text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>Only the salon owner can modify commission structures.</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                <Label htmlFor="serviceCommission" className="font-semibold text-sm">Default Service Commission (%)</Label>
                <div className="relative mt-1">
                  <Input
                    id="serviceCommission"
                    name="serviceCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.serviceCommission}
                    onChange={handleChange}
                    disabled={!canEdit || updateCommissions.isPending}
                    className="pr-8 focus-visible:ring-primary/40 font-medium"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground/60">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Applies to all services unless overridden below</p>
              </div>
              
              <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                <Label htmlFor="productCommission" className="font-semibold text-sm">Default Product Commission (%)</Label>
                <div className="relative mt-1">
                  <Input
                    id="productCommission"
                    name="productCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.productCommission}
                    onChange={handleChange}
                    disabled={!canEdit || updateCommissions.isPending}
                    className="pr-8 focus-visible:ring-primary/40 font-medium"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground/60">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Applies to all product sales unless overridden below</p>
              </div>
              
              <div className="space-y-2 p-4 rounded-xl border border-muted/40 hover:bg-accent/10 transition-colors">
                <Label htmlFor="tipCommission" className="font-semibold text-sm">Default Tip Commission (%)</Label>
                <div className="relative mt-1">
                  <Input
                    id="tipCommission"
                    name="tipCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tipCommission}
                    onChange={handleChange}
                    disabled={!canEdit || updateCommissions.isPending}
                    className="pr-8 focus-visible:ring-primary/40 font-medium"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground/60">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Usually 100% (tips go directly to the staff member)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Granular Overrides Section */}
      <Card className="border border-muted/50 shadow-sm overflow-hidden hover:border-muted-foreground/10 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/20 via-transparent to-transparent border-b border-muted/20">
          <div className="flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-primary/80" />
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Item-Level Custom Overrides</CardTitle>
              <CardDescription>Specify custom percentages for individual services and products</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Custom Sub-Tabs Navigation */}
          <div className="flex border-b border-muted/20 bg-muted/10">
            <button
              onClick={() => setActiveTab("services")}
              className={[
                "flex-1 py-3.5 px-4 font-semibold text-sm flex items-center justify-center space-x-2 border-b-2 transition-all duration-200",
                activeTab === "services"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
              ].join(" ")}
            >
              <Scissors className="h-4 w-4" />
              <span>Services Overrides ({data?.services?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={[
                "flex-1 py-3.5 px-4 font-semibold text-sm flex items-center justify-center space-x-2 border-b-2 transition-all duration-200",
                activeTab === "products"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
              ].join(" ")}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Products Overrides ({data?.products?.length || 0})</span>
            </button>
          </div>

          <div className="p-6">
            {/* SERVICES TAB */}
            {activeTab === "services" && (
              <div className="space-y-6">
                {Object.keys(servicesByCategory).length > 0 ? (
                  Object.entries(servicesByCategory).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const config = serviceOverrides[item.id] || { isOverridden: false, rate: "" };
                          return (
                            <div
                              key={item.id}
                              className={[
                                "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200",
                                config.isOverridden
                                  ? "border-primary/40 bg-primary/[0.02] shadow-sm"
                                  : "border-muted/30 hover:bg-accent/5 hover:border-muted/60"
                              ].join(" ")}
                            >
                              {/* Left details */}
                              <div className="flex items-start space-x-3 mb-3 sm:mb-0">
                                <div
                                  onClick={() => handleToggleServiceOverride(item.id)}
                                  className={[
                                    "flex items-center justify-center h-5 w-5 rounded border cursor-pointer mt-0.5 transition-all duration-150",
                                    config.isOverridden
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/40 hover:border-primary"
                                  ].join(" ")}
                                >
                                  {config.isOverridden && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </div>
                                <div onClick={() => handleToggleServiceOverride(item.id)} className="cursor-pointer">
                                  <p className="font-semibold text-sm text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price, salon?.currency)}</p>
                                </div>
                              </div>

                              {/* Right inputs */}
                              <div className="flex items-center space-x-3">
                                {/* Badge */}
                                <div className="text-right">
                                  {config.isOverridden ? (
                                    <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                      Custom {config.rate}%
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full border border-muted-foreground/10">
                                      Inheriting {formData.serviceCommission}%
                                    </span>
                                  )}
                                </div>

                                {/* Custom Input */}
                                <div className="relative w-28">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder={formData.serviceCommission}
                                    value={config.rate}
                                    onChange={(e) => handleServiceOverrideRateChange(item.id, e.target.value)}
                                    disabled={!config.isOverridden || !canEdit || updateCommissions.isPending}
                                    className="pr-7 text-sm font-semibold h-9 focus-visible:ring-primary/30"
                                  />
                                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted-foreground/60">
                                    <Percent className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border border-dashed rounded-xl border-muted/50">
                    <Scissors className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No assigned services found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Assign services in the Services tab first.</p>
                  </div>
                )}
              </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === "products" && (
              <div className="space-y-6">
                {Object.keys(productsByCategory).length > 0 ? (
                  Object.entries(productsByCategory).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const config = productOverrides[item.id] || { isOverridden: false, rate: "" };
                          return (
                            <div
                              key={item.id}
                              className={[
                                "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200",
                                config.isOverridden
                                  ? "border-primary/40 bg-primary/[0.02] shadow-sm"
                                  : "border-muted/30 hover:bg-accent/5 hover:border-muted/60"
                              ].join(" ")}
                            >
                              {/* Left details */}
                              <div className="flex items-start space-x-3 mb-3 sm:mb-0">
                                <div
                                  onClick={() => handleToggleProductOverride(item.id)}
                                  className={[
                                    "flex items-center justify-center h-5 w-5 rounded border cursor-pointer mt-0.5 transition-all duration-150",
                                    config.isOverridden
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/40 hover:border-primary"
                                  ].join(" ")}
                                >
                                  {config.isOverridden && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </div>
                                <div onClick={() => handleToggleProductOverride(item.id)} className="cursor-pointer">
                                  <p className="font-semibold text-sm text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price, salon?.currency)}</p>
                                </div>
                              </div>

                              {/* Right inputs */}
                              <div className="flex items-center space-x-3">
                                {/* Badge */}
                                <div className="text-right">
                                  {config.isOverridden ? (
                                    <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                      Custom {config.rate}%
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full border border-muted-foreground/10">
                                      Inheriting {formData.productCommission}%
                                    </span>
                                  )}
                                </div>

                                {/* Custom Input */}
                                <div className="relative w-28">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder={formData.productCommission}
                                    value={config.rate}
                                    onChange={(e) => handleProductOverrideRateChange(item.id, e.target.value)}
                                    disabled={!config.isOverridden || !canEdit || updateCommissions.isPending}
                                    className="pr-7 text-sm font-semibold h-9 focus-visible:ring-primary/30"
                                  />
                                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted-foreground/60">
                                    <Percent className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border border-dashed rounded-xl border-muted/50">
                    <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No salon products found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add retail products to your inventory first.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Earnings History (Read Only) */}
      <Card className="border border-muted/50 shadow-sm overflow-hidden mt-8 hover:border-muted-foreground/10 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/20 via-transparent to-transparent border-b border-muted/20">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-600/80" />
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Earnings History</CardTitle>
              <CardDescription>Live commission calculations based on completed bookings and sales</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.periods && data.periods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-muted/20 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/5">
                    <th className="py-4 px-6">Period</th>
                    <th className="py-4 px-6 text-center">Bookings</th>
                    <th className="py-4 px-6 text-right">Service Comm.</th>
                    <th className="py-4 px-6 text-right">Product Comm.</th>
                    <th className="py-4 px-6 text-right">Tip Comm.</th>
                    <th className="py-4 px-6 text-right text-foreground">Total Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((period, idx) => (
                    <tr key={idx} className="border-b border-muted/10 hover:bg-accent/5 transition-colors text-sm">
                      <td className="py-4 px-6 font-semibold text-foreground">{period.period}</td>
                      <td className="py-4 px-6 text-center text-muted-foreground font-medium">{period.bookings}</td>
                      <td className="py-4 px-6 text-right text-muted-foreground">{formatCurrency(period.servicesCommission, salon?.currency)}</td>
                      <td className="py-4 px-6 text-right text-muted-foreground">{formatCurrency(period.productsCommission, salon?.currency)}</td>
                      <td className="py-4 px-6 text-right text-muted-foreground">{formatCurrency(period.tipsCommission, salon?.currency)}</td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(period.commission, salon?.currency)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-muted/10 font-bold text-sm">
                    <td className="py-5 px-6 text-foreground">Overall Totals</td>
                    <td className="py-5 px-6 text-center">{data?.totals?.totalBookings || 0}</td>
                    <td className="py-5 px-6 text-right"></td>
                    <td className="py-5 px-6 text-right"></td>
                    <td className="py-5 px-6 text-right"></td>
                    <td className="py-5 px-6 text-right text-emerald-600 dark:text-emerald-400 text-base">
                      {formatCurrency(data?.totals?.totalCommission || 0, salon?.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border-b border-muted/20">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm font-medium">No earnings data available yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Earnings will appear here once bookings are completed.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Action Bar */}
      {canEdit && (
        <div className="flex justify-end p-4 bg-muted/10 border border-muted/40 rounded-xl mt-6">
          <Button 
            onClick={handleSave} 
            disabled={updateCommissions.isPending}
            className="font-semibold shadow-sm px-6"
          >
            {updateCommissions.isPending ? (
              <span className="flex items-center space-x-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                <span>Saving Structure...</span>
              </span>
            ) : (
              "Save Structure & Overrides"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
