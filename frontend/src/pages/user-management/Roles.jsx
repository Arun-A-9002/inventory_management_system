// src/pages/user-management/Roles.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("roles.view")) loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        api.get("/roles/permissions"),
        api.get("/roles")
      ]);
      setPermissions(pRes.data || []);
      setRoles(rRes.data || []);
    } catch (e) {
      console.error("Load error:", e);
      showToast("Failed to load data", 'error');
    } finally {
      setLoading(false);
    }
  }

  function togglePermission(id) {
    const copy = new Set(selectedPermissions);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    setSelectedPermissions(copy);
  }

  async function handleSave() {
    if (!editingId && !hasPermission("roles.create")) {
      showToast("Permission denied", 'error');
      return;
    }
    if (editingId && !hasPermission("roles.update")) {
      showToast("Permission denied", 'error');
      return;
    }

    if (!name) {
      showToast("Role name is required", 'error');
      return;
    }

    try {
      const payload = {
        name,
        description,
        is_active: isActive,
        permission_ids: Array.from(selectedPermissions),
      };

      if (!editingId) {
        const response = await api.post("/roles", payload);
        setRoles(prev => [...prev, response.data]);
        showToast("Role created successfully", 'success');
      } else {
        const response = await api.put(`/roles/${editingId}`, payload);
        setRoles(prev => prev.map(r => r.id === editingId ? response.data : r));
        showToast("Role updated successfully", 'success');
      }

      closeModal();
    } catch (e) {
      console.error("Save error:", e);
      const errorMessage = e?.response?.data?.detail || e?.message || "Save failed";
      showToast(errorMessage, 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setSelectedPermissions(new Set());
    setPermissionSearch("");
    setModuleFilter("all");
  }

  function startEdit(role) {
    if (!hasPermission("roles.update")) {
      showToast("Permission denied", 'error');
      return;
    }
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description || "");
    setIsActive(!!role.is_active);
    setSelectedPermissions(new Set((role.permissions || []).map(p => p.id)));
    setShowModal(true);
  }

  async function handleToggleStatus(id, currentStatus) {
    if (!hasPermission("roles.update")) {
      showToast("Permission denied", 'error');
      return;
    }
    try {
      const response = await api.put(`/roles/${id}`, { is_active: !currentStatus });
      setRoles(prev => prev.map(r => r.id === id ? response.data : r));
      showToast(`Role ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Status update failed", 'error');
    }
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch = !searchQuery || 
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && role.is_active) ||
      (filterStatus === "inactive" && !role.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Group permissions by group
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const group = perm.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  if (!hasPermission("roles.view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view roles.</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Role Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage roles and permissions</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
                <span className="text-sm font-medium text-gray-600">Total Roles</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{roles.length}</span>
              </div>
              {hasPermission("roles.create") && (
                <button 
                  type="button"
                  onClick={() => { setSearchQuery(""); setShowModal(true); }} 
                  className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200 text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Role
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
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
              Showing {filteredRoles.length} of {roles.length} roles
            </div>
          </div>
        </div>

        {/* Roles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-gray-600">Loading roles...</span>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No roles found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-200 flex flex-col">
                {/* Header Section */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {role.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{role.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          role.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {role.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {role.description || 'No description provided'}
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="p-6 flex-1">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Permissions</h4>
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                        {(role.permissions || []).length} total
                      </span>
                    </div>
                    
                    {(role.permissions || []).length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {role.permissions.map(perm => (
                          <div key={perm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {perm.label}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {perm.name}
                              </div>
                            </div>
                            <div className="ml-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                perm.group === 'Admin' ? 'bg-red-100 text-red-700' :
                                perm.group === 'User Management' ? 'bg-blue-100 text-blue-700' :
                                perm.group === 'Inventory' ? 'bg-green-100 text-green-700' :
                                perm.group === 'Vendor' ? 'bg-yellow-100 text-yellow-700' :
                                perm.group === 'Billing' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {perm.group || 'Other'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-2xl mb-2">🔒</div>
                        <div className="text-sm">No permissions assigned</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions Section */}
                <div className="p-6 pt-0 mt-auto">
                  <div className="flex gap-2">
                    {hasPermission("roles.update") && (
                      <button 
                        onClick={() => startEdit(role)} 
                        className="flex-1 px-4 py-2 text-sm font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 hover:border-cyan-300 transition-all duration-200 flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    {hasPermission("roles.update") && (
                      <button 
                        onClick={() => handleToggleStatus(role.id, role.is_active)} 
                        className={`flex-1 px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-200 flex items-center justify-center ${
                          role.is_active 
                            ? 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                            : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={role.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                        {role.is_active ? 'Deactivate' : 'Activate'}
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
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Role
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Role Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role name *</label>
                    <input 
                      type="text"
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" 
                      placeholder="Enter role name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" 
                      placeholder="Enter description"
                      rows={4}
                    />
                  </div>

                  {/* Selected Permissions Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">Selected Permissions</label>
                      <span className="text-xs text-gray-500">{selectedPermissions.size} selected</span>
                    </div>
                    
                    {selectedPermissions.size > 0 ? (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                        <div className="p-3 space-y-2">
                          {permissions.filter(p => selectedPermissions.has(p.id)).map(perm => (
                            <div key={perm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{perm.label}</div>
                                <div className="text-xs text-gray-500 truncate">{perm.name}</div>
                              </div>
                              <button 
                                onClick={() => togglePermission(perm.id)}
                                className="ml-2 text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                        <div className="text-2xl mb-2">🔒</div>
                        <div className="text-sm">No permissions selected</div>
                        <div className="text-xs mt-1">Use templates or select from the right panel</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Permissions ({permissions.length} total)
                    </label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const allPermissionIds = new Set(permissions.map(p => p.id));
                          setSelectedPermissions(allPermissionIds);
                        }}
                        className="text-xs px-2 py-1 text-green-600 bg-green-50 rounded hover:bg-green-100"
                      >
                        Select All
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSelectedPermissions(new Set())}
                        className="text-xs px-2 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Quick Role Templates */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Quick Role Templates:</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const adminPerms = permissions.filter(p => 
                            p.name.includes('create') || p.name.includes('update') || 
                            p.name.includes('delete') || p.name.includes('view')
                          ).map(p => p.id);
                          setSelectedPermissions(new Set(adminPerms));
                        }}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Admin
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const vendorPerms = permissions.filter(p => 
                            p.name.includes('vendor') || p.name.includes('view')
                          ).map(p => p.id);
                          setSelectedPermissions(new Set(vendorPerms));
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Vendor Manager
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const billingPerms = permissions.filter(p => 
                            p.name.includes('billing') || p.name.includes('invoice')
                          ).map(p => p.id);
                          setSelectedPermissions(new Set(billingPerms));
                        }}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Billing
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const orgPerms = permissions.filter(p => 
                            p.name.includes('organization') || p.name.includes('department')
                          ).map(p => p.id);
                          setSelectedPermissions(new Set(orgPerms));
                        }}
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        Organization Master
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const empPerms = permissions.filter(p => 
                            p.name.includes('view') && !p.name.includes('delete')
                          ).map(p => p.id);
                          setSelectedPermissions(new Set(empPerms));
                        }}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Employee
                      </button>
                    </div>
                  </div>

                  {/* Selected Permissions Count */}
                  <div className="mb-3 text-sm text-gray-600">
                    {selectedPermissions.size} permissions selected
                  </div>

                  {/* Search Permissions */}
                  <div className="mb-3">
                    <input 
                      type="text"
                      placeholder="Search modules or permissions..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Module Filter */}
                  <div className="mb-3">
                    <select 
                      value={moduleFilter}
                      onChange={(e) => setModuleFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Modules</option>
                      {Object.keys(groupedPermissions).sort().map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>

                  {/* Permissions List */}
                  <div className="max-h-80 overflow-y-auto border border-gray-300 rounded-lg bg-gray-50">
                    {Object.keys(groupedPermissions).sort().filter(group => {
                      const matchesModule = moduleFilter === "all" || group === moduleFilter;
                      const matchesSearch = !permissionSearch || 
                        group.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                        groupedPermissions[group].some(perm => 
                          perm.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                          perm.name.toLowerCase().includes(permissionSearch.toLowerCase())
                        );
                      return matchesModule && matchesSearch;
                    }).map(group => (
                      <div key={group} className="mb-4 last:mb-0">
                        <div className="bg-white px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {group}
                          </h4>
                          <button 
                            type="button"
                            onClick={() => {
                              const groupPermIds = groupedPermissions[group].map(p => p.id);
                              const allSelected = groupPermIds.every(id => selectedPermissions.has(id));
                              const newSelected = new Set(selectedPermissions);
                              if (allSelected) {
                                groupPermIds.forEach(id => newSelected.delete(id));
                              } else {
                                groupPermIds.forEach(id => newSelected.add(id));
                              }
                              setSelectedPermissions(newSelected);
                            }}
                            className="text-xs px-2 py-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                          >
                            {groupedPermissions[group].every(p => selectedPermissions.has(p.id)) ? 'Deselect Module' : 'Select Module'}
                          </button>
                        </div>
                        <div className="p-3 space-y-2">
                          {groupedPermissions[group].filter(perm => {
                            if (!permissionSearch) return true;
                            return perm.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                                   perm.name.toLowerCase().includes(permissionSearch.toLowerCase());
                          }).map(perm => (
                            <label key={perm.id} className="flex items-start p-2 rounded hover:bg-white transition-colors cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={selectedPermissions.has(perm.id)} 
                                onChange={() => togglePermission(perm.id)} 
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                              />
                              <div className="ml-3 min-w-0">
                                <div className="text-sm font-medium text-gray-900">{perm.label}</div>
                                <div className="text-xs text-gray-500">{perm.name}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t">
                <button 
                  onClick={closeModal} 
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {editingId ? 'Update Role' : 'Create Role'}
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
