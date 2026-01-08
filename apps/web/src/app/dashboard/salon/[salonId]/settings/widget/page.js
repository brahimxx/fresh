'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Palette, Code, Copy, Check, ExternalLink, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import {
  useWidgetSettings,
  useUpdateWidgetSettings,
  generateEmbedCode,
  WIDGET_THEMES,
} from '@/hooks/use-settings';

export default function WidgetPage() {
  var params = useParams();
  var { toast } = useToast();
  
  var { data: widgetData, isLoading } = useWidgetSettings(params.salonId);
  var updateWidget = useUpdateWidgetSettings();
  
  var [settings, setSettings] = useState({
    theme: 'default',
    primary_color: '#6366f1',
    text_color: '#1f2937',
    background_color: '#ffffff',
    border_radius: '8',
    show_prices: true,
    show_duration: true,
    show_staff: true,
    button_text: 'Book Now',
  });
  
  var [copied, setCopied] = useState(null);
  
  useEffect(function() {
    if (widgetData?.settings) {
      setSettings(function(prev) {
        return { ...prev, ...widgetData.settings };
      });
    }
  }, [widgetData]);
  
  function updateSetting(key, value) {
    setSettings(function(prev) {
      return { ...prev, [key]: value };
    });
  }
  
  function handleSave() {
    updateWidget.mutate({
      salonId: params.salonId,
      data: settings,
    }, {
      onSuccess: function() {
        toast({ title: 'Widget settings saved' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(function() { setCopied(null); }, 2000);
    toast({ title: 'Copied to clipboard' });
  }
  
  var embedCode = generateEmbedCode(params.salonId, settings);
  var widgetUrl = typeof window !== 'undefined' 
    ? window.location.origin + '/book/' + params.salonId
    : '/book/' + params.salonId;
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Widget Settings</h1>
        <p className="text-muted-foreground">
          Customize your booking widget for your website
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings */}
        <div className="space-y-6">
          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={function(value) { updateSetting('theme', value); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDGET_THEMES.map(function(theme) {
                      return (
                        <SelectItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.primary_color}
                      onChange={function(e) { updateSetting('primary_color', e.target.value); }}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={function(e) { updateSetting('primary_color', e.target.value); }}
                      className="font-mono"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.text_color}
                      onChange={function(e) { updateSetting('text_color', e.target.value); }}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.text_color}
                      onChange={function(e) { updateSetting('text_color', e.target.value); }}
                      className="font-mono"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.background_color}
                      onChange={function(e) { updateSetting('background_color', e.target.value); }}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.background_color}
                      onChange={function(e) { updateSetting('background_color', e.target.value); }}
                      className="font-mono"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Border Radius (px)</Label>
                  <Input
                    type="number"
                    value={settings.border_radius}
                    onChange={function(e) { updateSetting('border_radius', e.target.value); }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  value={settings.button_text}
                  onChange={function(e) { updateSetting('button_text', e.target.value); }}
                  placeholder="Book Now"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Add this code to your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="script">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="script">Script</TabsTrigger>
                  <TabsTrigger value="link">Direct Link</TabsTrigger>
                </TabsList>
                
                <TabsContent value="script" className="space-y-3">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                      <code>{embedCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={function() { copyToClipboard(embedCode, 'script'); }}
                    >
                      {copied === 'script' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste this code before the closing {'</body>'} tag
                  </p>
                </TabsContent>
                
                <TabsContent value="link" className="space-y-3">
                  <div className="flex gap-2">
                    <Input value={widgetUrl} readOnly className="font-mono text-sm" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={function() { copyToClipboard(widgetUrl, 'link'); }}
                    >
                      {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="outline" asChild>
                      <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link directly with your clients
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border rounded-lg p-6 space-y-4"
                style={{
                  backgroundColor: settings.background_color,
                  borderRadius: settings.border_radius + 'px',
                }}
              >
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: settings.text_color }}
                  >
                    Book an Appointment
                  </h3>
                  <p
                    className="text-sm opacity-70"
                    style={{ color: settings.text_color }}
                  >
                    Select a service to get started
                  </p>
                </div>
                
                {/* Mock Service List */}
                <div className="space-y-2">
                  {[
                    { name: 'Haircut', duration: '30 min', price: '$45' },
                    { name: 'Color Treatment', duration: '90 min', price: '$120' },
                    { name: 'Styling', duration: '45 min', price: '$60' },
                  ].map(function(service, i) {
                    return (
                      <div
                        key={i}
                        className="p-3 border rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          borderRadius: Math.max(4, parseInt(settings.border_radius) - 4) + 'px',
                          borderColor: settings.primary_color + '33',
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p
                              className="font-medium"
                              style={{ color: settings.text_color }}
                            >
                              {service.name}
                            </p>
                            {settings.show_duration && (
                              <p
                                className="text-xs opacity-60"
                                style={{ color: settings.text_color }}
                              >
                                {service.duration}
                              </p>
                            )}
                          </div>
                          {settings.show_prices && (
                            <span
                              className="font-semibold"
                              style={{ color: settings.primary_color }}
                            >
                              {service.price}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button
                  className="w-full py-2.5 px-4 text-white font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: settings.primary_color,
                    borderRadius: settings.border_radius + 'px',
                  }}
                >
                  {settings.button_text}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateWidget.isPending}>
          {updateWidget.isPending ? 'Saving...' : 'Save Widget Settings'}
        </Button>
      </div>
    </div>
  );
}
