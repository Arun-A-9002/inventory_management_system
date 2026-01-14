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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Alert Rules</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Configure alerts and notification rules</p>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
              <span className="text-sm font-medium text-gray-600">Total Rules</span>
              <span className="ml-2 text-lg font-bold text-gray-900">{alertRulesList.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
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
                    <h2 className="text-lg font-semibold text-gray-900">Create Alert Rule</h2>
                    <p className="text-sm text-gray-500">Configure notification settings</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alert Method</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={alerts.alert_method}
                    onChange={(e) => setAlerts({...alerts, alert_method: e.target.value})}
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="DASHBOARD">Dashboard Only</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alert Trigger %</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={alerts.alert_trigger_percent}
                    onChange={(e) => setAlerts({...alerts, alert_trigger_percent: Number(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Priority</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={alerts.dashboard_priority}
                    onChange={(e) => setAlerts({...alerts, dashboard_priority: e.target.value})}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Recipients</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={alerts.notify_store_keeper}
                        onChange={(e) => setAlerts({...alerts, notify_store_keeper: e.target.checked})}
                      />
                      <span className="text-sm">Store Keeper</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={alerts.notify_purchase_manager}
                        onChange={(e) => setAlerts({...alerts, notify_purchase_manager: e.target.checked})}
                      />
                      <span className="text-sm">Purchase Manager</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={alerts.notify_department_head}
                        onChange={(e) => setAlerts({...alerts, notify_department_head: e.target.checked})}
                      />
                      <span className="text-sm">Department Head</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={alerts.notify_admin}
                        onChange={(e) => setAlerts({...alerts, notify_admin: e.target.checked})}
                      />
                      <span className="text-sm">Admin</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Automation</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={alerts.auto_pr}
                        onChange={(e) => setAlerts({...alerts, auto_pr: e.target.checked})}
                      />
                      <span className="text-sm">Auto Purchase Request</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={alerts.auto_po}
                        onChange={(e) => setAlerts({...alerts, auto_po: e.target.checked})}
                      />
                      <span className="text-sm">Auto Purchase Order</span>
                    </label>
                  </div>
                </div>
                
                <button
                  onClick={saveAlerts}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Alert Rules
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — LIST */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Alert Rules List</h3>
                <p className="text-sm text-gray-500 mt-1">All configured alert rules</p>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Alert Method</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trigger %</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Store Keeper</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Purchase Mgr</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dept Head</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Auto PR</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Auto PO</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : alertRulesList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                            No alert rules configured
                          </td>
                        </tr>
                      ) : (
                        alertRulesList.map((rule) => (
                          <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.alert_method}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.alert_trigger_percent}%</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded ${
                                rule.dashboard_priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                rule.dashboard_priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                rule.dashboard_priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {rule.dashboard_priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.notify_store_keeper ? "Yes" : "No"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.notify_purchase_manager ? "Yes" : "No"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.notify_department_head ? "Yes" : "No"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.notify_admin ? "Yes" : "No"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.auto_pr ? "Yes" : "No"}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{rule.auto_po ? "Yes" : "No"}</td>
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
                ) : alertRulesList.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">No alert rules configured</div>
                ) : (
                  <div className="space-y-4 p-4">
                    {alertRulesList.map((rule) => (
                      <div key={rule.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Method:</span>
                            <span className="font-medium">{rule.alert_method}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Trigger:</span>
                            <span className="font-medium">{rule.alert_trigger_percent}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Priority:</span>
                            <span className={`px-2 py-1 text-xs rounded ${
                              rule.dashboard_priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              rule.dashboard_priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              rule.dashboard_priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {rule.dashboard_priority}
                            </span>
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
      </div>
    </div>

  );
}
