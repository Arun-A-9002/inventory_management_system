import { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";

export default function Company() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    gst_number: "",
    address: "",
    contact_person: "",
    email: "",
    phone: "",
    logo: "",
    logoFile: null
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (hasPermission("company.view")) loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get("/company/");
      setCompanies(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!hasPermission("company.create")) return alert("Permission denied");
    // Validate all required fields
    const requiredFields = ['name', 'code', 'gst_number', 'address', 'contact_person', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !form[field].trim());
    
    if (missingFields.length > 0) {
      return alert(`Please fill all required fields: ${missingFields.join(', ')}`);
    }

    // Check if company already exists
    if (companies.length > 0) {
      return alert("Only one company is allowed. Please delete the existing company first.");
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('code', form.code);
      formData.append('gst_number', form.gst_number);
      formData.append('address', form.address);
      formData.append('contact_person', form.contact_person);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      
      if (form.logoFile) {
        formData.append('logo', form.logoFile);
      }
      
      await api.post("/company/", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setForm({
        name: "",
        code: "",
        gst_number: "",
        address: "",
        contact_person: "",
        email: "",
        phone: "",
        logo: "",
        logoFile: null
      });
      loadCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (c) => {
    if (!hasPermission("company.edit")) return alert("Permission denied");
    setEditingId(c.id);
    setEditForm({ ...c, logoFile: null });
  };

  const handleUpdate = async () => {
    if (!hasPermission("company.edit")) return alert("Permission denied");
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(editForm).forEach(key => {
        if (key !== 'id' && key !== 'logo_path' && editForm[key] !== null && editForm[key] !== undefined) {
          formData.append(key, editForm[key]);
        }
      });
      
      // Add logo file if selected
      if (editForm.logoFile) {
        formData.append('logo', editForm.logoFile);
      }
      
      await api.put(`/company/${editingId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditingId(null);
      loadCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission("company.delete")) return alert("Permission denied");
    if (!window.confirm("Delete this company?")) return;

    try {
      await api.delete(`/company/${id}`);
      loadCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setForm({ ...form, logoFile: file, logo: URL.createObjectURL(file) });
  };

  if (!hasPermission("company.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view companies.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Company Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your organization's company information</p>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
              <span className="text-sm font-medium text-gray-600">Total Companies</span>
              <span className="ml-2 text-lg font-bold text-gray-900">{companies.length}</span>
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
                      <h2 className="text-lg font-semibold text-gray-900">Create Company</h2>
                      <p className="text-sm text-gray-500">Add your organization's company</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                
                  {!hasPermission("company.create") ? (
                    <div className="text-sm text-slate-500">You do not have permission to create companies.</div>
                  ) : (
                    <>
                      {companies.length > 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Only one company is allowed. Delete the existing company to create a new one.
                          </p>
                        </div>
                      )}

                      {Object.keys(form).map((key) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {key.replace("_", " ").toUpperCase()}
                            {key !== 'logo' && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {key === 'logo' ? (
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                disabled={companies.length > 0 || uploading}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              />
                              {uploading && <p className="text-sm text-blue-600 mt-1">Processing...</p>}
                              {form.logo && (
                                <div className="mt-2">
                                  <img src={form.logo} alt="Logo" className="h-16 w-16 object-cover rounded" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              value={form[key]}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              disabled={companies.length > 0}
                              placeholder={`Enter ${key.replace("_", " ").toLowerCase()}`}
                            />
                          )}
                        </div>
                      ))}

                      <button
                        onClick={handleCreate}
                        disabled={companies.length > 0 || !hasPermission("company.create")}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                          companies.length > 0 || !hasPermission("company.create")
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Create Company
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
                    <h2 className="text-lg font-semibold text-gray-900">Edit Company</h2>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {Object.keys(editForm).map((key) => (
                    key === "id" || key === "logoFile" ? null : (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.replace("_", " ").toUpperCase()}
                        </label>
                        {key === 'logo_path' ? (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file && file.type.startsWith('image/')) {
                                  setEditForm({ ...editForm, logoFile: file });
                                } else if (file) {
                                  alert('Please select an image file');
                                }
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            {editForm.logo_path && (
                              <div className="mt-2">
                                <img src={`${api.defaults.baseURL}/company/${editForm.logo_path}`} alt="Current Logo" className="h-16 w-16 object-cover rounded" />
                              </div>
                            )}
                            {editForm.logoFile && (
                              <div className="mt-2">
                                <img src={URL.createObjectURL(editForm.logoFile)} alt="New Logo" className="h-16 w-16 object-cover rounded" />
                                <p className="text-sm text-green-600 mt-1">New logo selected</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            value={editForm[key] || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, [key]: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder={`Enter ${key.replace("_", " ").toLowerCase()}`}
                          />
                        )}
                      </div>
                    )
                  ))}

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
                <h3 className="text-lg font-semibold text-gray-900">Company Directory</h3>
                <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's company information</p>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">#</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Logo</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : companies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                            No companies registered
                          </td>
                        </tr>
                      ) : (
                        companies.map((c, idx) => (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500 text-center">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{c.name}</div>
                              <div className="text-sm text-gray-600">Code: {c.code}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {c.gst_number || 'Not provided'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{c.contact_person}</div>
                              <div className="text-xs text-gray-500">{c.email}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {c.logo_path ? (
                                <img src={`${api.defaults.baseURL}/company/${c.logo_path}`} alt="Logo" className="h-8 w-8 object-cover rounded mx-auto" />
                              ) : (
                                <div className="h-8 w-8 bg-gray-100 rounded mx-auto"></div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center space-x-2">
                                {hasPermission("company.edit") && (
                                  <button 
                                    onClick={() => startEdit(c)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {hasPermission("company.delete") && (
                                  <button 
                                    onClick={() => handleDelete(c.id)}
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
                ) : companies.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">No companies registered</div>
                ) : (
                  <div className="space-y-4 p-4">
                    {companies.map((c, idx) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                              {c.logo_path ? (
                                <img src={`${api.defaults.baseURL}/company/${c.logo_path}`} alt="Logo" className="h-10 w-10 object-cover rounded" />
                              ) : (
                                <span className="text-blue-600 font-semibold text-lg">{c.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">{c.name}</h4>
                              <p className="text-xs text-gray-500">Code: {c.code}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="text-gray-500">GST Number:</span>
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              {c.gst_number || 'Not provided'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Contact Person:</span>
                            <span className="ml-2 font-medium">{c.contact_person}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <span className="ml-2 font-medium">{c.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Phone:</span>
                            <span className="ml-2 font-medium">{c.phone}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Address:</span>
                            <div className="mt-1 text-sm">{c.address}</div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                          {hasPermission("company.edit") && (
                            <button 
                              onClick={() => startEdit(c)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Company"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("company.delete") && (
                            <button 
                              onClick={() => handleDelete(c.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Company"
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
