import { useState, useEffect } from "react";
import api from "../../api";

export default function Store() {
  const [stores, setStores] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    store_type: "",
    branch_id: "",
    is_central_store: false,
    description: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadStores();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await api.get("/branch/");
      setBranches(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load branches");
    }
  };

  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await api.get("/store/");
      setStores(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return alert("Store name is required");

    try {
      await api.post("/store/", {
        ...form,
        branch_id: Number(form.branch_id),
      });

      setForm({
        name: "",
        store_type: "",
        branch_id: "",
        is_central_store: false,
        description: ""
      });

      loadStores();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ ...s, branch_id: s.branch?.id || "" });
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/store/${editingId}`, {
        ...editForm,
        branch_id: Number(editForm.branch_id),
      });

      setEditingId(null);
      loadStores();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this store?")) return;

    try {
      await api.delete(`/store/${id}`);
      loadStores();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER CARD */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Organization Structure</div>
          <h1 className="text-3xl font-semibold mt-2">Store / Inventory Point Management</h1>
          <p className="mt-2 opacity-90">Create and configure inventory storage locations.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">

            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Store</h2>

                {/* Fields */}
                <label className="block text-sm font-medium">Store Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <label className="block text-sm font-medium">Store Type *</label>
                <select
                  value={form.store_type}
                  onChange={(e) => setForm({ ...form, store_type: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="">Select</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="General Store">General Store</option>
                  <option value="Biomedical">Biomedical</option>
                  <option value="Custom">Custom</option>
                </select>

                <label className="block text-sm font-medium">Linked Branch *</label>
                <select
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="">Select a branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={form.is_central_store}
                    onChange={(e) =>
                      setForm({ ...form, is_central_store: e.target.checked })
                    }
                  />
                  <label>Is Central Store?</label>
                </div>

                <label className="block text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <button
                  onClick={handleCreate}
                  className="rounded-full bg-rose-600 text-white px-5 py-2"
                >
                  Create Store
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit Store</h2>

                <label className="block text-sm font-medium">Store Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <label className="block text-sm font-medium">Store Type *</label>
                <select
                  value={editForm.store_type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, store_type: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="">Select</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="General Store">General Store</option>
                  <option value="Biomedical">Biomedical</option>
                  <option value="Custom">Custom</option>
                </select>

                <label className="block text-sm font-medium">Linked Branch *</label>
                <select
                  value={editForm.branch_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, branch_id: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="">Select a branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={editForm.is_central_store}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_central_store: e.target.checked,
                      })
                    }
                  />
                  <label>Is Central Store?</label>
                </div>

                <label className="block text-sm font-medium">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={4}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="rounded-full bg-pink-600 text-white px-4 py-2"
                  >
                    Save
                  </button>

                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-full border px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">

            <h3 className="text-lg font-semibold">Store List</h3>
            <p className="text-sm text-slate-500 mb-4">List of all stores / inventory points.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Type</th>
                    <th className="py-3 text-left">Branch</th>
                    <th className="py-3 text-left">Central?</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-6 text-center">Loading...</td></tr>
                  ) : stores.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">No stores found</td></tr>
                  ) : (
                    stores.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{s.name}</td>
                        <td className="py-3">{s.store_type}</td>
                        <td className="py-3">{s.branch?.name || "-"}</td>
                        <td className="py-3">{s.is_central_store ? "Yes" : "No"}</td>

                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(s)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(s.id)}
                              className="text-sm px-3 py-1 rounded-full border text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
