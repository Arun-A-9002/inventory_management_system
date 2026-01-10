// src/utils/permissions.js

/**
 * Check if the current user has a specific permission
 * @param {string} permission - The permission to check (e.g., 'users.view', 'roles.create')
 * @returns {boolean} - True if user has permission, false otherwise
 */
export function hasPermission(permission) {
  try {
    // Get the access token from localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      return false;
    }

    // Decode the JWT token to get the payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check multiple admin fields
    if (payload.is_admin === true || payload.admin === true || payload.role === 'admin' || payload.user_type === 'admin') {
      return true;
    }
    
    // Get user permissions from the token
    const userPermissions = payload.permissions || [];
    
    // Admin users (with '*' permission) have access to everything
    if (userPermissions.includes('*')) {
      return true;
    }
    
    // Check if user has the specific permission
    return userPermissions.includes(permission);
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Get all permissions for the current user
 * @returns {string[]} - Array of permission strings
 */
export function getUserPermissions() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return [];
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Admin users have all permissions
    if (payload.is_admin === true || payload.admin === true || payload.role === 'admin' || payload.user_type === 'admin') {
      return ['*'];
    }
    
    return payload.permissions || [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Check if user has any of the provided permissions
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission
 */
export function hasAnyPermission(permissions) {
  if (!permissions || permissions.length === 0) {
    return true; // If no permissions required, allow access
  }
  
  return permissions.some(permission => hasPermission(permission));
}

/**
 * Check if user has all of the provided permissions
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if user has all permissions
 */
export function hasAllPermissions(permissions) {
  if (!permissions || permissions.length === 0) {
    return true; // If no permissions required, allow access
  }
  
  return permissions.every(permission => hasPermission(permission));
}

/**
 * Get current user info from token
 * @returns {object|null} - User info object or null if no token
 */
export function getCurrentUser() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }

    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if current user is admin
 * @returns {boolean} - True if user is admin
 */
export function isAdmin() {
  try {
    const user = getCurrentUser();
    if (!user) return false;
    
    return user.is_admin === true || 
           user.admin === true || 
           user.role === 'admin' || 
           user.user_type === 'admin' ||
           (user.permissions && user.permissions.includes('*'));
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}