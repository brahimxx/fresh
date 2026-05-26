"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  Palette, 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Settings2,
  Paintbrush,
  Type,
  LayoutTemplate,
  MonitorSmartphone,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { useSalon } from "@/providers/salon-provider";

import {
  useWidgetSettings,
  useUpdateWidgetSettings,
  generateEmbedCode,
  WIDGET_THEMES,
} from "@/hooks/use-settings";
import { useServices } from "@/hooks/use-services";

export default function WidgetPage() {
  const params = useParams();
  const { toast } = useToast();
  const { salon } = useSalon();
  
  const { data: widgetData, isLoading } = useWidgetSettings(params.salonId);
  const { data: rawServices = [] } = useServices(params.salonId);
  const updateWidget = useUpdateWidgetSettings();
  
  const [settings, setSettings] = useState({
    theme: "default",
    primary_color: "#6366f1",
    text_color: "#1f2937",
    background_color: "#ffffff",
    border_radius: "16",
    show_prices: true,
    show_duration: true,
    show_staff: true,
    button_text: "Book Appointment",
  });
  
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState("appearance");
  
  useEffect(() => {
    if (widgetData?.settings) {
      setSettings((prev) => ({ ...prev, ...widgetData.settings }));
    }
  }, [widgetData]);
  
  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };
  
  const handleThemeChange = (themeValue) => {
    const overrides = { theme: themeValue };
    if (themeValue === 'dark') {
      overrides.background_color = '#09090b';
      overrides.text_color = '#fafafa';
      overrides.primary_color = '#818cf8';
    } else if (themeValue === 'light') {
      overrides.background_color = '#ffffff';
      overrides.text_color = '#09090b';
      overrides.primary_color = '#4f46e5';
    }
    setSettings((prev) => ({ ...prev, ...overrides }));
  };
  
  const handleSave = () => {
    updateWidget.mutate({
      salonId: params.salonId,
      data: settings,
    }, {
      onSuccess: () => {
        toast({ 
          title: "Widget Configured", 
          description: "Your custom integration has been globally updated.",
        });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    });
  };
  
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard" });
  };
  
  const embedCode = generateEmbedCode(params.salonId, settings);
  const widgetUrl = typeof window !== "undefined" 
    ? window.location.origin + "/book/" + params.salonId
    : "/book/" + params.salonId;
  
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-muted rounded-xl" />
        <div className="grid lg:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-7 space-y-6">
             <div className="h-[400px] bg-muted/60 rounded-3xl" />
             <div className="h-[300px] bg-muted/60 rounded-3xl" />
          </div>
          <div className="lg:col-span-5 relative">
             <div className="h-[600px] bg-muted/60 rounded-[3rem]" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 p-6 sm:p-8">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/10 p-8 sm:p-10 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <Code className="w-48 h-48 sm:w-64 sm:h-64 text-indigo-500" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Tools</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Booking Widget</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Design and embed a tailored booking experience seamlessly into your own website or social media.
          </p>
        </div>
      </motion.div>
      
      <div className="grid lg:grid-cols-12 gap-8 relative items-start">
        
        {/* Left Column: Settings Panel */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/50 shadow-lg bg-background/60 backdrop-blur-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row border-b border-border/50 bg-muted/20">
              <button 
                onClick={() => setActiveTab("appearance")}
                className={`flex-1 py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'appearance' ? 'border-primary text-primary bg-background/50' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <Paintbrush className="w-4 h-4" /> Aesthetics
              </button>
              <button 
                onClick={() => setActiveTab("content")}
                className={`flex-1 py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'content' ? 'border-primary text-primary bg-background/50' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <LayoutTemplate className="w-4 h-4" /> Layout Features
              </button>
              <button 
                onClick={() => setActiveTab("embed")}
                className={`flex-1 py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'embed' ? 'border-primary text-primary bg-background/50' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <Code className="w-4 h-4" /> Integration
              </button>
            </div>

            <CardContent className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {activeTab === "appearance" && (
                  <motion.div
                    key="appearance"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Design System</Label>
                      <Select
                        value={settings.theme}
                        onValueChange={handleThemeChange}
                      >
                        <SelectTrigger className="w-full h-12 text-base rounded-xl bg-background border-border/50 hover:border-primary/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WIDGET_THEMES.map((theme) => (
                            <SelectItem key={theme.value} value={theme.value} className="py-2.5 cursor-pointer">
                              {theme.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-6 pt-2">
                       <div className="space-y-3 p-4 rounded-2xl border border-border/50 bg-muted/10">
                        <Label className="text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-primary"/> Primary Accent</Label>
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-border shadow-sm ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                            <Input
                              type="color"
                              value={settings.primary_color}
                              onChange={(e) => updateSetting("primary_color", e.target.value)}
                              className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer p-0 border-0"
                            />
                          </div>
                          <Input
                            value={settings.primary_color}
                            onChange={(e) => updateSetting("primary_color", e.target.value)}
                            className="font-mono text-sm h-10 border-border/50 uppercase"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 p-4 rounded-2xl border border-border/50 bg-muted/10">
                        <Label className="text-sm font-semibold flex items-center gap-2"><Type className="w-4 h-4 text-foreground"/> Text Color</Label>
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-border shadow-sm ring-2 ring-foreground/10 ring-offset-2 ring-offset-background">
                            <Input
                              type="color"
                              value={settings.text_color}
                              onChange={(e) => updateSetting("text_color", e.target.value)}
                              className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer p-0 border-0"
                            />
                          </div>
                          <Input
                            value={settings.text_color}
                            onChange={(e) => updateSetting("text_color", e.target.value)}
                            className="font-mono text-sm h-10 border-border/50 uppercase"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 p-4 rounded-2xl border border-border/50 bg-muted/10">
                        <Label className="text-sm font-semibold flex items-center gap-2"><MonitorSmartphone className="w-4 h-4 text-muted-foreground"/> App Background</Label>
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-border shadow-sm">
                            <Input
                              type="color"
                              value={settings.background_color}
                              onChange={(e) => updateSetting("background_color", e.target.value)}
                              className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer p-0 border-0"
                            />
                          </div>
                          <Input
                            value={settings.background_color}
                            onChange={(e) => updateSetting("background_color", e.target.value)}
                            className="font-mono text-sm h-10 border-border/50 uppercase"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 p-4 rounded-2xl border border-border/50 bg-muted/10">
                        <Label className="text-sm font-semibold">Border Radius Curve</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="range"
                            min="0"
                            max="32"
                            value={settings.border_radius}
                            onChange={(e) => updateSetting("border_radius", e.target.value)}
                            className="w-full accent-primary cursor-pointer"
                          />
                          <span className="text-sm font-mono font-medium min-w-[3ch] bg-muted px-2 py-1 rounded-md text-center">
                            {settings.border_radius}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "content" && (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                     <div className="space-y-3 pb-6 border-b border-border/50">
                        <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Primary Call To Action</Label>
                        <Input
                          value={settings.button_text}
                          onChange={(e) => updateSetting("button_text", e.target.value)}
                          placeholder="E.g., Book Appointment"
                          className="h-12 text-base font-medium rounded-xl"
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Display Toggles</Label>
                        
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <h4 className="font-medium">Show Service Prices</h4>
                            <p className="text-sm text-muted-foreground">Display the explicit cost next to each service listing.</p>
                          </div>
                          <Switch 
                            checked={settings.show_prices}
                            onCheckedChange={(v) => updateSetting("show_prices", v)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <h4 className="font-medium">Show Service Duration</h4>
                            <p className="text-sm text-muted-foreground">Exhibit the estimated time block each service requires.</p>
                          </div>
                          <Switch 
                            checked={settings.show_duration}
                            onCheckedChange={(v) => updateSetting("show_duration", v)}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <h4 className="font-medium">Staff Picker Requirement</h4>
                            <p className="text-sm text-muted-foreground">Allow clients to filter availability by specific team members.</p>
                          </div>
                          <Switch 
                            checked={settings.show_staff}
                            onCheckedChange={(v) => updateSetting("show_staff", v)}
                          />
                        </div>
                      </div>
                  </motion.div>
                )}

                {activeTab === "embed" && (
                  <motion.div
                    key="embed"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                       <h3 className="text-lg font-semibold flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-indigo-500" />
                        URL Direct Link
                       </h3>
                       <p className="text-sm text-muted-foreground">Link directly to your dedicated booking engine via your social media bios or message blasts.</p>
                       <div className="flex gap-2">
                          <Input value={widgetUrl} readOnly className="font-mono text-sm h-12 bg-muted/30 rounded-xl" />
                          <Button
                            size="icon"
                            variant="primary"
                            className="h-12 w-12 rounded-xl shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white"
                            onClick={() => copyToClipboard(widgetUrl, "link")}
                          >
                            {copied === "link" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                          </Button>
                          <Button size="icon" variant="outline" asChild className="h-12 w-12 rounded-xl shrink-0 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-500">
                            <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-5 w-5" />
                            </a>
                          </Button>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border/50" />

                    <div className="space-y-4">
                       <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        HTML Embed Script
                       </h3>
                       <p className="text-sm text-muted-foreground">Inject this modular script right before the closing <code>&lt;/body&gt;</code> HTML tag on your Wordpress, Shopify, or Custom site.</p>
                       
                       <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl blur-xl transition-all duration-500 group-hover:bg-primary/20" />
                          <div className="relative bg-[#1e1e2e] border border-white/10 p-6 rounded-2xl overflow-hidden shadow-2xl">
                            {/* Mac window controls */}
                            <div className="flex items-center gap-1.5 mb-4 opacity-50">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                            </div>
                            
                            <pre className="text-xs sm:text-sm font-mono text-blue-300 overflow-x-auto leading-relaxed">
                              <code>{embedCode.script}</code>
                            </pre>
                            
                            <Button
                              size="sm"
                              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md"
                              onClick={() => copyToClipboard(embedCode.script, "script")}
                            >
                              {copied === "script" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                              {copied === "script" ? "Copied!" : "Copy Snippet"}
                            </Button>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
            
            <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-between items-center">
               <span className="text-sm text-muted-foreground">Save your widget settings.</span>
               <Button 
                onClick={handleSave} 
                disabled={updateWidget.isPending}
                size="lg"
                className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all"
               >
                 {updateWidget.isPending ? "Saving..." : "Save Changes"}
               </Button>
            </div>
          </Card>
        </div>
        
        {/* Right Column: Live Interactive Glassmorphic Preview */}
        <div className="lg:col-span-5 relative lg:sticky lg:top-8 order-first lg:order-last">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-3xl -z-10 rounded-[3rem]" />
          
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-semibold flex items-center gap-2 text-muted-foreground"><Eye className="w-4 h-4"/> Live Interface Preview</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary animate-pulse">Running</span>
          </div>

          <div 
            className="w-full max-w-[380px] mx-auto border-[8px] border-black/90 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-[9/19] flex flex-col"
            style={{ backgroundColor: settings.background_color }}
          >
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
               <div className="w-32 h-6 bg-black/90 dark:bg-white/10 rounded-b-2xl" />
            </div>

            {/* App Header */}
            <div className="p-6 pt-12 pb-4 border-b/5 shadow-sm" style={{ borderColor: settings.text_color + '1A' }}>
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 shadow-md shrink-0 flex items-center justify-center text-primary-foreground font-bold text-lg">
                    S
                 </div>
                 <div className="flex-1">
                   <h2 className="font-bold text-lg leading-tight truncate tracking-tight" style={{ color: settings.text_color }}>
                     Salon Booking
                   </h2>
                   <p className="text-xs font-medium opacity-60 truncate" style={{ color: settings.text_color }}>
                     Secured Check-In
                   </p>
                 </div>
              </div>
            </div>
            
            {/* Scrollable App Body */}
            <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-6 hide-scrollbar relative z-10">
              
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight" style={{ color: settings.text_color }}>Select Service</h3>
                <p className="text-sm opacity-60 font-medium" style={{ color: settings.text_color }}>Tap a package to initialize booking</p>
              </div>

              {/* Dynamic Service List */}
              <div className="space-y-3">
                {(rawServices.length > 0
                  ? rawServices.slice(0, 4)
                  : [
                      { name: "Executive Haircut", duration_minutes: 45, price: 65.00 },
                      { name: "Color & Highlight", duration_minutes: 90, price: 140.00 },
                      { name: "Beard Sculpture", duration_minutes: 30, price: 35.00 },
                    ]
                ).map((service, i) => (
                  <motion.div
                    key={service.id || i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 border transition-all cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md backdrop-blur-sm"
                    style={{
                      borderRadius: settings.border_radius + "px",
                      borderColor: settings.primary_color + "33",
                      backgroundColor: settings.text_color + "05",
                    }}
                  >
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 transition-opacity" style={{ color: settings.primary_color }} />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="space-y-1">
                        <p className="font-bold tracking-tight text-[15px]" style={{ color: settings.text_color }}>
                          {service.name}
                        </p>
                        {settings.show_duration && (
                          <div className="flex items-center gap-1.5 opacity-60" style={{ color: settings.text_color }}>
                            <Settings2 className="w-3.5 h-3.5" />
                            <p className="text-xs font-semibold uppercase tracking-wider">{service.duration_minutes} min</p>
                          </div>
                        )}
                      </div>
                      {settings.show_prices && (
                        <span className="font-extrabold text-[15px]" style={{ color: settings.primary_color }}>
                          {formatCurrency(Number(service.price || 0), salon?.currency)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-background via-background to-transparent pt-10 z-20" style={{ '--tw-gradient-from': settings.background_color }}>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 text-white font-bold tracking-wide shadow-lg shadow-black/10 transition-all border border-black/5"
                style={{
                  backgroundColor: settings.primary_color,
                  borderRadius: settings.border_radius + "px",
                }}
              >
                {settings.button_text}
              </motion.button>
              
              {/* Home Indicator */}
              <div className="w-1/3 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
