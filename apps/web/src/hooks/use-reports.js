'use client';

import { useQuery } from '@tanstack/react-query';

// Query keys
export var reportKeys = {
  all: ['reports'],
  overview: function(salonId, dateRange) { return ['reports', 'overview', salonId, dateRange]; },
  revenue: function(salonId, dateRange) { return ['reports', 'revenue', salonId, dateRange]; },
  bookings: function(salonId, dateRange) { return ['reports', 'bookings', salonId, dateRange]; },
  clients: function(salonId, dateRange) { return ['reports', 'clients', salonId, dateRange]; },
  staff: function(salonId, dateRange) { return ['reports', 'staff', salonId, dateRange]; },
};

// Date range helpers
export var DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function getDateRange(rangeType) {
  var now = new Date();
  var start, end;
  
  switch (rangeType) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;
    case 'last_7_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      end = now;
      break;
    case 'last_30_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      end = now;
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'this_quarter':
      var quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = now;
      break;
    case 'last_quarter':
      var prevQuarter = Math.floor(now.getMonth() / 3) - 1;
      var prevQuarterYear = now.getFullYear();
      if (prevQuarter < 0) {
        prevQuarter = 3;
        prevQuarterYear--;
      }
      start = new Date(prevQuarterYear, prevQuarter * 3, 1);
      end = new Date(prevQuarterYear, (prevQuarter + 1) * 3, 0, 23, 59, 59);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      end = now;
  }
  
  return { start: start, end: end };
}

export function formatDateRange(start, end) {
  var options = { month: 'short', day: 'numeric' };
  var startStr = start.toLocaleDateString('en-US', options);
  var endStr = end.toLocaleDateString('en-US', options);
  
  if (start.getFullYear() !== end.getFullYear()) {
    startStr = start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  }
  
  if (startStr === endStr) {
    return startStr;
  }
  
  return startStr + ' - ' + endStr;
}

// Overview report hook
export function useReportsOverview(salonId, dateRange) {
  return useQuery({
    queryKey: reportKeys.overview(salonId, dateRange),
    queryFn: async function() {
      var params = new URLSearchParams({
        salon_id: salonId,
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      });
      var response = await fetch('/api/reports/overview?' + params.toString(), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch overview report');
      return response.json();
    },
    enabled: !!salonId,
  });
}

// Revenue report hook
export function useRevenueReport(salonId, dateRange) {
  return useQuery({
    queryKey: reportKeys.revenue(salonId, dateRange),
    queryFn: async function() {
      var params = new URLSearchParams({
        salon_id: salonId,
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      });
      var response = await fetch('/api/reports/revenue?' + params.toString(), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch revenue report');
      return response.json();
    },
    enabled: !!salonId,
  });
}

// Bookings report hook
export function useBookingsReport(salonId, dateRange) {
  return useQuery({
    queryKey: reportKeys.bookings(salonId, dateRange),
    queryFn: async function() {
      var params = new URLSearchParams({
        salon_id: salonId,
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      });
      var response = await fetch('/api/reports/bookings?' + params.toString(), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch bookings report');
      return response.json();
    },
    enabled: !!salonId,
  });
}

// Clients report hook
export function useClientsReport(salonId, dateRange) {
  return useQuery({
    queryKey: reportKeys.clients(salonId, dateRange),
    queryFn: async function() {
      var params = new URLSearchParams({
        salon_id: salonId,
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      });
      var response = await fetch('/api/reports/clients?' + params.toString(), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch clients report');
      return response.json();
    },
    enabled: !!salonId,
  });
}

// Staff report hook
export function useStaffReport(salonId, dateRange) {
  return useQuery({
    queryKey: reportKeys.staff(salonId, dateRange),
    queryFn: async function() {
      var params = new URLSearchParams({
        salon_id: salonId,
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      });
      var response = await fetch('/api/reports/staff?' + params.toString(), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch staff report');
      return response.json();
    },
    enabled: !!salonId,
  });
}

// Format currency helper
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
}

// Format percentage helper
export function formatPercentage(value, decimals) {
  if (decimals === undefined) decimals = 1;
  return (value || 0).toFixed(decimals) + '%';
}

// Calculate percentage change
export function calculateChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

// Format change for display
export function formatChange(change) {
  var sign = change >= 0 ? '+' : '';
  return sign + change.toFixed(1) + '%';
}

// Export helpers
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  
  var headers = Object.keys(data[0]);
  var csvContent = headers.join(',') + '\n';
  
  data.forEach(function(row) {
    var values = headers.map(function(header) {
      var value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return '"' + value + '"';
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });
  
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename + '.csv';
  link.click();
}

export function exportToPDF(title, content) {
  // This would typically use a library like jsPDF or html2pdf
  // For now, we'll use the browser's print functionality
  var printWindow = window.open('', '_blank');
  printWindow.document.write('<html><head><title>' + title + '</title>');
  printWindow.document.write('<style>body { font-family: system-ui, sans-serif; padding: 20px; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write('<h1>' + title + '</h1>');
  printWindow.document.write(content);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}
