/**
 * Role-Based Permission Engine for the Salon Dashboard
 * with Custom Per-Staff Permission Overrides.
 *
 * Staff roles come from the `staff` table ENUM: owner | manager | receptionist | staff
 * Custom overrides come from the `staff.permissions` JSON column.
 *
 * Resolution order:
 *   1. If customPermissions has an explicit value for the key → use it
 *   2. Otherwise → fall back to the role-based default
 */

// ─── Role hierarchy (higher number = more privilege) ───────────────────────
export const ROLE_RANK = {
  staff: 1,
  receptionist: 2,
  manager: 3,
  owner: 4,
};

/**
 * Check if `currentRole` is at least as privileged as `requiredRole`.
 */
export function hasMinRole(currentRole, requiredRole) {
  return (ROLE_RANK[currentRole] || 0) >= (ROLE_RANK[requiredRole] || 99);
}

// ─── Permission keys & role defaults ───────────────────────────────────────
// Each permission key has a display label, description, category, and
// a function that returns the default boolean for a given role.

export const PERMISSION_KEYS = {
  dashboard_full: {
    label: 'Full dashboard statistics',
    description: 'View revenue, new clients, and all booking stats',
    category: 'Dashboard & Calendar',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  calendar_all: {
    label: 'View all staff calendars',
    description: 'See every team member\'s schedule, not just your own',
    category: 'Dashboard & Calendar',
    roleDefault: (role) => hasMinRole(role, 'receptionist'),
  },
  bookings_all: {
    label: 'View all bookings',
    description: 'See bookings for all staff, not just your own',
    category: 'Dashboard & Calendar',
    roleDefault: (role) => hasMinRole(role, 'receptionist'),
  },
  clients: {
    label: 'Access clients',
    description: 'View and manage the client database',
    category: 'CRM',
    roleDefault: (role) => hasMinRole(role, 'receptionist'),
  },
  services_edit: {
    label: 'Edit services',
    description: 'Create, modify, and delete services and pricing',
    category: 'CRM',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  team: {
    label: 'Manage team',
    description: 'Add, edit, and remove team members',
    category: 'Management',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  products: {
    label: 'Manage products',
    description: 'Manage product inventory and pricing',
    category: 'Financial',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  sales: {
    label: 'View sales & payments',
    description: 'Access payment history and transaction records',
    category: 'Financial',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  marketing: {
    label: 'Marketing tools',
    description: 'Campaigns, discounts, gift cards, and packages',
    category: 'Management',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  reports: {
    label: 'View reports',
    description: 'Access revenue, booking, and staff performance reports',
    category: 'Financial',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  settings_business: {
    label: 'Business settings',
    description: 'General info, policies, widget, and marketplace settings',
    category: 'Settings',
    roleDefault: (role) => role === 'owner',
  },
  settings_hours: {
    label: 'Business hours',
    description: 'Edit working hours and notification preferences',
    category: 'Settings',
    roleDefault: (role) => hasMinRole(role, 'manager'),
  },
  settings_billing: {
    label: 'Billing & subscription',
    description: 'Manage subscription plan and payment methods',
    category: 'Settings',
    roleDefault: (role) => role === 'owner',
  },
  add_location: {
    label: 'Add new location',
    description: 'Create additional salon locations',
    category: 'Settings',
    roleDefault: (role) => role === 'owner',
  },
};

// ─── Core resolution function ──────────────────────────────────────────────

/**
 * Resolve a single permission. Checks custom overrides first, then role default.
 * @param {string} staffRole - owner | manager | receptionist | staff
 * @param {object|null} customPermissions - The staff.permissions JSON (or null)
 * @param {string} key - The permission key (e.g. 'reports', 'sales')
 * @returns {boolean}
 */
export function resolvePermission(staffRole, customPermissions, key) {
  // Owners always have full access — cannot be restricted
  if (staffRole === 'owner') return true;

  // Check for custom override
  if (customPermissions && typeof customPermissions[key] === 'boolean') {
    return customPermissions[key];
  }

  // Fall back to role default
  const permDef = PERMISSION_KEYS[key];
  if (permDef) {
    return permDef.roleDefault(staffRole);
  }

  return false;
}

/**
 * Get the full set of default permissions for a role.
 * Used by the UI to show what the defaults are.
 */
export function getDefaultPermissions(role) {
  const defaults = {};
  for (const key of Object.keys(PERMISSION_KEYS)) {
    defaults[key] = PERMISSION_KEYS[key].roleDefault(role);
  }
  return defaults;
}

/**
 * Get permission keys grouped by category.
 * Used by the permissions editor UI.
 */
export function getPermissionsByCategory() {
  const categories = {};
  for (const [key, def] of Object.entries(PERMISSION_KEYS)) {
    if (!categories[def.category]) {
      categories[def.category] = [];
    }
    categories[def.category].push({ key, ...def });
  }
  return categories;
}

// ─── Sidebar permissions ───────────────────────────────────────────────────
// Maps sidebar item name to the permission key that controls its visibility.
const SIDEBAR_PERMISSION_KEY = {
  Dashboard: null,           // always visible
  Calendar: null,            // always visible (content is scoped)
  Bookings: null,            // always visible (content is scoped)
  Clients: 'clients',
  Services: 'clients',       // view access = same as clients
  Team: 'team',
  Products: 'products',
  Sales: 'sales',
  Marketing: 'marketing',
  Reports: 'reports',
  Reviews: null,             // always visible (content is scoped)
  Support: null,             // always visible
  Settings: null,            // always visible (sub-pages are filtered)
};

/**
 * Filter the sidebar navigation array based on resolved permissions.
 * @param {Array} navItems - The full navigation items array
 * @param {string} staffRole - owner | manager | receptionist | staff
 * @param {object|null} customPermissions - The staff.permissions JSON (or null)
 * @returns {Array} Filtered navigation items
 */
export function getVisibleSidebarItems(navItems, staffRole, customPermissions) {
  if (!staffRole) return navItems;
  return navItems.filter((item) => {
    const permKey = SIDEBAR_PERMISSION_KEY[item.name];
    if (permKey === null || permKey === undefined) return true;
    return resolvePermission(staffRole, customPermissions, permKey);
  });
}

// ─── Settings sub-page permissions ─────────────────────────────────────────
// Maps settings sub-page href to the permission key that controls its visibility.
const SETTINGS_PERMISSION_KEY = {
  general: 'settings_business',
  hours: 'settings_hours',
  policies: 'settings_business',
  notifications: 'settings_hours',
  widget: 'settings_business',
  marketplace: 'settings_business',
  reviews: 'settings_hours',
  account: null,              // always visible (everyone can edit own account)
  billing: 'settings_billing',
};

/**
 * Filter the settings navigation sections based on resolved permissions.
 * @param {Array} settingsNav - The full settings navigation sections array
 * @param {string} staffRole - owner | manager | receptionist | staff
 * @param {object|null} customPermissions - The staff.permissions JSON (or null)
 * @returns {Array} Filtered settings navigation (empty sections removed)
 */
export function getVisibleSettingsItems(settingsNav, staffRole, customPermissions) {
  if (!staffRole) return settingsNav;
  return settingsNav
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const permKey = SETTINGS_PERMISSION_KEY[item.href];
        if (permKey === null || permKey === undefined) return true;
        return resolvePermission(staffRole, customPermissions, permKey);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

// ─── Page-level permission checks ──────────────────────────────────────────
// Maps dashboard page path to the permission key that controls access.
const PAGE_PERMISSION_KEY = {
  dashboard: null,        // always accessible (content is scoped)
  calendar: null,         // always accessible (content is scoped)
  bookings: null,         // always accessible (content is scoped)
  clients: 'clients',
  services: 'clients',    // view access = same as clients
  team: 'team',
  products: 'products',
  sales: 'sales',
  marketing: 'marketing',
  reports: 'reports',
  reviews: null,          // always accessible (content is scoped)
  support: null,          // always accessible
  settings: null,         // base settings; sub-pages have own checks
};

/**
 * Check if a user can access a specific page.
 * @param {string} staffRole
 * @param {string} pageName
 * @param {object|null} customPermissions
 * @returns {boolean}
 */
export function canAccessPage(staffRole, pageName, customPermissions) {
  const permKey = PAGE_PERMISSION_KEY[pageName];
  if (permKey === null || permKey === undefined) return true;
  return resolvePermission(staffRole, customPermissions, permKey);
}

// ─── Feature-level permission helpers ──────────────────────────────────────

/** Can the user edit services (not just view)? */
export function canEditServices(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'services_edit');
}

/** Can the user create bookings for other staff? */
export function canCreateBookingsForOthers(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'bookings_all');
}

/** Can the user see all bookings (not just their own)? */
export function canSeeAllBookings(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'bookings_all');
}

/** Can the user see all calendar columns (not just their own)? */
export function canSeeAllCalendar(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'calendar_all');
}

/** Can the user see financial data (revenue, payments)? */
export function canSeeFinancials(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'dashboard_full');
}

/** Can the user manage team members? */
export function canManageTeam(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'team');
}

/** Can the user add new salon locations? */
export function canAddLocation(staffRole, customPermissions) {
  return resolvePermission(staffRole, customPermissions, 'add_location');
}

/** Can the user access the danger zone (delete salon)? */
export function canAccessDangerZone(staffRole) {
  return staffRole === 'owner';
}
