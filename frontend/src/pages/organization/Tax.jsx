import { useState, useEffect } from "react";
import api from "../../api";

export default function Tax() {
  const [taxList, setTaxList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    hsn_code: "",
    description: "",
    gst_percentage: "",
    cgst: "",
    sgst: "",
    igst: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadTax();
  }, []);

  const loadTax = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tax/");
      setTaxList(res.data || []);
    } catch (err) {
      console.error("Failed loading tax list", err);
      alert("Failed to load tax codes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.hsn_code.trim()) return alert("HSN Code is required");
    if (!form.gst_percentage.trim()) return alert("GST % is required");

    try {
      await api.post("/tax/", {
        ...form,
        gst_percentage: Number(form.gst_percentage),
        cgst: form.cgst ? Number(form.cgst) : null,
        sgst: form.sgst ? Number(form.sgst) : null,
        igst: form.igst ? Number(form.igst) : null,
      });

      setForm({
        hsn_code: "",
        description: "",
        gst_percentage: "",
        cgst: "",
        sgst: "",
        igst: ""
      });

      loadTax();

    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      ...t,
      gst_percentage: t.gst_percentage || "",
      cgst: t.cgst || "",
      sgst: t.sgst || "",
      igst: t.igst || "",
    });
  };

  const handleUpdate = async () => {
    if (!editForm.hsn_code.trim()) return alert("HSN Code required");

    try {
      await api.put(`/tax/${editingId}`, {
        ...editForm,
        gst_percentage: Number(editForm.gst_percentage),
        cgst: editForm.cgst ? Number(editForm.cgst) : null,
        sgst: editForm.sgst ? Number(editForm.sgst) : null,
        igst: editForm.igst ? Number(editForm.igst) : null,
      });

      setEditingId(null);
      loadTax();

    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tax code?")) return;

    try {
      await api.delete(`/tax/${id}`);
      loadTax();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">Tax / GST / HSN Setup</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Configure tax structure used in your inventory system</p>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
              <span className="text-sm font-medium text-gray-600">Total Tax Codes</span>
              <span className="ml-2 text-lg font-bold text-gray-900">{taxList.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* LEFT CARD — CREATE / EDIT FORM */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
            
              {!editingId ? (
                <>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Add Tax Code</h2>
                        <p className="text-sm text-gray-500">Create a new tax/GST code</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {["hsn_code", "description", "gst_percentage", "cgst", "sgst", "igst"].map((key) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.replace("_", " ").toUpperCase()}
                          {(key === 'hsn_code' || key === 'gst_percentage') && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                          placeholder={key.includes("percentage") ? "Enter percentage (e.g., 18)" : `Enter ${key.replace("_", " ").toLowerCase()}`}
                          type={key.includes("percentage") || key.includes("gst") || key.includes("cgst") || key.includes("sgst") || key.includes("igst") ? "number" : "text"}
                        />
                      </div>
                    ))}

                    <button
                      onClick={handleCreate}
                      className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      Add Tax Code
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Edit Tax Code</h2>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {["hsn_code", "description", "gst_percentage", "cgst", "sgst", "igst"].map((key) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.replace("_", " ").toUpperCase()}
                        </label>
                        <input
                          value={editForm[key]}
                          onChange={(e) =>
                            setEditForm({ ...editForm, [key]: e.target.value })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                          placeholder={key.includes("percentage") ? "Enter percentage (e.g., 18)" : `Enter ${key.replace("_", " ").toLowerCase()}`}
                          type={key.includes("percentage") || key.includes("gst") || key.includes("cgst") || key.includes("sgst") || key.includes("igst") ? "number" : "text"}
                        />
                      </div>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleUpdate}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
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

          {/* RIGHT — LIST */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Tax Code List</h3>
                <p className="text-sm text-gray-500 mt-1">List of all HSN and GST codes</p>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">#</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">HSN Code</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST%</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CGST</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SGST</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IGST</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : taxList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                            No tax codes found
                          </td>
                        </tr>
                      ) : (
                        taxList.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500 text-center">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{t.hsn_code}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-700 max-w-xs truncate">{t.description || "-"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded font-medium">
                                {t.gst_percentage}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{t.cgst || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{t.sgst || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{t.igst || "-"}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => startEdit(t)}
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {loading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mx-auto"></div>
                  </div>
                ) : taxList.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">No tax codes found</div>
                ) : (
                  <div className="space-y-4 p-4">
                    {taxList.map((t, idx) => (
                      <div key={t.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-amber-600 font-semibold text-sm">{t.hsn_code.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">{t.hsn_code}</h4>
                              <p className="text-xs text-gray-500">#{idx + 1}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded font-medium flex-shrink-0 ml-2">
                            {t.gst_percentage}%
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="text-gray-500">Description:</span>
                            <div className="mt-1 font-medium">{t.description || "No description provided"}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-gray-500 text-xs">CGST:</span>
                              <div className="font-medium">{t.cgst || "-"}</div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">SGST:</span>
                              <div className="font-medium">{t.sgst || "-"}</div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">IGST:</span>
                              <div className="font-medium">{t.igst || "-"}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => startEdit(t)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Tax Code"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Tax Code"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
