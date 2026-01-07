import { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";

export default function Store() {
  const [stores, setStores] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    store_type: "",
    branch_id: "",
    is_central: false,
    description: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (hasPermission("store.view")) {
      loadStores();
      loadBranches();
    }
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
    if (!hasPermission("store.create")) return alert("Permission denied");
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
        is_central: false,
        description: ""
      });

      loadStores();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (s) => {
    if (!hasPermission("store.edit")) return alert("Permission denied");
    setEditingId(s.id);
    setEditForm({ ...s, branch_id: s.branch?.id || "" });
  };

  const handleUpdate = async () => {
    if (!hasPermission("store.edit")) return alert("Permission denied");
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
    if (!hasPermission("store.delete")) return alert("Permission denied");
    if (!window.confirm("Delete this store?")) return;

    try {
      await api.delete(`/store/${id}`);
      loadStores();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  if (!hasPermission("store.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view stores.</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT CARD — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Store</h2>
                {!hasPermission("store.create") ? (
                  <div className="text-sm text-slate-500">You do not have permission to create stores.</div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-700">STORE NAME</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-700">STORE TYPE</label>
                      <select
                        value={form.store_type}
                        onChange={(e) => setForm({ ...form, store_type: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                      >
                        <option value="">Select</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="General Store">General Store</option>
                        <option value="Biomedical">Biomedical</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-700">LINKED BRANCH</label>
                      <select
                        value={form.branch_id}
                        onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                      >
                        <option value="">Select a branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.is_central}
                          onChange={(e) => setForm({ ...form, is_central: e.target.checked })}
                        />
                        <label className="text-sm font-medium text-slate-700">Is Central Store?</label>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-700">DESCRIPTION</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                      />
                    </div>
                    <button
                      onClick={handleCreate}
                      disabled={!hasPermission("store.create")}
                      className="mt-3 inline-flex items-center justify-center rounded-full px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Create Store
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-3">Edit Store</h2>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700">STORE NAME</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-4 py-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700">STORE TYPE</label>
                  <select
                    value={editForm.store_type}
                    onChange={(e) => setEditForm({ ...editForm, store_type: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-4 py-2"
                  >
                    <option value="">Select</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="General Store">General Store</option>
                    <option value="Biomedical">Biomedical</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700">LINKED BRANCH</label>
                  <select
                    value={editForm.branch_id}
                    onChange={(e) => setEditForm({ ...editForm, branch_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-4 py-2"
                  >
                    <option value="">Select a branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_central}
                      onChange={(e) => setEditForm({ ...editForm, is_central: e.target.checked })}
                    />
                    <label className="text-sm font-medium text-slate-700">Is Central Store?</label>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700">DESCRIPTION</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border px-4 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="rounded-full bg-purple-600 text-white px-4 py-2"
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

        {/* RIGHT SIDE — LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Store Directory</h3>
              <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's store information</p>
            </div>
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Store</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Central</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : stores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No stores registered
                        </td>
                      </tr>
                    ) : (
                      stores.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-center">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-sm text-gray-600">{s.description}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {s.store_type || 'No type'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">{s.branch?.name || '-'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${
                              s.is_central ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {s.is_central ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center space-x-1">
                              {hasPermission("store.edit") && (
                                <button onClick={() => startEdit(s)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">
                                  Edit
                                </button>
                              )}
                              {hasPermission("store.delete") && (
                                <button onClick={() => handleDelete(s.id)} className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50">
                                  Delete
                                </button>
                              )}
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
    </div>
  );
}
