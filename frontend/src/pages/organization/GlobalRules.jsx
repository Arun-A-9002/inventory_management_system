import { useState, useEffect } from "react";
import api from "../../api";

export default function GlobalRules() {
  const [rules, setRules] = useState({
    min_stock_percent: 20,
    max_stock_percent: 80,
    safety_stock_formula: "AVERAGE_CONSUMPTION",
    reorder_method: "AUTOMATIC",
    allow_negative_stock: false,
    issue_method: "FIFO"
  });
  const [globalRulesList, setGlobalRulesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGlobalRules();
  }, []);

  const loadGlobalRules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory-rules/global");
      setGlobalRulesList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    try {
      await api.post("/inventory-rules/global", rules);
      alert("Global rules saved successfully!");
      loadGlobalRules();
    } catch (e) {
      console.error(e);
      alert("Failed to save rules");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Global Inventory Rules</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Min Stock %</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rules.min_stock_percent}
            onChange={(e) => setRules({...rules, min_stock_percent: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Max Stock %</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rules.max_stock_percent}
            onChange={(e) => setRules({...rules, max_stock_percent: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Safety Stock Formula</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={rules.safety_stock_formula}
            onChange={(e) => setRules({...rules, safety_stock_formula: e.target.value})}
          >
            <option value="AVERAGE_CONSUMPTION">Average Consumption</option>
            <option value="FIXED_DAYS">Fixed Days</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Reorder Method</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={rules.reorder_method}
            onChange={(e) => setRules({...rules, reorder_method: e.target.value})}
          >
            <option value="AUTOMATIC">Automatic</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Issue Method</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={rules.issue_method}
            onChange={(e) => setRules({...rules, issue_method: e.target.value})}
          >
            <option value="FIFO">FIFO</option>
            <option value="LIFO">LIFO</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={rules.allow_negative_stock}
            onChange={(e) => setRules({...rules, allow_negative_stock: e.target.checked})}
          />
          <label className="text-sm font-medium">Allow Negative Stock</label>
        </div>
      </div>
      
      <button
        onClick={saveRules}
        className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-full mb-8"
      >
        Save Global Rules
      </button>

      {/* Global Rules List */}
      <h3 className="font-medium mb-3">Global Rules List</h3>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <table className="w-full border">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Min Stock %</th>
              <th>Max Stock %</th>
              <th>Safety Stock Formula</th>
              <th>Reorder Method</th>
              <th>Issue Method</th>
              <th>Allow Negative</th>
            </tr>
          </thead>
          <tbody>
            {globalRulesList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-sm">
                  No global rules configured
                </td>
              </tr>
            ) : (
              globalRulesList.map((rule) => (
                <tr key={rule.id} className="border-t">
                  <td className="p-2">{rule.min_stock_percent}%</td>
                  <td>{rule.max_stock_percent}%</td>
                  <td>{rule.safety_stock_formula}</td>
                  <td>{rule.reorder_method}</td>
                  <td>{rule.issue_method}</td>
                  <td>{rule.allow_negative_stock ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}