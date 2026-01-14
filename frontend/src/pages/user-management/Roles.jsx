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

  async function handleDelete(id) {
    if (!hasPermission("roles.delete")) {
      showToast("Permission denied", 'error');
      return;
    }
    if (!window.confirm("Delete role?")) return;
    try {
      await api.delete(`/roles/${id}`);
      showToast("Role deleted successfully", 'success');
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Delete failed", 'error');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-lg flex-shrink-0">
                        {role.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{role.name}</h3>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                      role.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Description:</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {role.description || 'No description provided'}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Permissions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(role.permissions || []).length > 0 ? (
                          <>
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                              {role.permissions.length} permissions
                            </span>
                            {role.permissions.slice(0, 3).map(perm => (
                              <span key={perm.id} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {perm.label}
                              </span>
                            ))}
                            {role.permissions.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                +{role.permissions.length - 3} more
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-6 pt-4 border-t">
                    {hasPermission("roles.update") && (
                      <button 
                        onClick={() => startEdit(role)} 
                        className="flex-1 px-3 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors duration-200"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission("roles.delete") && (
                      <button 
                        onClick={() => handleDelete(role.id)} 
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
                  {editingId ? 'Edit Role' : 'Add New Role'}
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

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
                  <input 
                    type="text"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                    placeholder="Enter role name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={e => setIsActive(e.target.checked)} 
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Active Role</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions ({permissions.length} available)
                </label>
                <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                  {Object.keys(groupedPermissions).sort().map(group => (
                    <div key={group} className="mb-4 last:mb-0">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 sticky top-0 bg-gray-50 py-1">
                        {group}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupedPermissions[group].map(perm => (
                          <label key={perm.id} className="flex items-start p-2 rounded hover:bg-white transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedPermissions.has(perm.id)} 
                              onChange={() => togglePermission(perm.id)} 
                              className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 flex-shrink-0"
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

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors duration-200"
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
