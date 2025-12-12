import { useState, useEffect } from "react";
import api from "../../api";

export default function Company() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

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
    loadCompanies();
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
    if (!form.name.trim()) return alert("Company name is required");

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
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const handleUpdate = async () => {
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
    if (!window.confirm("Delete this company?")) return;

    try {
      await api.delete(`/company/${id}`);
      loadCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

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

                {Object.keys(form).map((key) => (
                  <div key={key} className="mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      {key.replace("_", " ").toUpperCase()}
                    </label>
                    <input
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-4 py-2"
                    />
                  </div>
                ))}

                <button
                  onClick={handleCreate}
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-indigo-600 text-white px-5 py-2"
                >
                  Create Company
                </button>
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border">

            <h3 className="text-lg font-semibold">Company List</h3>
            <p className="text-sm text-slate-500 mb-4">All registered companies in your organization.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Code</th>
                    <th className="py-3 text-left">Email</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
                  ) : companies.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No companies found</td></tr>
                  ) : (
                    companies.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{c.name}</td>
                        <td className="py-3">{c.code}</td>
                        <td className="py-3">{c.email || "-"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(c)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-sm px-3 py-1 rounded-full border text-red-600 hover:bg-red-50"
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
        </div>
      </div>
    </div>
  );
}
