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
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Master Data Setup</div>
          <h1 className="text-3xl font-semibold mt-2">Tax / GST / HSN Setup</h1>
          <p className="mt-2 opacity-90">Configure tax structure used in your inventory system.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT — CREATE / EDIT FORM */}
        <div className="col-span-12 lg:col-span-4">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            
            {!editingId ? (
              <>
                <h2 className="text-xl font-semibold mb-3">Add Tax Code</h2>

                {["hsn_code", "description", "gst_percentage", "cgst", "sgst", "igst"].map((key) => (
                  <div key={key} className="mb-3">
                    <label className="text-sm font-medium">
                      {key.replace("_", " ").toUpperCase()}
                    </label>
                    <input
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder={key.includes("percentage") ? "0" : ""}
                    />
                  </div>
                ))}

                <button
                  onClick={handleCreate}
                  className="rounded-full bg-amber-600 text-white px-5 py-2"
                >
                  Add Tax Code
                </button>
              </>
            ) : (
              <>
                {/* EDIT MODE */}
                <h2 className="text-xl font-semibold mb-3">Edit Tax Code</h2>

                {["hsn_code", "description", "gst_percentage", "cgst", "sgst", "igst"].map((key) => (
                  <div key={key} className="mb-3">
                    <label className="text-sm font-medium">
                      {key.replace("_", " ").toUpperCase()}
                    </label>
                    <input
                      value={editForm[key]}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [key]: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="rounded-full bg-orange-600 text-white px-4 py-2"
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
            
            <h3 className="text-lg font-semibold">Tax Code List</h3>
            <p className="text-sm text-slate-500 mb-4">List of all HSN and GST codes.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                
                <thead>
                  <tr className="text-sm text-slate-500 border-b">
                    <th className="py-3 text-left">#</th>
                    <th className="py-3 text-left">HSN Code</th>
                    <th className="py-3 text-left">GST%</th>
                    <th className="py-3 text-left">CGST</th>
                    <th className="py-3 text-left">SGST</th>
                    <th className="py-3 text-left">IGST</th>
                    <th className="py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-6 text-center">Loading...</td></tr>
                  ) : taxList.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-500">No tax codes found</td></tr>
                  ) : (
                    taxList.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50">

                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{t.hsn_code}</td>
                        <td className="py-3">{t.gst_percentage}</td>
                        <td className="py-3">{t.cgst || "-"}</td>
                        <td className="py-3">{t.sgst || "-"}</td>
                        <td className="py-3">{t.igst || "-"}</td>

                        <td className="py-3">
                          <div className="flex gap-2">

                            <button
                              onClick={() => startEdit(t)}
                              className="text-sm px-3 py-1 rounded-full border hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(t.id)}
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
