// src/pages/Department.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { hasPermission } from "../utils/permissions";

export default function Department() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // eslint-disable-next-line no-unused-vars
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (hasPermission("departments.view")) loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/departments");
      setDepartments(res.data || []);
    } catch (e) {
      console.error("Failed loading departments", e);
      alert("Failed to load departments (check console).");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!hasPermission("departments.create")) return alert("Permission denied");
    if (!name.trim()) return alert("Department name is required");

    try {
      await api.post("/departments", { name: name.trim(), description: description.trim() });
      setName(""); setDescription("");
      await loadDepartments();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (d) => {
    if (!hasPermission("departments.update")) return alert("Permission denied");
    setEditingId(d.id);
    setEditName(d.name || "");
    setEditDescription(d.description || "");
  };

  const handleUpdate = async () => {
    if (!hasPermission("departments.update")) return alert("Permission denied");
    if (!editName.trim()) return alert("Name required");

    try {
      await api.put(`/departments/${editingId}`, { name: editName.trim(), description: editDescription.trim() });
      setEditingId(null);
      await loadDepartments();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission("departments.delete")) return alert("Permission denied");
    if (!window.confirm("Delete this department?")) return;

    try {
      await api.delete(`/departments/${id}`);
      await loadDepartments();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Delete failed");
    }
  };

  // client-side filter + search
  const filtered = departments
    .filter((d) => {
      if (filter === "with-desc") return !!d.description;
      if (filter === "without-desc") return !d.description;
      return true;
    })
    .filter((d) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (d.name || "").toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q);
    });

  // VIEW guard
  if (!hasPermission("departments.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view departments.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">Inventory Management Structure</div>
              <h1 className="text-3xl font-semibold mt-2">Department Management</h1>
              <p className="mt-2 max-w-xl opacity-90">Organize your inventory by departments.</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">Departments</span>
                <div className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">{departments.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* left: create/edit card (show create only if permitted) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            {hasPermission("departments.create") ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create department</h2>
                <label className="block text-sm font-medium text-slate-700">Department name *</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} className="mt-2 mb-3 w-full rounded-lg border px-4 py-2" placeholder="e.g., Warehouse" />
                <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
                <textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="mt-2 mb-4 w-full rounded-lg border px-4 py-2" rows={4} />
                <div className="flex gap-3">
                  <button onClick={handleCreate} className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2">Create department</button>
                  <button onClick={()=>{setName(""); setDescription("");}} className="inline-flex items-center justify-center rounded-full border px-4 py-2">Reset</button>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">You do not have permission to create departments.</div>
            )}

            {/* Edit inline area (only visible when editing and user has update perm) */}
            {editingId && hasPermission("departments.update") && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Editing</h3>
                <input value={editName} onChange={(e)=>setEditName(e.target.value)} className="mb-3 w-full rounded-lg border px-4 py-2" />
                <textarea value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} className="mb-3 w-full rounded-lg border px-4 py-2" rows={3} />
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="rounded-full bg-sky-600 text-white px-4 py-2">Save</button>
                  <button onClick={()=>{setEditingId(null); setEditName(""); setEditDescription("");}} className="rounded-full border px-4 py-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* right: list */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Department list</h3>
                <p className="text-sm text-slate-500">Configured departments for your organization</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-full px-3 py-1">
                  <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by name or description" className="bg-transparent outline-none px-2 text-sm" />
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Description</th>
                    <th className="py-3 text-left">Active</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No departments found</td></tr>
                  ) : (
                    filtered.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3 font-medium">{d.name}</td>
                        <td className="py-3">{d.description || "-"}</td>
                        <td className="py-3">{d.is_active ? "Active" : "Inactive"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {hasPermission("departments.update") && (
                              <button onClick={()=>startEdit(d)} className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100">Edit</button>
                            )}
                            {hasPermission("departments.delete") && (
                              <button onClick={()=>handleDelete(d.id)} className="text-sm px-3 py-1 rounded-full border text-red-600 hover:bg-red-50">Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-slate-500">Showing {filtered.length} department{filtered.length !== 1 ? "s" : ""}.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
