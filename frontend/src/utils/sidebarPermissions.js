// src/utils/sidebarPermissions.js

import { hasPermission, hasAnyPermission, getCurrentUser, isAdmin } from './permissions';

/**
 * Permission groups mapped to sidebar menu items
 * Each key represents a sidebar menu item, and the value is an array of permissions
 * If user has ANY of these permissions, the sidebar item will be visible
 */
const SIDEBAR_PERMISSION_MAP = {
  // Dashboard - always visible
  dashboard: [],
  
  // User Management module
  userManagement: [
    'departments.view', 'departments.create', 'departments.update', 'departments.delete',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete',
    'users.view', 'users.create', 'users.update', 'users.delete'
  ],
  
  // Organization Setup module
  organizationSetup: [
    'company.view', 'company.create', 'company.edit', 'company.delete',
    'branch.view', 'branch.create', 'branch.edit', 'branch.delete',
    'store.view', 'store.create', 'store.edit', 'store.delete',
    'department.view'
  ],
  
  // Item Master module
  itemMaster: [
    'items.view', 'items.create', 'items.edit', 'items.delete',
    'category.view', 'category.create', 'category.edit', 'category.delete',
    'subcategory.view', 'subcategory.create', 'subcategory.edit', 'subcategory.delete',
    'brand.view', 'brand.create', 'brand.edit', 'brand.delete',
    'masterdata.setup'
  ],
  
  // Vendor Master module
  vendorMaster: [
    'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.status'
  ],
  
  // Customer Management module
  customerManagement: [
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.status'
  ],
  
  // Locations Management module
  locationsManagement: [
    'locations.view', 'locations.create_internal', 'locations.create_external', 
    'locations.edit', 'locations.delete'
  ],
  
  // Purchase Management module
  purchaseManagement: [
    'purchase_request.view', 'purchase_request.create', 'purchase_request.edit', 
    'purchase_request.delete', 'purchase_request.status', 'purchase_request.send_po',
    'purchase_order.view', 'purchase_order.print', 'purchase_order.download'
  ],
  
  // GRN module
  grn: [
    'grn.view', 'grn.create', 'grn.edit', 'grn.delete', 'grn.print', 
    'grn.status_qc', 'grn.status_approve'
  ],
  
  // Return & Disposal module
  returnDisposal: [
    'return_disposal.view', 'return_disposal.create', 'return_disposal.edit', 
    'return_disposal.delete', 'return_disposal.status_approve'
  ],
  
  // Vendor Ledger module
  vendorLedger: [
    'vendor_ledger.view', 'vendor_ledger.pay', 'vendor_ledger.print', 'vendor_ledger.invoice_view'
  ],
  
  // Stock Ledger module
  stockLedger: [
    'stock_ledger.view', 'stock_ledger.dispense', 'stock_ledger.available_qty'
  ],
  
  // External Transfer module
  externalTransfer: [
    'external_transfer.create', 'external_transfer.view', 'external_transfer.print', 
    'external_transfer.download', 'external_transfer.return',
    'damaged_returns.view', 'damaged_returns.print'
  ],
  
  // Audit Log - usually admin only
  auditLog: [
    'settings.view', 'settings.update' // Add appropriate permissions
  ],
  
  // Dispensed Items
  dispensedItems: [
    'stock_ledger.view', 'stock_ledger.dispense'
  ]
};

/**
 * Check if user has permission to see a specific sidebar menu item
 * @param {string} menuKey - The key from SIDEBAR_PERMISSION_MAP
 * @returns {boolean} - True if user can see the menu item
 */
export function canViewSidebarItem(menuKey) {
  try {
    const user = getCurrentUser();
    
    // If no user, hide everything except dashboard
    if (!user) {
      return menuKey === 'dashboard';
    }
    
    // Admin users can see everything
    if (isAdmin()) {
      return true;
    }
    
    // Dashboard is always visible for authenticated users
    if (menuKey === 'dashboard') {
      return true;
    }
    
    // Get permissions for this menu item
    const requiredPermissions = SIDEBAR_PERMISSION_MAP[menuKey];
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // If no permissions defined, show by default
    }
    
    // Check if user has ANY of the required permissions
    return hasAnyPermission(requiredPermissions);
    
  } catch (error) {
    console.error('Error checking sidebar permissions:', error);
    return false;
  }
}

