"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query keys
export var settingsKeys = {
  all: ["settings"],
  salon: function (salonId) {
    return ["settings", "salon", salonId];
  },
  widget: function (salonId) {
    return ["settings", "widget", salonId];
  },
  notifications: function (salonId) {
    return ["settings", "notifications", salonId];
  },
  policies: function (salonId) {
    return ["settings", "policies", salonId];
  },
};

// Default settings
export var DEFAULT_BUSINESS_HOURS = [
  { day: 0, name: "Sunday", enabled: false, open: "09:00", close: "17:00" },
  { day: 1, name: "Monday", enabled: true, open: "09:00", close: "18:00" },
  { day: 2, name: "Tuesday", enabled: true, open: "09:00", close: "18:00" },
  { day: 3, name: "Wednesday", enabled: true, open: "09:00", close: "18:00" },
  { day: 4, name: "Thursday", enabled: true, open: "09:00", close: "20:00" },
  { day: 5, name: "Friday", enabled: true, open: "09:00", close: "20:00" },
  { day: 6, name: "Saturday", enabled: true, open: "09:00", close: "17:00" },
];

export var REMINDER_OPTIONS = [
  { value: "1h", label: "1 hour before" },
  { value: "2h", label: "2 hours before" },
  { value: "4h", label: "4 hours before" },
  { value: "24h", label: "24 hours before" },
  { value: "48h", label: "48 hours before" },
  { value: "72h", label: "72 hours before" },
];

export var CANCELLATION_POLICIES = [
  {
    value: "flexible",
    label: "Flexible",
    description: "Free cancellation up to 1 hour before",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Free cancellation up to 24 hours before",
  },
  {
    value: "strict",
    label: "Strict",
    description: "Free cancellation up to 48 hours before",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Define your own cancellation window",
  },
];

export var WIDGET_THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto (System)" },
];

// Fetch salon settings
export function useSalonSettings(salonId) {
  return useQuery({
    queryKey: settingsKeys.salon(salonId),
    queryFn: async function () {
      var response = await fetch("/api/salons/" + salonId, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch salon settings");
      return response.json();
    },
    enabled: !!salonId,
    select: function (response) {
      return response.data;
    },
  });
}

// Update salon settings
export function useUpdateSalonSettings() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var response = await fetch("/api/salons/" + params.salonId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params.data),
      });
      if (!response.ok) throw new Error("Failed to update salon settings");
      return response.json();
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.salon(variables.salonId),
      });
    },
  });
}

// Update salon policies/settings
export function useUpdateSalonPolicies() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var response = await fetch(
        "/api/salons/" + params.salonId + "/settings",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(params.data),
        },
      );
      if (!response.ok) throw new Error("Failed to update policies");
      return response.json();
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.salon(variables.salonId),
      });
      queryClient.invalidateQueries({
        queryKey: settingsKeys.policies(variables.salonId),
      });
    },
  });
}

// Fetch widget settings
export function useWidgetSettings(salonId) {
  return useQuery({
    queryKey: settingsKeys.widget(salonId),
    queryFn: async function () {
      var response = await fetch("/api/salons/" + salonId + "/widget", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch widget settings");
      return response.json();
    },
    enabled: !!salonId,
  });
}

// Update widget settings
export function useUpdateWidgetSettings() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var response = await fetch("/api/salons/" + params.salonId + "/widget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params.data),
      });
      if (!response.ok) throw new Error("Failed to update widget settings");
      return response.json();
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.widget(variables.salonId),
      });
    },
  });
}

// Upload salon photos
export function useUploadSalonPhoto() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var formData = new FormData();
      formData.append("photo", params.file);
      formData.append("type", params.type || "gallery");

      var response = await fetch("/api/salons/" + params.salonId + "/photos", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload photo");
      return response.json();
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.salon(variables.salonId),
      });
    },
  });
}

// Delete salon photo
export function useDeleteSalonPhoto() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var response = await fetch(
        "/api/salons/" + params.salonId + "/photos/" + params.photoId,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to delete photo");
      return response.json();
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.salon(variables.salonId),
      });
    },
  });
}

// Toggle marketplace
export function useToggleMarketplace() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var action = params.enabled ? "enable" : "disable";
      var response = await fetch(
        "/api/salons/" + params.salonId + "/marketplace/" + action,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to toggle marketplace");
      return response.json();
    },
    onSuccess: function (data, variables) {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.salon(variables.salonId),
      });
    },
  });
}

// User account settings
export function useUpdateUserAccount() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var response = await fetch("/api/users/" + params.userId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params.data),
      });
      if (!response.ok) throw new Error("Failed to update account");
      return response.json();
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// Change password
export function useChangePassword() {
  return useMutation({
    mutationFn: async function (params) {
      var response = await fetch("/api/auth/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
  });
}

// Generate widget embed code
export function generateEmbedCode(salonId, options) {
  var baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  var params = new URLSearchParams();

  if (options.theme) params.set("theme", options.theme);
  if (options.primaryColor) params.set("color", options.primaryColor);
  if (options.showServices !== undefined)
    params.set("services", options.showServices);

  var queryString = params.toString();
  var widgetUrl =
    baseUrl + "/widget/" + salonId + (queryString ? "?" + queryString : "");

  return {
    iframe:
      '<iframe src="' +
      widgetUrl +
      '" width="100%" height="600" frameborder="0"></iframe>',
    script:
      '<script src="' +
      baseUrl +
      '/widget.js" data-salon-id="' +
      salonId +
      '"></script>',
    link: widgetUrl,
  };
}

// Delete salon (soft delete)
export function useDeleteSalon() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (params) {
      var url = "/api/salons/" + params.salonId;
      if (params.force) {
        url += "?force=true";
      }
      var response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      var data = await response.json();
      if (!response.ok) {
        var error = new Error(data.error || "Failed to delete salon");
        error.blockers = data.blockers;
        throw error;
      }
      return data;
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["user-salons"] });
      queryClient.invalidateQueries({ queryKey: ["salons"] });
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// Format time for display
export function formatTime(time) {
  if (!time) return "";
  var parts = time.split(":");
  var hours = parseInt(parts[0], 10);
  var minutes = parts[1];
  var period = hours >= 12 ? "PM" : "AM";
  var displayHours = hours % 12 || 12;
  return displayHours + ":" + minutes + " " + period;
}
