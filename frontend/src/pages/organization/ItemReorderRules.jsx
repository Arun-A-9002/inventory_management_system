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
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Item-Level Reorder Rules</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Item ID</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rule.item_id}
            onChange={(e) => setRule({...rule, item_id: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Min Level</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rule.min_level}
            onChange={(e) => setRule({...rule, min_level: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Max Level</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rule.max_level}
            onChange={(e) => setRule({...rule, max_level: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Reorder Level</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rule.reorder_level}
            onChange={(e) => setRule({...rule, reorder_level: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Safety Stock</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={rule.safety_stock}
            onChange={(e) => setRule({...rule, safety_stock: Number(e.target.value)})}
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={rule.auto_po}
            onChange={(e) => setRule({...rule, auto_po: e.target.checked})}
          />
          <label className="text-sm font-medium">Auto Purchase Order</label>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Remarks</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={3}
          value={rule.remarks}
          onChange={(e) => setRule({...rule, remarks: e.target.value})}
        />
      </div>
      
      <button
        onClick={saveRule}
        className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-full mb-8"
      >
        Save Item Rule
      </button>

      {/* Item Rules List */}
      <h3 className="font-medium mb-3">Item Reorder Rules List</h3>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <table className="w-full border">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Item ID</th>
              <th>Min Level</th>
              <th>Max Level</th>
              <th>Reorder Level</th>
              <th>Safety Stock</th>
              <th>Auto PO</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {itemRulesList.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-sm">
                  No item rules configured
                </td>
              </tr>
            ) : (
              itemRulesList.map((rule) => (
                <tr key={rule.id} className="border-t">
                  <td className="p-2">{rule.item_id}</td>
                  <td>{rule.min_level}</td>
                  <td>{rule.max_level}</td>
                  <td>{rule.reorder_level}</td>
                  <td>{rule.safety_stock}</td>
                  <td>{rule.auto_po ? "Yes" : "No"}</td>
                  <td>{rule.remarks || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}