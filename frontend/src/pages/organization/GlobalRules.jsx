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
                <h2 className="text-lg font-semibold text-gray-900">Create Global Rule</h2>
                <p className="text-sm text-gray-500">Configure inventory settings</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock %</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rules.min_stock_percent}
                onChange={(e) => setRules({...rules, min_stock_percent: Number(e.target.value)})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Stock %</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rules.max_stock_percent}
                onChange={(e) => setRules({...rules, max_stock_percent: Number(e.target.value)})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety Stock Formula</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rules.safety_stock_formula}
                onChange={(e) => setRules({...rules, safety_stock_formula: e.target.value})}
              >
                <option value="AVERAGE_CONSUMPTION">Average Consumption</option>
                <option value="FIXED_DAYS">Fixed Days</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Method</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rules.reorder_method}
                onChange={(e) => setRules({...rules, reorder_method: e.target.value})}
              >
                <option value="AUTOMATIC">Automatic</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issue Method</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={rules.allow_negative_stock}
                onChange={(e) => setRules({...rules, allow_negative_stock: e.target.checked})}
              />
              <label className="text-sm font-medium text-gray-700">Allow Negative Stock</label>
            </div>
            
            <button
              onClick={saveRules}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Global Rules
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — LIST */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Global Rules List</h3>
            <p className="text-sm text-gray-500 mt-1">All configured global inventory rules</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min Stock %</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Max Stock %</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Safety Stock Formula</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reorder Method</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Issue Method</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Allow Negative</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : globalRulesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No global rules configured
                      </td>
                    </tr>
                  ) : (
                    globalRulesList.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{rule.min_stock_percent}%</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{rule.max_stock_percent}%</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.safety_stock_formula}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.reorder_method}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.issue_method}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.allow_negative_stock ? "Yes" : "No"}</td>
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
            ) : globalRulesList.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No global rules configured</div>
            ) : (
              <div className="space-y-4 p-4">
                {globalRulesList.map((rule) => (
                  <div key={rule.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Min Stock:</span>
                        <span className="font-medium">{rule.min_stock_percent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Stock:</span>
                        <span className="font-medium">{rule.max_stock_percent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Formula:</span>
                        <span className="font-medium">{rule.safety_stock_formula}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reorder:</span>
                        <span className="font-medium">{rule.reorder_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Issue:</span>
                        <span className="font-medium">{rule.issue_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Negative Stock:</span>
                        <span className="font-medium">{rule.allow_negative_stock ? "Yes" : "No"}</span>
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