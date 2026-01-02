import { useState, useEffect } from "react";
import api from "../../api";
import MasterDataHeader from "../../components/MasterDataHeader";

export default function Brand() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [form, setForm] = useState({
    brand_name: "",
    manufacturer_name: "",
    contact_number: "",
    email: "",
    website: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const res = await api.get("/brand/");
      setBrands(res.data || []);
    } catch (err) {
      console.error("Failed loading brands", err);
      alert("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.brand_name.trim()) return alert("Brand name is required");

    try {
      await api.post("/brand/", form);
      setForm({
        brand_name: "",
        manufacturer_name: "",
        contact_number: "",
        email: "",
        website: ""
      });
      setShowCreateForm(false);
      loadBrands();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditForm({ ...b });
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/brand/${editingId}`, editForm);
      setEditingId(null);
      loadBrands();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this brand?")) return;

    try {
      await api.delete(`/brand/${id}`);
      loadBrands();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.manufacturer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Create Brand Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Brand</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.brand_name}
                onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter brand name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer Name</label>
              <input
                type="text"
                value={form.manufacturer_name}
                onChange={(e) => setForm({ ...form, manufacturer_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter manufacturer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <input
                type="tel"
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter contact number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter website URL"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create Brand
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
        title="Brand Management"
        subtitle="Manage product brands and manufacturer information."
        onCreateClick={() => setShowCreateForm(true)}
        createButtonText="Create Brand"
      />

      {/* Brand List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Brand List</h2>
              <p className="text-sm text-gray-500 mt-1">All brands and manufacturers in the system.</p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search brands..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading...</td></tr>
              ) : filteredBrands.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No brands found</td></tr>
              ) : (
                filteredBrands.map((brand, index) => (
                  <tr key={brand.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{brand.brand_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{brand.manufacturer_name || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {brand.contact_number && (
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="mr-1">📞</span>
                            {brand.contact_number}
                          </div>
                        )}
                        {brand.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="mr-1">✉️</span>
                            {brand.email}
                          </div>
                        )}
                        {brand.website && (
                          <div className="flex items-center text-xs text-blue-600">
                            <span className="mr-1">🌐</span>
                            {brand.website}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(brand)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1 rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(brand.id)}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Brand</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.brand_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer Name</label>
                <input
                  type="text"
                  value={editForm.manufacturer_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, manufacturer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                <input
                  type="tel"
                  value={editForm.contact_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={editForm.website || ""}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
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
