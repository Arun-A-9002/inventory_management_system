import { useState, useEffect } from "react";
import api from "../../api";
import MasterDataHeader from "../../components/MasterDataHeader";

export default function SubCategory() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      setShowCreateForm(false);
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

  const filteredSubcategories = subcategories.filter(subcategory =>
    subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcategory.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Create Sub Category Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Sub Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter subcategory name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter description"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create Sub Category
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <MasterDataHeader 
        title="Sub Category Management"
        subtitle="Create subcategories under main categories."
        onCreateClick={() => setShowCreateForm(true)}
        createButtonText="Create Sub Category"
      />

      {/* Sub Category List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sub Category List</h2>
              <p className="text-sm text-gray-500 mt-1">All subcategories organized under categories.</p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search subcategories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading...</td></tr>
              ) : filteredSubcategories.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No subcategories found</td></tr>
              ) : (
                filteredSubcategories.map((sc, idx) => (
                  <tr key={sc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {sc.category?.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sc.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{sc.description || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(sc)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1 rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(sc.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded-md transition-colors"
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

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Sub Category</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.category_id}
                  onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
