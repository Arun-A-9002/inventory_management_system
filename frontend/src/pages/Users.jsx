// src/pages/Users.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { hasPermission } from "../utils/permissions";

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
  const [departmentId, setDepartmentId] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [editingId, setEditingId] = useState(null);

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
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(id) {
    const copy = new Set(selectedRoles);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    setSelectedRoles(copy);
  }

  async function handleCreate() {
    if (!editingId && !hasPermission("users.create")) return alert("Permission denied");
    if (editingId && !hasPermission("users.update")) return alert("Permission denied");

    if (!fullName || !email || (!editingId && !password)) return alert("Name, email and password required");

    try {
      const payload = {
        full_name: fullName,
        email,
        password: editingId ? undefined : password,
        department_id: departmentId,
        is_doctor: false,
        is_active: isActive,
        role_ids: Array.from(selectedRoles),
      };

      if (!editingId) {
        await api.post("/users", payload);
      } else {
        await api.put(`/users/${editingId}`, { ...payload, password: password || undefined });
      }

      closeModal();
      await loadAll();
    } catch (e) {
      console.error("Full error:", e);
      alert(e?.response?.data?.detail || "Save failed");
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFullName(""); setEmail(""); setPassword("");
    setDepartmentId(null); setIsActive(true); setSelectedRoles(new Set());
  }

  function startEdit(u) {
    if (!hasPermission("users.update")) return alert("Permission denied");
    setEditingId(u.id);
    setFullName(u.full_name);
    setEmail(u.email);
    setDepartmentId(u.department_id);
    setIsActive(!!u.is_active);
    setSelectedRoles(new Set((u.roles || []).map(r => r.id)));
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!hasPermission("users.delete")) return alert("Permission denied");
    if (!window.confirm("Delete user?")) return;
    try {
      await api.delete(`/users/${id}`);
      await loadAll();
    } catch (e) {
      console.error(e);
      alert("Delete failed");
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
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">User Management</h1>
              <p className="text-gray-600 mt-1">Manage system users, roles, and access permissions</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Total Users</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{users.length}</span>
              </div>
              {hasPermission("users.create") && (
                <button 
                  onClick={() => setShowModal(true)} 
                  className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200"
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

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map(user => (
              <div key={user.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{user.full_name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Department:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {user.department ? user.department.name : 'No department'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Roles:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(user.roles || []).length > 0 ? (
                          user.roles.map(role => (
                            <span key={role.id} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
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
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingId ? 'Edit User' : 'Add New User'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input 
                    type="text"
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
                      placeholder="Enter password"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select 
                    value={departmentId || ''} 
                    onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : null)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Roles ({roles.length} available)
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-start p-2 rounded hover:bg-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedRoles.has(role.id)} 
                          onChange={() => toggleRole(role.id)} 
                          className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                          {role.description && (
                            <div className="text-xs text-gray-500">{role.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
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
    </div>
  );
}