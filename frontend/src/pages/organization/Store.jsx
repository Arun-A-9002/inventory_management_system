import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function Store() {
  const [stores, setStores] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", store_type: "", branch_id: "", is_central: false, description: "" });
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("store.view")) {
      loadStores();
      loadBranches();
    }
  }, []);

  async function loadBranches() {
    try {
      const res = await api.get("/branch/");
      setBranches(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadStores() {
    setLoading(true);
    try {
      const res = await api.get("/store/");
      setStores(res.data || []);
    } catch (e) {
      showToast("Failed to load stores", 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingId && !hasPermission("store.create")) return showToast("Permission denied", 'error');
    if (editingId && !hasPermission("store.edit")) return showToast("Permission denied", 'error');
    if (!form.name.trim()) return showToast("Store name required", 'error');

    try {
      const payload = { ...form, branch_id: form.branch_id ? Number(form.branch_id) : null };
      if (!editingId) {
        await api.post("/store/", payload);
        showToast("Store created successfully", 'success');
      } else {
        await api.put(`/store/${editingId}`, payload);
        showToast("Store updated successfully", 'success');
      }
      closeModal();
      loadStores();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Save failed", 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: "", store_type: "", branch_id: "", is_central: false, description: "" });
  }

  function startEdit(s) {
    if (!hasPermission("store.edit")) return showToast("Permission denied", 'error');
    setEditingId(s.id);
    setForm({ ...s, branch_id: s.branch?.id || "" });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!hasPermission("store.delete")) return showToast("Permission denied", 'error');
    if (!window.confirm("Delete this store?")) return;
    try {
      await api.delete(`/store/${id}`);
      showToast("Store deleted successfully", 'success');
      loadStores();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Delete failed", 'error');
    }
  }

  const filtered = stores.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.store_type?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!hasPermission("store.view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view stores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Store Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your organization's store locations</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
                <span className="text-sm font-medium text-gray-600">Total Stores</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{stores.length}</span>
              </div>
              {hasPermission("store.create") && (
                <button onClick={() => setShowModal(true)} className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Store
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search stores..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div className="text-sm text-gray-500">Showing {filtered.length} of {stores.length} stores</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No stores found</h3>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Central</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-sm text-gray-500">{s.description}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{s.store_type || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{s.branch?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${s.is_central ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {s.is_central ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {hasPermission("store.edit") && (
                            <button onClick={() => startEdit(s)} className="text-cyan-600 hover:text-cyan-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {hasPermission("store.delete") && (
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{editingId ? 'Edit Store' : 'Add Store'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Type</label><select value={form.store_type} onChange={e => setForm({...form, store_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"><option value="">Select</option><option value="Pharmacy">Pharmacy</option><option value="Warehouse">Warehouse</option><option value="General Store">General Store</option><option value="Biomedical">Biomedical</option><option value="Custom">Custom</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Branch</label><select value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"><option value="">Select Branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={form.is_central} onChange={e => setForm({...form, is_central: e.target.checked})} className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" /><span className="ml-2 text-sm font-medium text-gray-700">Is Central Store?</span></label></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" rows={3} /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
}
