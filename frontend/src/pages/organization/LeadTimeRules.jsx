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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      {/* LEFT CARD — CREATE */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Create Lead Time</h2>
                <p className="text-sm text-gray-500">Configure vendor lead time settings</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor ID</label>
              <input
                type="number"
                placeholder="Enter vendor ID"
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item ID</label>
              <input
                type="number"
                placeholder="Enter item ID"
                value={form.item_id}
                onChange={(e) => setForm({ ...form, item_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Average Lead Time (Days)</label>
              <input
                type="number"
                placeholder="Enter average days"
                value={form.avg_lead_time}
                onChange={(e) => setForm({ ...form, avg_lead_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Lead Time (Days)</label>
              <input
                type="number"
                placeholder="Enter minimum days"
                value={form.min_lead_time}
                onChange={(e) => setForm({ ...form, min_lead_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Lead Time (Days)</label>
              <input
                type="number"
                placeholder="Enter maximum days"
                value={form.max_lead_time}
                onChange={(e) => setForm({ ...form, max_lead_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={saveLeadTime}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Lead Time
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — LIST */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Time List</h3>
            <p className="text-sm text-gray-500 mt-1">All configured vendor lead times</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Avg (Days)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min (Days)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Max (Days)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : leadTimes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No lead time configured
                      </td>
                    </tr>
                  ) : (
                    leadTimes.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{l.vendor_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{l.item_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{l.avg_lead_time}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{l.min_lead_time}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{l.max_lead_time}</td>
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
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : leadTimes.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No lead time configured</div>
            ) : (
              <div className="space-y-4 p-4">
                {leadTimes.map((l) => (
                  <div key={l.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vendor ID:</span>
                        <span className="font-medium">{l.vendor_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Item ID:</span>
                        <span className="font-medium">{l.item_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg Days:</span>
                        <span className="font-medium">{l.avg_lead_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Min Days:</span>
                        <span className="font-medium">{l.min_lead_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Days:</span>
                        <span className="font-medium">{l.max_lead_time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
