// src/pages/Roles.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { hasPermission } from "../utils/permissions";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Toggle module permissions
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
      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (role) => {
    if (!hasPermission("roles.update")) return alert("Permission denied");
    setEditingId(role.id);
    setEditName(role.name || "");
    setEditDescription(role.description || "");
    setEditSelectedPerms(new Set((role.permissions || []).map(p => p.id)));
  };

  const handleUpdate = async () => {
    if (!hasPermission("roles.update")) return alert("Permission denied");

    try {
      await api.put(`/roles/${editingId}`, { name: editName.trim(), description: editDescription.trim(), permission_ids: Array.from(editSelectedPerms) });
      setEditingId(null);
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">User Management</div>
              <h1 className="text-3xl font-semibold mt-2">Roles</h1>
              <p className="mt-2 opacity-90">Group permissions into named roles and assign them to users.</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">Roles</span>
                <div className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">{roles.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* create/edit card */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            {hasPermission("roles.create") ? (
              <>
                <h2 className="text-xl font-semibold mb-3">{editingId ? "Edit role" : "Create role"}</h2>
                <label className="block text-sm font-medium text-slate-700">Role name *</label>
                <input value={editingId ? editName : name} onChange={(e)=> editingId ? setEditName(e.target.value) : setName(e.target.value)} className="mt-2 mb-3 w-full rounded-lg border px-4 py-2" placeholder="e.g., OPD Doctor" />

                <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
                <textarea value={editingId ? editDescription : description} onChange={(e)=> editingId ? setEditDescription(e.target.value) : setDescription(e.target.value)} className="mt-2 mb-3 w-full rounded-lg border px-4 py-2" rows={3} />

                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Permissions <span className="text-xs text-slate-400">({permissions.length} total)</span></div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(!!editingId)}
                      className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeselectAll(!!editingId)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search modules or permissions..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="h-64 overflow-auto border rounded-md p-3 bg-slate-50">
                  {Object.entries(
                    permissions.reduce((groups, p) => {
                      const group = p.group || 'Other';
                      if (!groups[group]) groups[group] = [];
                      groups[group].push(p);
                      return groups;
                    }, {})
                  ).filter(([groupName, groupPerms]) => {
                    if (!permissionSearch.trim()) return true;
                    const searchTerm = permissionSearch.toLowerCase();
                    return groupName.toLowerCase().includes(searchTerm) || 
                           groupPerms.some(p => 
                             p.label.toLowerCase().includes(searchTerm) || 
                             p.name.toLowerCase().includes(searchTerm)
                           );
                  }).map(([groupName, groupPerms]) => (
                    <div key={groupName} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-slate-600 uppercase">{groupName}</div>
                        <button
                          type="button"
                          onClick={() => handleModuleToggle(groupPerms, !!editingId)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {groupPerms.every(p => (editingId ? editSelectedPerms.has(p.id) : selectedPerms.has(p.id))) ? 'Deselect' : 'Select'} Module
                        </button>
                      </div>
                      {groupPerms.filter(p => {
                        if (!permissionSearch.trim()) return true;
                        const searchTerm = permissionSearch.toLowerCase();
                        return p.label.toLowerCase().includes(searchTerm) || 
                               p.name.toLowerCase().includes(searchTerm);
                      }).map(p => {
                        const checked = editingId ? editSelectedPerms.has(p.id) : selectedPerms.has(p.id);
                        return (
                          <label key={p.id} className="flex items-start gap-3 p-2 rounded hover:bg-white/50">
                            <input type="checkbox" checked={checked} onChange={() => {
                              if (editingId) setEditSelectedPerms(prev => toggleSet(prev, p.id));
                              else setSelectedPerms(prev => toggleSet(prev, p.id));
                            }} />
                            <div>
                              <div className="font-medium">{p.label}</div>
                              <div className="text-xs text-slate-400">{p.name}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  {!editingId ? (
                    <button onClick={handleCreate} className="rounded-full bg-emerald-600 text-white px-5 py-2">Create role</button>
                  ) : (
                    <>
                      <button onClick={handleUpdate} className="rounded-full bg-sky-600 text-white px-4 py-2">Save</button>
                      <button onClick={()=>{ setEditingId(null); }} className="rounded-full border px-4 py-2">Cancel</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">You do not have permission to create or edit roles.</div>
            )}
          </div>
        </div>

        {/* list */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Role list</h3>
                <p className="text-sm text-slate-500">Overview of roles and attached permissions.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-full px-3 py-1">
                  <input placeholder="Search by role name / description" value={query} onChange={(e)=>setQuery(e.target.value)} className="bg-transparent outline-none px-2 text-sm" />
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
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

            <div className="mt-4 text-sm text-slate-500">Showing {filtered.length} role{filtered.length!==1 ? "s": ""}.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
