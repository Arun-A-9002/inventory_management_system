import { useState, useEffect } from "react";
import api from "../../api";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/category/");
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return alert("Category name is required");

    try {
      await api.post("/category/", form);
      setForm({ name: "", description: "" });
      loadCategories();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/category/${editingId}`, editForm);
      setEditingId(null);
      loadCategories();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    try {
      await api.delete(`/category/${id}`);
      loadCategories();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-green-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Master Data Setup</div>
          <h1 className="text-3xl font-semibold mt-2">Category Management</h1>
          <p className="mt-2 opacity-90">Organize your products using categories.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Category</h2>

                <label className="block text-sm font-medium">Category Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <label className="block text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <button
                  onClick={handleCreate}
                  className="rounded-full bg-teal-600 text-white px-5 py-2"
                >
                  Create Category
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit Category</h2>

                <label className="block text-sm font-medium">Category Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

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
                    className="rounded-full bg-green-600 text-white px-4 py-2"
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

        {/* RIGHT — LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            
            <h3 className="text-lg font-semibold">Category List</h3>
            <p className="text-sm text-slate-500 mb-4">All product categories created in the system.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Description</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-6">Loading...</td></tr>
                  ) : categories.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-slate-500">No categories found</td></tr>
                  ) : (
                    categories.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{c.name}</td>
                        <td className="py-3">{c.description || "-"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(c)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(c.id)}
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
