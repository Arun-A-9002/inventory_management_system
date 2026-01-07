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
    <div>
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT CARD — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Branch</h2>
                {!hasPermission("branch.create") ? (
                  <div className="text-sm text-slate-500">You do not have permission to create branches.</div>
                ) : (
                  <>
                    {Object.keys(form).map((key) => (
                      <div key={key} className="mb-3">
                        <label className="block text-sm font-medium text-slate-700">
                          {key.replace("_", " ").toUpperCase()}
                        </label>
                        {key === "company_id" ? (
                          <select
                            value={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-4 py-2"
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
                            className="mt-1 w-full rounded-lg border px-4 py-2"
                          />
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleCreate}
                      disabled={!hasPermission("branch.create")}
                      className="mt-3 inline-flex items-center justify-center rounded-full px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Create Branch
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-3">Edit Branch</h2>
                {Object.keys(editForm).map((key) =>
                  key === "id" ? null : (
                    <div key={key} className="mb-3">
                      <label className="block text-sm font-medium text-slate-700">
                        {key.replace("_", " ").toUpperCase()}
                      </label>
                      <input
                        value={editForm[key] || ""}
                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-4 py-2"
                      />
                    </div>
                  )
                )}
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
              <h3 className="text-xl font-bold text-gray-800">Branch Directory</h3>
              <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's branch information</p>
            </div>
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : branches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No branches registered
                        </td>
                      </tr>
                    ) : (
                      branches.map((b, idx) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-center">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">{b.name}</div>
                            <div className="text-sm text-gray-600">{b.address}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {b.code || 'No code'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">{b.city}</div>
                            <div className="text-xs text-gray-500">{b.state}, {b.country}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center space-x-1">
                              {hasPermission("branch.edit") && (
                                <button onClick={() => startEdit(b)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">
                                  Edit
                                </button>
                              )}
                              {hasPermission("branch.delete") && (
                                <button onClick={() => handleDelete(b.id)} className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50">
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