/**
 * Get all visible sidebar menu items for current user
 * @returns {string[]} - Array of menu keys that should be visible
 */
export function getVisibleSidebarItems() {
  const visibleItems = [];
  
  for (const menuKey in SIDEBAR_PERMISSION_MAP) {
    if (canViewSidebarItem(menuKey)) {
      visibleItems.push(menuKey);
    }
  }
  
  return visibleItems;
}

/**
 * Check if user has any permissions within a specific module/group
 * @param {string} group - The permission group name (e.g., "User Management", "Purchase Management")
 * @returns {boolean} - True if user has any permission in this group
 */
export function hasModuleAccess(group) {
  try {
    const user = getCurrentUser();
    
    // Admin users have access to all modules
    if (isAdmin()) {
      return true;
    }
    
    if (!user) {
      return false;
    }
    
    const userPermissions = user?.permissions || [];
    
    // Admin users (with '*' permission) have access to everything
    if (userPermissions.includes('*')) {
      return true;
    }
    
    // Define permissions by group
    const groupPermissions = {
      'User Management': [
        'departments.view', 'departments.create', 'departments.update', 'departments.delete',
        'roles.view', 'roles.create', 'roles.update', 'roles.delete',
        'users.view', 'users.create', 'users.update', 'users.delete'
      ],
      'Organization': [
        'company.view', 'company.create', 'company.edit', 'company.delete',
        'branch.view', 'branch.create', 'branch.edit', 'branch.delete',
        'store.view', 'store.create', 'store.edit', 'store.delete',
        'department.view'
      ],
      'Item Master': [
        'items.view', 'items.create', 'items.edit', 'items.delete'
      ],
      'Master Data': [
        'category.view', 'category.create', 'category.edit', 'category.delete',
        'subcategory.view', 'subcategory.create', 'subcategory.edit', 'subcategory.delete',
        'brand.view', 'brand.create', 'brand.edit', 'brand.delete',
        'masterdata.setup'
      ],
      'Vendor Management': [
        'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.status'
      ],
      'Customer Management': [
        'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.status'
      ],
      'Location Management': [
        'locations.view', 'locations.create_internal', 'locations.create_external', 
        'locations.edit', 'locations.delete'
      ],
      'Purchase Management': [
        'purchase_request.view', 'purchase_request.create', 'purchase_request.edit', 
        'purchase_request.delete', 'purchase_request.status', 'purchase_request.send_po',
        'purchase_order.view', 'purchase_order.print', 'purchase_order.download'
      ],
      'Goods Receipt & Inspection (GRN)': [
        'grn.view', 'grn.create', 'grn.edit', 'grn.delete', 'grn.print', 
        'grn.status_qc', 'grn.status_approve'
      ],
      'Return and Disposal': [
        'return_disposal.view', 'return_disposal.create', 'return_disposal.edit', 
        'return_disposal.delete', 'return_disposal.status_approve'
      ],
      'Vendor Ledger': [
        'vendor_ledger.view', 'vendor_ledger.pay', 'vendor_ledger.print', 'vendor_ledger.invoice_view'
      ],
      'Stock Ledger': [
        'stock_ledger.view', 'stock_ledger.dispense', 'stock_ledger.available_qty'
      ],
      'External Transfer': [
        'external_transfer.create', 'external_transfer.view', 'external_transfer.print', 
        'external_transfer.download', 'external_transfer.return'
      ],
      'Damaged Returns': [
        'damaged_returns.view', 'damaged_returns.print'
      ]
    };
    
    const permissions = groupPermissions[group];
    if (!permissions) {
      return false;
    }
    
    // Check if user has any permission in this group
    return permissions.some(permission => userPermissions.includes(permission));
    
  } catch (error) {
    console.error('Error checking module access:', error);
    return false;
  }
}