import { useState, useEffect } from "react";
import api from "../../api";

export default function UOM() {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    conversion_factor: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadUoms();
  }, []);

  const loadUoms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/uom/");
      setUoms(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load UOMs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return alert("UOM name is required");
    if (!form.code.trim()) return alert("UOM code is required");

    try {
      await api.post("/uom/", {
        ...form,
        conversion_factor: form.conversion_factor
          ? Number(form.conversion_factor)
          : null,
      });

      setForm({ name: "", code: "", conversion_factor: "" });
      loadUoms();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Create failed");
    }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditForm({
      id: u.id,
      name: u.name,
      code: u.code,
      conversion_factor: u.conversion_factor || "",
    });
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) return alert("Name required");
    if (!editForm.code.trim()) return alert("Code required");

    try {
      await api.put(`/uom/${editingId}`, {
        ...editForm,
        conversion_factor: editForm.conversion_factor
          ? Number(editForm.conversion_factor)
          : null,
      });

      setEditingId(null);
      loadUoms();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this UOM?")) return;

    try {
      await api.delete(`/uom/${id}`);
      loadUoms();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Master Data Setup</div>
          <h1 className="text-3xl font-semibold mt-2">UOM (Unit of Measure) Setup</h1>
          <p className="mt-2 opacity-90">Define measurement units used in inventory.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT — CREATE/EDIT FORM */}
        <div className="col-span-12 lg:col-span-4">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create UOM</h2>

                <label className="block text-sm font-medium">UOM Name *</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                  placeholder="Piece"
                />

                <label className="block text-sm font-medium">UOM Code *</label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                  placeholder="PCS"
                />

                <label className="block text-sm font-medium">Conversion Factor</label>
                <input
                  value={form.conversion_factor}
                  onChange={(e) =>
                    setForm({ ...form, conversion_factor: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                  placeholder="1"
                />

                <button
                  onClick={handleCreate}
                  className="rounded-full bg-cyan-600 text-white px-5 py-2"
                >
                  Create UOM
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit UOM</h2>

                <label className="block text-sm font-medium">UOM Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <label className="block text-sm font-medium">UOM Code *</label>
                <input
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm({ ...editForm, code: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <label className="block text-sm font-medium">Conversion Factor</label>
                <input
                  value={editForm.conversion_factor}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      conversion_factor: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="rounded-full bg-blue-600 text-white px-4 py-2"
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
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            
            <h3 className="text-lg font-semibold">UOM List</h3>
            <p className="text-sm text-slate-500 mb-4">All defined units of measurement.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Code</th>
                    <th className="py-3 text-left">Conversion</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
                  ) : uoms.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No UOMs found</td></tr>
                  ) : (
                    uoms.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{u.name}</td>
                        <td className="py-3">{u.code}</td>
                        <td className="py-3">{u.conversion_factor || "-"}</td>

                        <td className="py-3">
                          <div className="flex gap-2">

                            <button
                              onClick={() => startEdit(u)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(u.id)}
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
