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
    logo: ""
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
      await api.post("/company/", form);
      setForm({
        name: "",
        code: "",
        gst_number: "",
        address: "",
        contact_person: "",
        email: "",
        phone: "",
        logo: ""
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
    setEditForm({ ...c });
  };

  const handleUpdate = async () => {
    if (!hasPermission("company.edit")) return alert("Permission denied");
    try {
      await api.put(`/company/${editingId}`, editForm);
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await api.post('/company/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm({ ...form, logo: response.data.url });
    } catch (err) {
      console.error(err);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (!hasPermission("company.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view companies.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER CARD */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Organization Structure</div>
          <h1 className="text-3xl font-semibold mt-2">Company Management</h1>
          <p className="mt-2 opacity-90">Manage your organization's company details.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT CARD — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">

            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Company</h2>
                
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
                  <div key={key} className="mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      {key.replace("_", " ").toUpperCase()}
                      {key !== 'logo' && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {key === 'logo' ? (
                      <div className="mt-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={companies.length > 0 || uploading}
                          className="w-full rounded-lg border px-4 py-2"
                        />
                        {uploading && <p className="text-sm text-blue-600 mt-1">Uploading...</p>}
                        {form.logo && (
                          <div className="mt-2">
                            <img src={`http://localhost:8000${form.logo}`} alt="Logo" className="h-16 w-16 object-cover rounded" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                        disabled={companies.length > 0}
                      />
                    )}
                  </div>
                ))}

                <button
                  onClick={handleCreate}
                  disabled={companies.length > 0 || !hasPermission("company.create")}
                  className={`mt-3 inline-flex items-center justify-center rounded-full px-5 py-2 ${
                    companies.length > 0 || !hasPermission("company.create")
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Create Company
                </button>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-3">Edit Company</h2>

                {Object.keys(editForm).map((key) => (
                  key === "id" ? null : (
                    <div key={key} className="mb-3">
                      <label className="block text-sm font-medium text-slate-700">
                        {key.replace("_", " ").toUpperCase()}
                      </label>
                      <input
                        value={editForm[key] || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, [key]: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                      />
                    </div>
                  )
                ))}

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
              <h3 className="text-xl font-bold text-gray-800">Company Directory</h3>
              <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's company information</p>
            </div>

            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company Details</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registration</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact Info</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Logo</th>
                      <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            <span className="text-gray-500">Loading companies...</span>
                          </div>
                        </td>
                      </tr>
                    ) : companies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="text-gray-400">
                            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <p className="text-lg font-medium">No companies registered</p>
                            <p className="text-sm">Create your first company to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      companies.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-4 py-6">
                            <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-sm">
                              {idx + 1}
                            </div>
                          </td>
                          
                          <td className="px-4 py-6">
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900 text-lg">{c.name}</div>
                              <div className="text-sm text-gray-600">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Code: {c.code}
                                </span>
                              </div>
                              {c.address && (
                                <div className="text-sm text-gray-500 max-w-xs">
                                  <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {c.address.length > 50 ? `${c.address.substring(0, 50)}...` : c.address}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-6">
                            <div className="space-y-2">
                              {c.gst_number ? (
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  GST: {c.gst_number}
                                </div>
                              ) : (
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  GST: Not provided
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-6">
                            <div className="space-y-2">
                              {c.contact_person && (
                                <div className="flex items-center text-sm text-gray-700">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {c.contact_person}
                                </div>
                              )}
                              {c.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {c.email}
                                </div>
                              )}
                              {c.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {c.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-6">
                            <div className="flex justify-center">
                              {c.logo ? (
                                <div className="relative group">
                                  <img 
                                    src={`http://localhost:8000${c.logo}`} 
                                    alt="Company Logo" 
                                    className="h-12 w-12 object-cover rounded-lg border-2 border-gray-200 shadow-sm group-hover:shadow-md transition-shadow"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all"></div>
                                </div>
                              ) : (
                                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-6">
                            <div className="flex justify-center space-x-2">
                              {hasPermission("company.edit") && (
                              <button
                                onClick={() => startEdit(c)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              )}
                              {hasPermission("company.delete") && (
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
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
