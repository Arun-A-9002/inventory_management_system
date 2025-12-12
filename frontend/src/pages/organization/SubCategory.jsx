import { useState, useEffect } from "react";
import api from "../../api";

export default function SubCategory() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    description: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get("/category/");
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed loading categories", err);
      alert("Failed to load categories");
    }
  };

  const loadSubcategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/subcategory/");
      setSubcategories(res.data || []);
    } catch (err) {
      console.error("Failed loading subcategories", err);
      alert("Failed to load subcategories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.category_id) return alert("Select a category");
    if (!form.name.trim()) return alert("Sub-category name is required");

    try {
      await api.post("/subcategory/", {
        ...form,
        category_id: Number(form.category_id),
      });

      setForm({ category_id: "", name: "", description: "" });
      loadSubcategories();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (sc) => {
    setEditingId(sc.id);
    setEditForm({
      id: sc.id,
      category_id: sc.category?.id || "",
      name: sc.name,
      description: sc.description,
    });
  };

  const handleUpdate = async () => {
    if (!editForm.category_id) return alert("Select a category");
    if (!editForm.name.trim()) return alert("Name required");

    try {
      await api.put(`/subcategory/${editingId}`, {
        ...editForm,
        category_id: Number(editForm.category_id),
      });

      setEditingId(null);
      loadSubcategories();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sub-category?")) return;

    try {
      await api.delete(`/subcategory/${id}`);
      loadSubcategories();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-yellow-600 to-orange-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Master Data Setup</div>
          <h1 className="text-3xl font-semibold mt-2">Sub-category Management</h1>
          <p className="mt-2 opacity-90">Organize products under categories using sub-categories.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">

            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Sub-category</h2>

                <label className="block text-sm font-medium">Category *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <label className="block text-sm font-medium">Sub-category Name *</label>
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
                  className="rounded-full bg-orange-600 text-white px-5 py-2"
                >
                  Create Sub-category
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit Sub-category</h2>

                <label className="block text-sm font-medium">Category *</label>
                <select
                  value={editForm.category_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category_id: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <label className="block text-sm font-medium">Sub-category Name *</label>
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
                    className="rounded-full bg-yellow-600 text-white px-4 py-2"
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

            <h3 className="text-lg font-semibold">Sub-category List</h3>
            <p className="text-sm text-slate-500 mb-4">
              List of all sub-categories under each category.
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Category</th>
                    <th className="py-3 text-left">Sub-category</th>
                    <th className="py-3 text-left">Description</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
                  ) : subcategories.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No sub-categories found</td></tr>
                  ) : (
                    subcategories.map((sc, idx) => (
                      <tr key={sc.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{sc.category?.name || "-"}</td>
                        <td className="py-3">{sc.name}</td>
                        <td className="py-3">{sc.description || "-"}</td>

                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(sc)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(sc.id)}
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
