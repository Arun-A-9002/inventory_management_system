import { useState, useEffect } from "react";
import api from "../../api";

export default function AlertRules() {
  const [alerts, setAlerts] = useState({
    alert_method: "EMAIL",
    alert_trigger_percent: 20,
    dashboard_priority: "HIGH",
    notify_store_keeper: false,
    notify_purchase_manager: false,
    notify_department_head: false,
    notify_admin: false,
    auto_pr: false,
    auto_po: false
  });
  const [alertRulesList, setAlertRulesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlertRules();
  }, []);

  const loadAlertRules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory-rules/alerts");
      setAlertRulesList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveAlerts = async () => {
    try {
      await api.post("/inventory-rules/alerts", alerts);
      alert("Alert rules saved successfully!");
      loadAlertRules();
    } catch (e) {
      console.error(e);
      alert("Failed to save alert rules");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Alerts & Notification Rules</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Alert Method</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={alerts.alert_method}
            onChange={(e) => setAlerts({...alerts, alert_method: e.target.value})}
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="DASHBOARD">Dashboard Only</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Alert Trigger %</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={alerts.alert_trigger_percent}
            onChange={(e) => setAlerts({...alerts, alert_trigger_percent: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Dashboard Priority</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={alerts.dashboard_priority}
            onChange={(e) => setAlerts({...alerts, dashboard_priority: e.target.value})}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="font-medium mb-3">Notification Recipients</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={alerts.notify_store_keeper}
              onChange={(e) => setAlerts({...alerts, notify_store_keeper: e.target.checked})}
            />
            Store Keeper
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={alerts.notify_purchase_manager}
              onChange={(e) => setAlerts({...alerts, notify_purchase_manager: e.target.checked})}
            />
            Purchase Manager
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={alerts.notify_department_head}
              onChange={(e) => setAlerts({...alerts, notify_department_head: e.target.checked})}
            />
            Department Head
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={alerts.notify_admin}
              onChange={(e) => setAlerts({...alerts, notify_admin: e.target.checked})}
            />
            Admin
          </label>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="font-medium mb-3">Automation</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={alerts.auto_pr}
              onChange={(e) => setAlerts({...alerts, auto_pr: e.target.checked})}
            />
            Auto Purchase Request
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={alerts.auto_po}
              onChange={(e) => setAlerts({...alerts, auto_po: e.target.checked})}
            />
            Auto Purchase Order
          </label>
        </div>
      </div>
      
      <button
        onClick={saveAlerts}
        className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-full mb-8"
      >
        Save Alert Rules
      </button>

      {/* Alert Rules List */}
      <h3 className="font-medium mb-3">Alert Rules List</h3>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <table className="w-full border">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Alert Method</th>
              <th>Trigger %</th>
              <th>Priority</th>
              <th>Store Keeper</th>
              <th>Purchase Mgr</th>
              <th>Dept Head</th>
              <th>Admin</th>
              <th>Auto PR</th>
              <th>Auto PO</th>
            </tr>
          </thead>
          <tbody>
            {alertRulesList.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-sm">
                  No alert rules configured
                </td>
              </tr>
            ) : (
              alertRulesList.map((rule) => (
                <tr key={rule.id} className="border-t">
                  <td className="p-2">{rule.alert_method}</td>
                  <td>{rule.alert_trigger_percent}%</td>
                  <td>{rule.dashboard_priority}</td>
                  <td>{rule.notify_store_keeper ? "Yes" : "No"}</td>
                  <td>{rule.notify_purchase_manager ? "Yes" : "No"}</td>
                  <td>{rule.notify_department_head ? "Yes" : "No"}</td>
                  <td>{rule.notify_admin ? "Yes" : "No"}</td>
                  <td>{rule.auto_pr ? "Yes" : "No"}</td>
                  <td>{rule.auto_po ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
