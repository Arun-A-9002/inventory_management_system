import { useState, useEffect } from "react";
import api from "../../api";

export default function Brand() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    brand_name: "",
    manufacturer_name: "",
    contact_number: "",
    email: "",
    website: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const res = await api.get("/brand/");
      setBrands(res.data || []);
    } catch (err) {
      console.error("Failed loading brands", err);
      alert("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.brand_name.trim()) return alert("Brand name is required");

    try {
      await api.post("/brand/", form);
      setForm({
        brand_name: "",
        manufacturer_name: "",
        contact_number: "",
        email: "",
        website: ""
      });
      loadBrands();
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
      await api.put(`/brand/${editingId}`, editForm);
      setEditingId(null);
      loadBrands();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this brand?")) return;

    try {
      await api.delete(`/brand/${id}`);
      loadBrands();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Master Data Setup</div>
          <h1 className="text-3xl font-semibold mt-2">Brand / Manufacturer Setup</h1>
          <p className="mt-2 opacity-90">Manage product brands and manufacturers.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT — CREATE/EDIT FORM */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">

            {/* CREATE MODE */}
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Create Brand</h2>

                {Object.keys(form).map((key) => (
                  <div key={key} className="mb-3">
                    <label className="block text-sm font-medium">
                      {key.replace("_", " ").toUpperCase()}
                    </label>
                    <input
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>
                ))}

                <button
                  onClick={handleCreate}
                  className="rounded-full bg-fuchsia-600 text-white px-5 py-2 mt-3"
                >
                  Create Brand
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit Brand</h2>

                {Object.keys(editForm).map((key) =>
                  key === "id" ? null : (
                    <div key={key} className="mb-3">
                      <label className="block text-sm font-medium">
                        {key.replace("_", " ").toUpperCase()}
                      </label>
                      <input
                        value={editForm[key] || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, [key]: e.target.value })
                        }
                        className="w-full border rounded-lg px-4 py-2"
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

        {/* RIGHT — LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">

            <h3 className="text-lg font-semibold">Brand List</h3>
            <p className="text-sm text-slate-500 mb-4">List of all brands and manufacturers.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">

                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">Brand Name</th>
                    <th className="py-3 text-left">Manufacturer</th>
                    <th className="py-3 text-left">Contact</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center">Loading...</td></tr>
                  ) : brands.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No brands found</td></tr>
                  ) : (
                    brands.map((b, idx) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{b.brand_name}</td>
                        <td className="py-3">{b.manufacturer_name || "-"}</td>
                        <td className="py-3">{b.contact_number || "-"}</td>
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
