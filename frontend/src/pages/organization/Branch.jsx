import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function Branch() {
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ company_id: "", name: "", code: "", address: "", city: "", state: "", country: "", pincode: "" });
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("branch.view")) {
      loadBranches();
      loadCompanies();
    }
  }, []);

  async function loadCompanies() {
    try {
      const res = await api.get("/company/");
      setCompanies(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadBranches() {
    setLoading(true);
    try {
      const res = await api.get("/branch/");
      setBranches(res.data || []);
    } catch (e) {
      showToast("Failed to load branches", 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingId && !hasPermission("branch.create")) return showToast("Permission denied", 'error');
    if (editingId && !hasPermission("branch.edit")) return showToast("Permission denied", 'error');
    if (!form.name.trim()) return showToast("Branch name required", 'error');
    if (!form.company_id) return showToast("Company required", 'error');

    try {
      const payload = { ...form, company_id: parseInt(form.company_id) };
      if (!editingId) {
        await api.post("/branch/", payload);
        showToast("Branch created successfully", 'success');
      } else {
        await api.put(`/branch/${editingId}`, payload);
        showToast("Branch updated successfully", 'success');
      }
      closeModal();
      loadBranches();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Save failed", 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ company_id: "", name: "", code: "", address: "", city: "", state: "", country: "", pincode: "" });
  }

  function startEdit(b) {
    if (!hasPermission("branch.edit")) return showToast("Permission denied", 'error');
    setEditingId(b.id);
    setForm({ ...b, company_id: b.company?.id || "" });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!hasPermission("branch.delete")) return showToast("Permission denied", 'error');
    if (!window.confirm("Delete this branch?")) return;
    try {
      await api.delete(`/branch/${id}`);
      showToast("Branch deleted successfully", 'success');
      loadBranches();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Delete failed", 'error');
    }
  }

  const filtered = branches.filter(b => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.city?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!hasPermission("branch.view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view branches.</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Branch Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your organization's branch locations</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
                <span className="text-sm font-medium text-gray-600">Total Branches</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{branches.length}</span>
              </div>
              {hasPermission("branch.create") && (
                <button onClick={() => setShowModal(true)} className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Branch
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
              <input type="text" placeholder="Search branches..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div className="text-sm text-gray-500">Showing {filtered.length} of {branches.length} branches</div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No branches found</h3>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pincode</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{b.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.code || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.company?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.address || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.city || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.state || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.country || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{b.pincode || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {hasPermission("branch.edit") && (
                            <button onClick={() => startEdit(b)} className="text-cyan-600 hover:text-cyan-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {hasPermission("branch.delete") && (
                            <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-900">
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
                <h3 className="text-xl font-semibold text-gray-900">{editingId ? 'Edit Branch' : 'Add Branch'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Company *</label><select value={form.company_id} onChange={e => setForm({...form, company_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"><option value="">Select Company</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Code</label><input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" rows={2} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">City</label><input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">State</label><input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Country</label><input type="text" value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label><input type="text" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast.message} type={toast.isVisible} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
}
