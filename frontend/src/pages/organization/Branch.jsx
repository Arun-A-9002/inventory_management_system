import { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";

export default function Branch() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    company_id: "",
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: ""
  });

  const [companies, setCompanies] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (hasPermission("branch.view")) {
      loadBranches();
      loadCompanies();
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const res = await api.get("/company/");
      setCompanies(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get("/branch/");
      setBranches(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!hasPermission("branch.create")) return alert("Permission denied");
    if (!form.name.trim()) return alert("Branch name is required");
    if (!form.company_id) return alert("Company is required");

    try {
      const payload = {
        ...form,
        company_id: parseInt(form.company_id)
      };
      await api.post("/branch/", payload);
      setForm({
        company_id: "",
        name: "",
        code: "",
        address: "",
        city: "",
        state: "",
        country: "",
        pincode: ""
      });
      loadBranches();
    } catch (err) {
      console.error(err);
      const errorMsg = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || "Create failed";
      alert(errorMsg);
    }
  };

  const startEdit = (b) => {
    if (!hasPermission("branch.edit")) return alert("Permission denied");
    setEditingId(b.id);
    setEditForm({ ...b });
  };

  const handleUpdate = async () => {
    if (!hasPermission("branch.edit")) return alert("Permission denied");
    try {
      await api.put(`/branch/${editingId}`, editForm);
      setEditingId(null);
      loadBranches();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission("branch.delete")) return alert("Permission denied");
    if (!window.confirm("Delete this branch?")) return;

    try {
      await api.delete(`/branch/${id}`);
      loadBranches();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  if (!hasPermission("branch.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view branches.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Branch Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your organization's branch locations</p>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
              <span className="text-sm font-medium text-gray-600">Total Branches</span>
              <span className="ml-2 text-lg font-bold text-gray-900">{branches.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* LEFT CARD — CREATE / EDIT */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
              {!editingId ? (
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Create Branch</h2>
                      <p className="text-sm text-gray-500">Add a new branch location</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {!hasPermission("branch.create") ? (
                    <div className="text-sm text-slate-500">You do not have permission to create branches.</div>
                  ) : (
                    <>
                      {Object.keys(form).map((key) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {key.replace("_", " ").toUpperCase()}
                            {(key === 'name' || key === 'company_id') && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {key === "company_id" ? (
                            <select
                              value={form[key]}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option value="">Select Company</option>
                              {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                  {company.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={form[key]}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder={`Enter ${key.replace("_", " ").toLowerCase()}`}
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleCreate}
                        disabled={!hasPermission("branch.create")}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Branch
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Edit Branch</h2>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {Object.keys(editForm).map((key) =>
                    key === "id" ? null : (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.replace("_", " ").toUpperCase()}
                        </label>
                        <input
                          value={editForm[key] || ""}
                          onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${key.replace("_", " ").toLowerCase()}`}
                        />
                      </div>
                    )
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleUpdate}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* RIGHT SIDE — LIST */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Branch Directory</h3>
                <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's branch information</p>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">#</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : branches.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                            No branches registered
                          </td>
                        </tr>
                      ) : (
                        branches.map((b, idx) => (
                          <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500 text-center">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{b.name}</div>
                              <div className="text-sm text-gray-600">{b.address}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {b.code || 'No code'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{b.city}</div>
                              <div className="text-xs text-gray-500">{b.state}, {b.country}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center space-x-2">
                                {hasPermission("branch.edit") && (
                                  <button 
                                    onClick={() => startEdit(b)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {hasPermission("branch.delete") && (
                                  <button 
                                    onClick={() => handleDelete(b.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
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

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {loading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : branches.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">No branches registered</div>
                ) : (
                  <div className="space-y-4 p-4">
                    {branches.map((b, idx) => (
                      <div key={b.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-sm">{b.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">{b.name}</h4>
                              <p className="text-xs text-gray-500">#{idx + 1}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded flex-shrink-0 ml-2">
                            {b.code || 'No code'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="text-gray-500">Address:</span>
                            <div className="mt-1 font-medium">{b.address || "No address provided"}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Location:</span>
                            <span className="ml-2 font-medium">{b.city}, {b.state}, {b.country}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Pincode:</span>
                            <span className="ml-2 font-medium">{b.pincode || "Not specified"}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                          {hasPermission("branch.edit") && (
                            <button 
                              onClick={() => startEdit(b)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Branch"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("branch.delete") && (
                            <button 
                              onClick={() => handleDelete(b.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Branch"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
