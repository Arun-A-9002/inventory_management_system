import { useState, useEffect } from "react";
import api from "../../api";

export default function ItemReorderRules() {
  const [rule, setRule] = useState({
    item_id: "",
    min_level: 0,
    max_level: 0,
    reorder_level: 0,
    safety_stock: 0,
    auto_po: false,
    remarks: ""
  });
  const [itemRulesList, setItemRulesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItemRules();
  }, []);

  const loadItemRules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory-rules/item");
      setItemRulesList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async () => {
    try {
      await api.post("/inventory-rules/item", rule);
      alert("Item rule saved successfully!");
      setRule({
        item_id: "",
        min_level: 0,
        max_level: 0,
        reorder_level: 0,
        safety_stock: 0,
        auto_po: false,
        remarks: ""
      });
      loadItemRules();
    } catch (e) {
      console.error(e);
      alert("Failed to save rule");
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
                <h2 className="text-lg font-semibold text-gray-900">Create Item Rule</h2>
                <p className="text-sm text-gray-500">Configure item-level reorder settings</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item ID</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rule.item_id}
                onChange={(e) => setRule({...rule, item_id: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Level</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rule.min_level}
                onChange={(e) => setRule({...rule, min_level: Number(e.target.value)})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Level</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rule.max_level}
                onChange={(e) => setRule({...rule, max_level: Number(e.target.value)})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rule.reorder_level}
                onChange={(e) => setRule({...rule, reorder_level: Number(e.target.value)})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety Stock</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={rule.safety_stock}
                onChange={(e) => setRule({...rule, safety_stock: Number(e.target.value)})}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={rule.auto_po}
                onChange={(e) => setRule({...rule, auto_po: e.target.checked})}
              />
              <label className="text-sm font-medium text-gray-700">Auto Purchase Order</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={3}
                value={rule.remarks}
                onChange={(e) => setRule({...rule, remarks: e.target.value})}
              />
            </div>
            
            <button
              onClick={saveRule}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Item Rule
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — LIST */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Item Reorder Rules List</h3>
            <p className="text-sm text-gray-500 mt-1">All configured item-level reorder rules</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min Level</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Max Level</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reorder Level</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Safety Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Auto PO</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : itemRulesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        No item rules configured
                      </td>
                    </tr>
                  ) : (
                    itemRulesList.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.item_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.min_level}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.max_level}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.reorder_level}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.safety_stock}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.auto_po ? "Yes" : "No"}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.remarks || "-"}</td>
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
            ) : itemRulesList.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No item rules configured</div>
            ) : (
              <div className="space-y-4 p-4">
                {itemRulesList.map((rule) => (
                  <div key={rule.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Item ID:</span>
                        <span className="font-medium">{rule.item_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Min Level:</span>
                        <span className="font-medium">{rule.min_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Level:</span>
                        <span className="font-medium">{rule.max_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reorder:</span>
                        <span className="font-medium">{rule.reorder_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Safety Stock:</span>
                        <span className="font-medium">{rule.safety_stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Auto PO:</span>
                        <span className="font-medium">{rule.auto_po ? "Yes" : "No"}</span>
                      </div>
                      {rule.remarks && (
                        <div>
                          <span className="text-gray-500">Remarks:</span>
                          <div className="mt-1 font-medium">{rule.remarks}</div>
                        </div>
                      )}
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
