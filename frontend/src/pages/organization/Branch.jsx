import { useState, useEffect } from "react";
import api from "../../api";

export default function Branch() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadBranches();
  }, []);

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
    if (!form.name.trim()) return alert("Branch name is required");

    try {
      await api.post("/branch/", form);
      setForm({
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
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditForm({ ...b });
  };

  const handleUpdate = async () => {
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
    if (!window.confirm("Delete this branch?")) return;

    try {
      await api.delete(`/branch/${id}`);
      loadBranches();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      
      {/* HEADER CARD */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Organization Structure</div>
          <h1 className="text-3xl font-semibold mt-2">Branch / Location Management</h1>
          <p className="mt-2 opacity-90">Manage your branches and their locations.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT — CREATE / EDIT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">

            {/* CREATE MODE */}
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Branch</h2>

                {Object.keys(form).map((key) => (
                  <div key={key} className="mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      {key.replace("_", " ").toUpperCase()}
                    </label>
                    <input
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border px-4 py-2"
                    />
                  </div>
                ))}

                <button
                  onClick={handleCreate}
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-blue-600 text-white px-5 py-2"
                >
                  Create Branch
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit Branch</h2>

                {Object.keys(editForm).map((key) =>
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
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="rounded-full bg-cyan-600 text-white px-4 py-2"
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

        {/* RIGHT — LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">

            <h3 className="text-lg font-semibold">Branch List</h3>
            <p className="text-sm text-slate-500 mb-4">All branches registered under your company.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Code</th>
                    <th className="py-3 text-left">City</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
                  ) : branches.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No branches found</td></tr>
                  ) : (
                    branches.map((b, idx) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{b.name}</td>
                        <td className="py-3">{b.code}</td>
                        <td className="py-3">{b.city || "-"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(b)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(b.id)}
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
