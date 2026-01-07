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
    <div>
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GST</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Logo</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : companies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No companies registered
                        </td>
                      </tr>
                    ) : (
                      companies.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-center">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">{c.name}</div>
                            <div className="text-sm text-gray-600">Code: {c.code}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              {c.gst_number || 'Not provided'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">{c.contact_person}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {c.logo ? (
                              <img src={`http://localhost:8000${c.logo}`} alt="Logo" className="h-8 w-8 object-cover rounded mx-auto" />
                            ) : (
                              <div className="h-8 w-8 bg-gray-100 rounded mx-auto"></div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center space-x-1">
                              {hasPermission("company.edit") && (
                                <button onClick={() => startEdit(c)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">
                                  Edit
                                </button>
                              )}
                              {hasPermission("company.delete") && (
                                <button onClick={() => handleDelete(c.id)} className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50">
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
