// src/pages/Users.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [departmentId, setDepartmentId] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [multiLoginEnabled, setMultiLoginEnabled] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("users.view")) loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [dRes, rRes, uRes] = await Promise.all([api.get("/departments"), api.get("/roles"), api.get("/users")]);
      setDepartments(dRes.data || []);
      setRoles(rRes.data || []);
      setUsers(uRes.data || []);
    } catch (e) {
      console.error("Load error:", e);
      showToast("Failed to load data", 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(id) {
    const copy = new Set(selectedRoles);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    setSelectedRoles(copy);
  }

  async function generateLoginCode() {
    try {
      const response = await api.get("/users/generate-login-code");
      setLoginCode(response.data.login_code);
    } catch (e) {
      console.error("Failed to generate login code:", e);
      showToast("Failed to generate login code", 'error');
    }
  }

  async function handleCreate() {
    if (!editingId && !hasPermission("users.create")) {
      showToast("Permission denied", 'error');
      return;
    }
    if (editingId && !hasPermission("users.update")) {
      showToast("Permission denied", 'error');
      return;
    }

    if (!fullName || !email || (!editingId && !password)) {
      showToast("Name, email and password required", 'error');
      return;
    }

    try {
      const payload = {
        full_name: fullName,
        email,
        password: editingId ? undefined : password,
        department_id: departmentId,
        is_doctor: false,
        is_active: isActive,
        two_factor_enabled: twoFactorEnabled,
        multi_login_enabled: multiLoginEnabled,
        role_ids: Array.from(selectedRoles),
      };

      let response;
      if (!editingId) {
        response = await api.post("/users", payload);
        // Add the new user to the list immediately
        const newUser = response.data;
        setUsers(prevUsers => [...prevUsers, newUser]);
        showToast("User created successfully", 'success');
        
        // Auto refresh after 1 second to get updated data with relationships
        setTimeout(async () => {
          await loadAll();
        }, 1000);
      } else {
        response = await api.put(`/users/${editingId}`, { ...payload, password: password || undefined });
        // Update the user in the list immediately
        const updatedUser = response.data;
        setUsers(prevUsers => prevUsers.map(user => 
          user.id === editingId ? updatedUser : user
        ));
        showToast("User updated successfully", 'success');
      }

      closeModal();
    } catch (e) {
      console.error("Full error:", e);
      const errorMessage = e?.response?.data?.detail || e?.message || "Save failed";
      showToast(errorMessage, 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFullName(""); setEmail(""); setPassword(""); setLoginCode("");
    setDepartmentId(null); setIsActive(true); 
    setTwoFactorEnabled(false); setMultiLoginEnabled(false);
    setSelectedRoles(new Set());
  }

  function startEdit(u) {
    if (!hasPermission("users.update")) {
      showToast("Permission denied", 'error');
      return;
    }
    setEditingId(u.id);
    setFullName(u.full_name);
    setEmail(u.email);
    setLoginCode(u.login_code || "");
    setDepartmentId(u.department_id);
    setIsActive(!!u.is_active);
    setTwoFactorEnabled(!!u.two_factor_enabled);
    setMultiLoginEnabled(!!u.multi_login_enabled);
    setSelectedRoles(new Set((u.roles || []).map(r => r.id)));
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!hasPermission("users.delete")) {
      showToast("Permission denied", 'error');
      return;
    }
    if (!window.confirm("Delete user?")) return;
    try {
      await api.delete(`/users/${id}`);
      showToast("User deleted successfully", 'success');
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Delete failed", 'error');
    }
  }

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && user.is_active) ||
      (filterStatus === "inactive" && !user.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (!hasPermission("users.view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">User Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage system users, roles, and access permissions</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
                <span className="text-sm font-medium text-gray-600">Total Users</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{users.length}</span>
              </div>
              {hasPermission("users.create") && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchQuery("");
                    setShowModal(true);
                    generateLoginCode();
                  }} 
                  className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200 text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add User
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    name="user-search-query"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="pl-10 pr-4 py-2 w-full sm:w-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  />
                </div>
              </form>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <div className="text-sm text-gray-500 text-center sm:text-right">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-gray-600">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredUsers.map(user => (
              <div key={user.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-lg flex-shrink-0">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{user.full_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Login Code:</span>
                      <span className="ml-2 text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {user.login_code}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Department:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {user.department ? user.department.name : 'No department'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Authentication:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.two_factor_enabled && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            🔐 2FA Enabled
                          </span>
                        )}
                        {user.multi_login_enabled ? (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            🔄 Multi-Login
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                            🔒 Single Session
                          </span>
                        )}
                        {!user.two_factor_enabled && !user.multi_login_enabled && (
                          <span className="text-xs text-gray-500">Standard login</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Roles:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(user.roles || []).length > 0 ? (
                          user.roles.map(role => (
                            <span key={role.id} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No roles assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-6 pt-4 border-t">
                    {hasPermission("users.update") && (
                      <button 
                        onClick={() => startEdit(user)} 
                        className="flex-1 px-3 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors duration-200"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission("users.delete") && (
                      <button 
                        onClick={() => handleDelete(user.id)} 
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingId ? 'Edit User' : 'Add New User'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input 
                    type="text"
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                    placeholder="Enter email address"
                  />
                </div>
                
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input 
                      type="password"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                      placeholder="Enter password"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Login Code *</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={loginCode} 
                      onChange={e => setLoginCode(e.target.value.toUpperCase())} 
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                      placeholder="Auto-generated code"
                      readOnly={editingId ? true : false}
                    />
                    {!editingId && (
                      <button
                        type="button"
                        onClick={generateLoginCode}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex-shrink-0"
                        title="Generate new login code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Unique code for user login (e.g., AB123456)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select 
                    value={departmentId || ''} 
                    onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : null)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={e => setIsActive(e.target.checked)} 
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Active User</span>
                  </label>
                </div>
              </div>

              {/* Authentication Settings */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Authentication Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-start">
                    <input 
                      type="checkbox" 
                      checked={twoFactorEnabled} 
                      onChange={e => setTwoFactorEnabled(e.target.checked)} 
                      className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 flex-shrink-0"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">Two-Factor Authentication</div>
                      <div className="text-xs text-gray-500">Require OTP verification for login</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start">
                    <input 
                      type="checkbox" 
                      checked={multiLoginEnabled} 
                      onChange={e => setMultiLoginEnabled(e.target.checked)} 
                      className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 flex-shrink-0"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">Multi-Login</div>
                      <div className="text-xs text-gray-500">
                        Allow multiple simultaneous logins. If disabled, user will be blocked from logging in if already logged in on another device.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Roles ({roles.length} available)
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-start p-2 rounded hover:bg-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedRoles.has(role.id)} 
                          onChange={() => toggleRole(role.id)} 
                          className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 flex-shrink-0"
                        />
                        <div className="ml-3 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                          {role.description && (
                            <div className="text-xs text-gray-500 break-words">{role.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate} 
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors duration-200"
                >
                  {editingId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}