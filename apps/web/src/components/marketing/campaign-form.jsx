"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MessageSquare } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

import {
  useCreateCampaign,
  useUpdateCampaign,
  CAMPAIGN_TYPES,
  AUDIENCE_TYPES,
} from "@/hooks/use-campaigns";

var campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "sms"]),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  audience_type: z.string().min(1, "Please select an audience"),
});

export function CampaignForm({
  open,
  onOpenChange,
  salonId,
  campaign,
  onSuccess,
}) {
  var { toast } = useToast();
  var createCampaign = useCreateCampaign();
  var updateCampaign = useUpdateCampaign();

  var isEditing = !!campaign;

  var form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      type: "email",
      subject: "",
      message: "",
      audience_type: "all",
    },
  });

  var campaignType = form.watch("type");

  // Reset form when campaign changes
  useEffect(
    function () {
      if (open) {
        if (campaign) {
          form.reset({
            name: campaign.name || "",
            type: campaign.type || "email",
            subject: campaign.subject || "",
            message: campaign.message || campaign.content || "",
            audience_type:
              campaign.audience_type ||
              campaign.audienceType ||
              campaign.target_audience ||
              "all",
          });
        } else {
          form.reset({
            name: "",
            type: "email",
            subject: "",
            message: "",
            audience_type: "all",
          });
        }
      }
    },
    [open, campaign]
  );

  function onSubmit(data) {
    var payload = {
      name: data.name,
      type: data.type,
      subject: data.subject,
      content: data.message,
      target_audience: data.audience_type,
      salon_id: salonId,
      status: "draft",
    };

    if (isEditing) {
      updateCampaign.mutate(
        {
          campaignId: campaign.id,
          data: payload,
        },
        {
          onSuccess: function () {
            toast({ title: "Campaign updated" });
            onSuccess && onSuccess();
          },
          onError: function (error) {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createCampaign.mutate(payload, {
        onSuccess: function () {
          toast({ title: "Campaign created" });
          onSuccess && onSuccess();
        },
        onError: function (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }
  }

  var isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full flex flex-col h-full p-0 border-l shadow-2xl">
        <div className="px-6 py-6 border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {isEditing ? "Edit Campaign" : "Create Campaign"}
            </SheetTitle>
            <SheetDescription>
              {isEditing ? "Update your campaign details." : "Configure a new marketing broadcast."}
            </SheetDescription>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-6">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="font-semibold">Campaign Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Summer Promotion"
                          />
                        </FormControl>
                        <FormDescription>
                          Internal name for this campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="font-semibold">Campaign Type</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={
                              "border rounded-xl p-4 cursor-pointer transition-all " +
                              (field.value === "email"
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                                : "hover:bg-muted/50 border-border/50")
                            }
                            onClick={function () {
                              field.onChange("email");
                            }}
                          >
                            <Mail
                              className={
                                "h-6 w-6 mb-2 transition-colors " +
                                (field.value === "email"
                                  ? "text-primary"
                                  : "text-muted-foreground")
                              }
                            />
                            <p className="font-medium">Email</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Rich HTML content
                            </p>
                          </div>
                          <div
                            className={
                              "border rounded-xl p-4 cursor-pointer transition-all " +
                              (field.value === "sms"
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                                : "hover:bg-muted/50 border-border/50")
                            }
                            onClick={function () {
                              field.onChange("sms");
                            }}
                          >
                            <MessageSquare
                              className={
                                "h-6 w-6 mb-2 transition-colors " +
                                (field.value === "sms"
                                  ? "text-primary"
                                  : "text-muted-foreground")
                              }
                            />
                            <p className="font-medium">SMS</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Text messages
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Subject (Email only) */}
                {campaignType === "email" && (
                  <FormField
                    control={form.control}
                    name="subject"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel className="font-semibold">Subject Line</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Don't miss our summer deals!"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* Audience */}
                <FormField
                  control={form.control}
                  name="audience_type"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="font-semibold">Target Audience</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AUDIENCE_TYPES.map(function (audience) {
                              return (
                                <SelectItem
                                  key={audience.value}
                                  value={audience.value}
                                >
                                  {audience.label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Message */}
                <FormField
                  control={form.control}
                  name="message"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="font-semibold">
                          {campaignType === "email"
                            ? "Email Body"
                            : "SMS Message"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={
                              campaignType === "email"
                                ? "Write your email content..."
                                : "Write your SMS message (max 160 characters)..."
                            }
                            rows={campaignType === "email" ? 8 : 4}
                            className="resize-y"
                          />
                        </FormControl>
                        {campaignType === "sms" && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                            <span>{field.value?.length || 0}/160 characters</span>
                          </div>
                        )}
                        <FormDescription className="pt-1">
                          Use placeholders: {"{{first_name}}"},{" "}
                          {"{{salon_name}}"}, {"{{booking_link}}"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t bg-muted/20 mt-auto">
              <SheetFooter className="flex-row gap-3 justify-end sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={function () {
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : isEditing
                    ? "Update Campaign"
                    : "Save as Draft"}
                </Button>
              </SheetFooter>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
