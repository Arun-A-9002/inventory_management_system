import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function Company() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", gst_number: "", address: "", contact_person: "", email: "", phone: "", logoFile: null });
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("company.view")) loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    try {
      const res = await api.get("/company/");
      setCompanies(res.data || []);
    } catch (e) {
      console.error(e);
      showToast("Failed to load companies", 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingId && !hasPermission("company.create")) return showToast("Permission denied", 'error');
    if (editingId && !hasPermission("company.edit")) return showToast("Permission denied", 'error');

    const required = ['name', 'code', 'gst_number', 'address', 'contact_person', 'email', 'phone'];
    const missing = required.filter(f => !form[f]?.trim());
    if (missing.length) return showToast(`Required: ${missing.join(', ')}`, 'error');

    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => { if (k !== 'logoFile' && form[k]) formData.append(k, form[k]); });
      if (form.logoFile) formData.append('logo', form.logoFile);

      if (!editingId) {
        await api.post("/company/", formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast("Company created successfully", 'success');
      } else {
        await api.put(`/company/${editingId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast("Company updated successfully", 'success');
      }
      closeModal();
      loadCompanies();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Save failed", 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: "", code: "", gst_number: "", address: "", contact_person: "", email: "", phone: "", logoFile: null });
  }

  function startEdit(c) {
    if (!hasPermission("company.edit")) return showToast("Permission denied", 'error');
    setEditingId(c.id);
    setForm({ ...c, logoFile: null });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!hasPermission("company.delete")) return showToast("Permission denied", 'error');
    if (!window.confirm("Delete this company?")) return;
    try {
      await api.delete(`/company/${id}`);
      showToast("Company deleted successfully", 'success');
      loadCompanies();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Delete failed", 'error');
    }
  }

  const filtered = companies.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!hasPermission("company.view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view companies.</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Company Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your organization's company information</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
                <span className="text-sm font-medium text-gray-600">Total Companies</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{companies.length}</span>
              </div>
              {hasPermission("company.create") && (
                <button onClick={() => {
                  if (companies.length > 0) {
                    showToast("Only one company allowed. Delete existing company first.", 'error');
                  } else {
                    setShowModal(true);
                  }
                }} className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Company
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
              <input type="text" placeholder="Search companies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div className="text-sm text-gray-500">Showing {filtered.length} of {companies.length} companies</div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No companies found</h3>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="block sm:hidden">
              {/* Mobile Card Layout */}
              <div className="divide-y divide-gray-200">
                {filtered.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {c.logo_path ? (
                          <img src={`${api.defaults.baseURL}/company/${c.logo_path}`} alt="Logo" className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Logo</div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{c.name}</h3>
                          <p className="text-sm text-gray-500">{c.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission("company.edit") && (
                          <button onClick={() => startEdit(c)} className="text-cyan-600 hover:text-cyan-900 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {hasPermission("company.delete") && (
                          <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">GST:</span> {c.gst_number}</div>
                      <div><span className="text-gray-500">Contact:</span> {c.contact_person}</div>
                      <div><span className="text-gray-500">Email:</span> {c.email}</div>
                      <div><span className="text-gray-500">Phone:</span> {c.phone}</div>
                      <div className="col-span-2"><span className="text-gray-500">Address:</span> {c.address}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden sm:block overflow-x-auto">
              {/* Desktop Table Layout */}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {c.logo_path ? (
                          <img src={`${api.defaults.baseURL}/company/${c.logo_path}`} alt="Logo" className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Logo</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{c.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.gst_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.contact_person}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.address}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {hasPermission("company.edit") && (
                            <button onClick={() => startEdit(c)} className="text-cyan-600 hover:text-cyan-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {hasPermission("company.delete") && (
                            <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">
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
                <h3 className="text-xl font-semibold text-gray-900">{editingId ? 'Edit Company' : 'Add Company'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Code *</label><input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">GST *</label><input type="text" value={form.gst_number} onChange={e => setForm({...form, gst_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label><input type="text" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Address *</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" rows={2} /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Logo</label><input type="file" accept="image/*" onChange={e => setForm({...form, logoFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
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
