import { useEffect, useState } from "react";
import api from "../api";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState(new Set());

  // edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedPerms, setEditSelectedPerms] = useState(new Set());

  // UI controls
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadAll();
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

  const togglePerm = (id, set) => {
    const copy = new Set(set);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    return copy;
  };

  const handleCreate = async () => {
    if (!name.trim()) return alert("Role name is required");
    try {
      const payload = { name: name.trim(), description: description.trim(), permission_ids: Array.from(selectedPerms) };
      await api.post("/roles", payload);
      setName(""); setDescription(""); setSelectedPerms(new Set());
      await loadAll();
    } catch (e) {
      console.error("create role failed", e);
      alert(e?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (role) => {
    setEditingId(role.id);
    setEditName(role.name || "");
    setEditDescription(role.description || "");
    setEditSelectedPerms(new Set((role.permissions || []).map(p => p.id)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName(""); setEditDescription(""); setEditSelectedPerms(new Set());
  };

  const handleUpdate = async () => {
    if (!editName.trim()) return alert("Role name required");
    try {
      await api.put(`/roles/${editingId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        permission_ids: Array.from(editSelectedPerms),
      });
      cancelEdit();
      await loadAll();
    } catch (e) {
      console.error("update failed", e);
      alert(e?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this role?")) return;
    try {
      await api.delete(`/roles/${id}`);
      await loadAll();
    } catch (e) {
      console.error("delete failed", e);
      alert("Delete failed");
    }
  };

  // filtering
  const filtered = roles.filter(r => {
    if (filter === "with-perms" && (!r.permissions || r.permissions.length === 0)) return false;
    if (filter === "no-perms" && (r.permissions && r.permissions.length > 0)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* header */}
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

      {/* content */}
      <div className="grid grid-cols-12 gap-6">
        {/* left create/edit */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-3">{editingId ? "Edit role" : "Create role"}</h2>
            <label className="block text-sm font-medium text-slate-700">Role name *</label>
            <input value={editingId ? editName : name} onChange={(e) => editingId ? setEditName(e.target.value) : setName(e.target.value)} className="mt-2 mb-3 w-full rounded-lg border px-4 py-2" placeholder="e.g., OPD Doctor" />

            <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea value={editingId ? editDescription : description} onChange={(e) => editingId ? setEditDescription(e.target.value) : setDescription(e.target.value)} className="mt-2 mb-3 w-full rounded-lg border px-4 py-2" rows={3} />

            <div className="text-sm font-medium mb-2">Permissions <span className="text-xs text-slate-400">({permissions.length} total)</span></div>

            <div className="h-64 overflow-auto border rounded-md p-3 bg-slate-50">
              {permissions.map((p) => {
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

            <div className="mt-4 flex gap-2">
              {!editingId ? (
                <button onClick={handleCreate} className="rounded-full bg-emerald-600 text-white px-5 py-2">Create role</button>
              ) : (
                <>
                  <button onClick={handleUpdate} className="rounded-full bg-sky-600 text-white px-4 py-2">Save</button>
                  <button onClick={cancelEdit} className="rounded-full border px-4 py-2">Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* right list */}
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
                <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full px-2 py-1">
                  <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full ${filter === "all" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>All</button>
                  <button onClick={() => setFilter("with-perms")} className={`px-3 py-1 rounded-full ${filter === "with-perms" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>With permissions</button>
                  <button onClick={() => setFilter("no-perms")} className={`px-3 py-1 rounded-full ${filter === "no-perms" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>No permissions</button>
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
                        <td className="py-3">
                          <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm">{r.permissions?.length || 0} permissions</span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(r)} className="rounded-full px-3 py-1 bg-slate-900 text-white">Edit</button>
                            <button onClick={() => handleDelete(r.id)} className="rounded-full px-3 py-1 bg-red-500 text-white">Delete</button>
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

  // helper for toggling sets
  function toggleSet(prev, id) {
    const copy = new Set(prev);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    return copy;
  }
}
