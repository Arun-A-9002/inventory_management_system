// src/pages/Roles.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { hasPermission } from "../utils/permissions";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState(new Set());

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedPerms, setEditSelectedPerms] = useState(new Set());

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    if (hasPermission("roles.view")) loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([api.get("/roles/permissions"), api.get("/roles")]);
      setPermissions(pRes.data || []);
      setRoles(rRes.data || []);
    } catch (e) {
      console.error("load failed", e);
      alert("Failed to load roles/permissions");
    } finally {
      setLoading(false);
    }
  }

  function toggleSet(prev, id) {
    const copy = new Set(prev);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    return copy;
  }

  // Select all permissions
  const handleSelectAll = (isEdit = false) => {
    const allPermIds = permissions.map(p => p.id);
    if (isEdit) {
      setEditSelectedPerms(new Set(allPermIds));
    } else {
      setSelectedPerms(new Set(allPermIds));
    }
  };

  // Deselect all permissions
  const handleDeselectAll = (isEdit = false) => {
    if (isEdit) {
      setEditSelectedPerms(new Set());
    } else {
      setSelectedPerms(new Set());
    }
  };

  // Apply role template
  const applyRoleTemplate = (templateName, isEdit = false) => {
    const roleTemplates = {
      'Admin': permissions.map(p => p.id),
      'Vendor Manager': permissions.filter(p => 
        p.group?.includes('Vendor') || p.group?.includes('Purchase') || p.group?.includes('GRN') || 
        p.name.includes('vendor') || p.name.includes('purchase') || p.name.includes('grn')
      ).map(p => p.id),
      'Billing': permissions.filter(p => 
        p.group?.includes('Billing') || p.name.includes('billing') || p.name.includes('invoice')
      ).map(p => p.id),
      'Organization Master': permissions.filter(p => 
        (p.group?.includes('Organization') || p.group?.includes('Master Data') || p.group?.includes('Item Master') || 
         p.group?.includes('Vendor') || p.group?.includes('Users') || p.group?.includes('Purchase') || 
         p.group?.includes('Stock Ledger') || p.group?.includes('External Transfer') || p.group?.includes('Damaged Returns') || 
         p.name.includes('company') || p.name.includes('branch')) && p.name.includes('view')
      ).map(p => p.id),
      'Employee': permissions.filter(p => 
        p.name.includes('view') && !p.name.includes('delete') && !p.name.includes('create')
      ).map(p => p.id)
    };
    
    const selectedIds = roleTemplates[templateName] || [];
    if (isEdit) {
      setEditSelectedPerms(new Set(selectedIds));
    } else {
      setSelectedPerms(new Set(selectedIds));
    }
  };
  const handleModuleToggle = (groupPerms, isEdit = false) => {
    const groupPermIds = groupPerms.map(p => p.id);
    const currentSet = isEdit ? editSelectedPerms : selectedPerms;
    const allSelected = groupPermIds.every(id => currentSet.has(id));
    
    if (allSelected) {
      // Deselect all in this module
      const newSet = new Set(currentSet);
      groupPermIds.forEach(id => newSet.delete(id));
      if (isEdit) {
        setEditSelectedPerms(newSet);
      } else {
        setSelectedPerms(newSet);
      }
    } else {
      // Select all in this module
      const newSet = new Set(currentSet);
      groupPermIds.forEach(id => newSet.add(id));
      if (isEdit) {
        setEditSelectedPerms(newSet);
      } else {
        setSelectedPerms(newSet);
      }
    }
  };

  const handleCreate = async () => {
    if (!hasPermission("roles.create")) return alert("Permission denied");
    if (!name.trim()) return alert("Role name required");

    try {
      await api.post("/roles", { name: name.trim(), description: description.trim(), permission_ids: Array.from(selectedPerms) });
      setName(""); setDescription(""); setSelectedPerms(new Set());
      setShowCreateModal(false);
      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Create failed");
    }
  };

  const openCreateModal = () => {
    setName("");
    setDescription("");
    setSelectedPerms(new Set());
    setPermissionSearch("");
    setModuleFilter("all");
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingId(null);
  };

  const startEdit = (role) => {
    if (!hasPermission("roles.update")) return alert("Permission denied");
    setEditingId(role.id);
    setEditName(role.name || "");
    setEditDescription(role.description || "");
    setEditSelectedPerms(new Set((role.permissions || []).map(p => p.id)));
    setPermissionSearch("");
    setModuleFilter("all");
    setShowCreateModal(true);
  };

  const handleUpdate = async () => {
    if (!hasPermission("roles.update")) return alert("Permission denied");

    try {
      await api.put(`/roles/${editingId}`, { name: editName.trim(), description: editDescription.trim(), permission_ids: Array.from(editSelectedPerms) });
      setEditingId(null);
      setShowCreateModal(false);
      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission("roles.delete")) return alert("Permission denied");
    if (!window.confirm("Delete this role?")) return;
    try {
      await api.delete(`/roles/${id}`);
      await loadAll();
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  const filtered = roles.filter(r => {
    if (filter === "with-perms") return r.permissions && r.permissions.length > 0;
    if (filter === "no-perms") return !r.permissions || r.permissions.length === 0;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
  });

  if (!hasPermission("roles.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view roles.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-500 p-4 sm:p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase opacity-80">User Management</div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-2">Roles</h1>
              <p className="mt-2 opacity-90 text-sm sm:text-base">Group permissions into named roles and assign them to users.</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium">Roles</span>
                  <div className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">{roles.length}</div>
                </div>
                {hasPermission("roles.create") && (
                  <button
                    onClick={openCreateModal}
                    className="bg-white text-emerald-600 px-4 py-2 rounded-full font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    <span className="hidden sm:inline">Create Role</span>
                    <span className="sm:hidden">Create</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role List */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Role list</h3>
            <p className="text-sm text-slate-500">Overview of roles and attached permissions.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-full px-3 py-1 w-full sm:w-auto">
              <input placeholder="Search by role name / description" value={query} onChange={(e)=>setQuery(e.target.value)} className="bg-transparent outline-none px-2 text-sm w-full" />
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="mt-6 hidden lg:block overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-sm text-slate-500 border-b">
                <th className="py-3 text-left">#</th>
                <th className="py-3 text-left">Role name</th>
                <th className="py-3 text-left">Description</th>
                <th className="py-3 text-left">Permissions</th>
                <th className="py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">No roles found</td></tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3">{idx+1}</td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">{r.description || "—"}</td>
                    <td className="py-3"><span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm">{r.permissions?.length || 0} permissions</span></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {hasPermission("roles.update") && <button onClick={()=>startEdit(r)} className="rounded-full px-3 py-1 bg-slate-900 text-white">Edit</button>}
                        {hasPermission("roles.delete") && <button onClick={()=>handleDelete(r.id)} className="rounded-full px-3 py-1 bg-red-500 text-white">Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-6">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-slate-500">No roles found</div>
          ) : (
            filtered.map((r, idx) => (
              <div key={r.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">{r.name}</h4>
                    <p className="text-sm text-slate-500 mt-1">{r.description || "No description"}</p>
                  </div>
                  <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0">
                    {r.permissions?.length || 0} perms
                  </span>
                </div>
                
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  {hasPermission("roles.update") && (
                    <button 
                      onClick={()=>startEdit(r)} 
                      className="flex-1 rounded-full px-3 py-2 bg-slate-900 text-white text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {hasPermission("roles.delete") && (
                    <button 
                      onClick={()=>handleDelete(r.id)} 
                      className="flex-1 rounded-full px-3 py-2 bg-red-500 text-white text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-sm text-slate-500">Showing {filtered.length} role{filtered.length!==1 ? "s": ""}.</div>
      </div>

      {/* Create/Edit Role Modal */}
      {(showCreateModal || editingId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">{editingId ? "Edit Role" : "Create Role"}</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role name *</label>
                <input 
                  value={editingId ? editName : name} 
                  onChange={(e)=> editingId ? setEditName(e.target.value) : setName(e.target.value)} 
                  className="w-full rounded-lg border px-4 py-2 mb-4" 
                  placeholder="e.g., OPD Doctor" 
                />

                <label className="block text-sm font-medium text-slate-700 mb-2">Description (optional)</label>
                <textarea 
                  value={editingId ? editDescription : description} 
                  onChange={(e)=> editingId ? setEditDescription(e.target.value) : setDescription(e.target.value)} 
                  className="w-full rounded-lg border px-4 py-2 mb-4" 
                  rows={3} 
                />
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">Permissions <span className="text-xs text-slate-400">({permissions.length} total)</span></div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(!!editingId)}
                      className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeselectAll(!!editingId)}
                      className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                {/* Role Templates */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-600 mb-2">Quick Role Templates:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Admin', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                      { name: 'Vendor Manager', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                      { name: 'Billing', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                      { name: 'Organization Master', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                      { name: 'Employee', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' }
                    ].map(template => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => applyRoleTemplate(template.name, !!editingId)}
                        className={`text-xs px-3 py-1 rounded ${template.color}`}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Search modules or permissions..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Modules</option>
                    {Object.keys(permissions.reduce((groups, p) => {
                      const group = p.group || 'Other';
                      if (!groups[group]) groups[group] = [];
                      return groups;
                    }, {})).sort().map(groupName => (
                      <option key={groupName} value={groupName}>{groupName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="mt-6">
              <div className="h-96 overflow-auto border rounded-lg p-4 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    permissions.reduce((groups, p) => {
                      const group = p.group || 'Other';
                      if (!groups[group]) groups[group] = [];
                      groups[group].push(p);
                      return groups;
                    }, {})
                  ).filter(([groupName, groupPerms]) => {
                    // Module filter
                    if (moduleFilter !== "all" && groupName !== moduleFilter) return false;
                    // Search filter
                    if (!permissionSearch.trim()) return true;
                    const searchTerm = permissionSearch.toLowerCase();
                    return groupName.toLowerCase().includes(searchTerm) || 
                           groupPerms.some(p => 
                             p.label.toLowerCase().includes(searchTerm) || 
                             p.name.toLowerCase().includes(searchTerm)
                           );
                  }).map(([groupName, groupPerms]) => (
                    <div key={groupName} className="bg-white rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-700">{groupName}</div>
                        <button
                          type="button"
                          onClick={() => handleModuleToggle(groupPerms, !!editingId)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {groupPerms.every(p => (editingId ? editSelectedPerms.has(p.id) : selectedPerms.has(p.id))) ? 'Deselect' : 'Select'} Module
                        </button>
                      </div>
                      <div className="space-y-2">
                        {groupPerms.filter(p => {
                          if (!permissionSearch.trim()) return true;
                          const searchTerm = permissionSearch.toLowerCase();
                          return p.label.toLowerCase().includes(searchTerm) || 
                                 p.name.toLowerCase().includes(searchTerm);
                        }).map(p => {
                          const checked = editingId ? editSelectedPerms.has(p.id) : selectedPerms.has(p.id);
                          return (
                            <label key={p.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={checked} 
                                onChange={() => {
                                  if (editingId) setEditSelectedPerms(prev => toggleSet(prev, p.id));
                                  else setSelectedPerms(prev => toggleSet(prev, p.id));
                                }}
                                className="mt-1"
                              />
                              <div className="text-sm">
                                <div className="font-medium text-slate-700">{p.label}</div>
                                <div className="text-xs text-slate-400">{p.name}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={closeModal} 
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              {!editingId ? (
                <button 
                  onClick={handleCreate} 
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Create Role
                </button>
              ) : (
                <button 
                  onClick={handleUpdate} 
                  className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                >
                  Update Role
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}