import { useEffect, useState } from "react";
import api from "../../api";

export default function LeadTimeRules() {
  const [leadTimes, setLeadTimes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    vendor_id: "",
    item_id: "",
    avg_lead_time: "",
    min_lead_time: "",
    max_lead_time: "",
  });

  // -------------------------------
  // LOAD LEAD TIMES
  // -------------------------------
  useEffect(() => {
    loadLeadTimes();
  }, []);

  const loadLeadTimes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory-rules/lead-time");
      setLeadTimes(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load lead time settings");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // SAVE LEAD TIME
  // -------------------------------
  const saveLeadTime = async () => {
    if (!form.vendor_id || !form.item_id) {
      return alert("Select both Vendor and Item");
    }

    try {
      await api.post("/inventory-rules/lead-time", {
        vendor_id: Number(form.vendor_id),
        item_id: Number(form.item_id),
        avg_lead_time: Number(form.avg_lead_time),
        min_lead_time: Number(form.min_lead_time),
        max_lead_time: Number(form.max_lead_time),
      });

      alert("Lead time saved successfully");

      setForm({
        vendor_id: "",
        item_id: "",
        avg_lead_time: "",
        min_lead_time: "",
        max_lead_time: "",
      });

      loadLeadTimes();
    } catch (err) {
      console.error(err);
      alert("Failed to save lead time");
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">

      <h2 className="text-lg font-semibold mb-6">
        Lead Time Settings
      </h2>

      {/* FORM */}
      <div className="grid grid-cols-2 gap-4 mb-6">

        <input
          type="number"
          placeholder="Vendor ID (temporary)"
          value={form.vendor_id}
          onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
          className="border rounded px-3 py-2"
        />

        <input
          type="number"
          placeholder="Item ID (temporary)"
          value={form.item_id}
          onChange={(e) => setForm({ ...form, item_id: e.target.value })}
          className="border rounded px-3 py-2"
        />

        <input
          type="number"
          placeholder="Average Lead Time (Days)"
          value={form.avg_lead_time}
          onChange={(e) => setForm({ ...form, avg_lead_time: e.target.value })}
          className="border rounded px-3 py-2"
        />

        <input
          type="number"
          placeholder="Minimum Lead Time (Days)"
          value={form.min_lead_time}
          onChange={(e) => setForm({ ...form, min_lead_time: e.target.value })}
          className="border rounded px-3 py-2"
        />

        <input
          type="number"
          placeholder="Maximum Lead Time (Days)"
          value={form.max_lead_time}
          onChange={(e) => setForm({ ...form, max_lead_time: e.target.value })}
          className="border rounded px-3 py-2"
        />
      </div>

      <button
        onClick={saveLeadTime}
        className="bg-cyan-700 text-white px-6 py-2 rounded-lg mb-8"
      >
        Save Lead Time
      </button>

      {/* TABLE */}
      <h3 className="font-medium mb-3">Lead Time List</h3>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <table className="w-full border">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Vendor</th>
              <th>Item</th>
              <th>Avg</th>
              <th>Min</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {leadTimes.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-sm">
                  No lead time configured
                </td>
              </tr>
            ) : (
              leadTimes.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.vendor_id}</td>
                  <td>{l.item_id}</td>
                  <td>{l.avg_lead_time}</td>
                  <td>{l.min_lead_time}</td>
                  <td>{l.max_lead_time}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
