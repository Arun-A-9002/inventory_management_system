import React, { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";

export default function StockLedger() {
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    if (hasPermission("stock_ledger.view")) {
      fetchLedgerData();
    } else {
      setLoading(false);
    }
  }, []);

  // Check if user has permission to view stock ledger
  if (!hasPermission("stock_ledger.view")) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view the Stock Ledger.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      console.log('Fetching stock ledger data...');
      const response = await api.get("/stocks/ledger");
      console.log('Stock ledger response:', response.data);
      setLedgerData(response.data || []);
    } catch (error) {
      console.error("Error fetching ledger:", error);
      console.error("Error details:", error.response?.data || error.message);
      // Show user-friendly error message
      alert("Failed to load stock data. Please check if you have created any GRN records first.");
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (entry) => {
    if (!hasPermission("stock_ledger.dispense")) {
      alert("Permission denied");
      return;
    }
    
    if (window.confirm(`Are you sure you want to dispense ${entry.item_name} (Batch: ${entry.batch_no})?`)) {
      try {
        await api.post("/stocks/dispense", {
          item_name: entry.item_name,
          batch_no: entry.batch_no,
          reason: "Manual dispense from stock ledger"
        });
        alert("Item dispensed successfully");
        fetchLedgerData();
      } catch (error) {
        console.error("Error dispensing item:", error);
        alert("Failed to dispense item");
      }
    }
  };

  const handleViewAudit = async (entry) => {
    try {
      const response = await api.get(`/stocks/audit-logs/${entry.item_name}`);
      setAuditLogs(response.data);
      setSelectedItem(entry);
      setShowAuditModal(true);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      alert("Failed to fetch audit logs");
    }
  };

  const closeAuditModal = () => {
    setShowAuditModal(false);
    setSelectedItem(null);
    setAuditLogs([]);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Stock Ledger</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Item</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Batch No</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Transaction</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Qty In</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Qty Out</th>
              {hasPermission("stock_ledger.available_qty") && (
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Balance</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Reference</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 border-b">{entry.date}</td>
                <td className="px-4 py-3 border-b">{entry.item_name}</td>
                <td className="px-4 py-3 border-b">{entry.batch_no || "—"}</td>
                <td className="px-4 py-3 border-b">{entry.txn_type}</td>
                <td className="px-4 py-3 border-b text-green-600">{entry.qty_in || "—"}</td>
                <td className="px-4 py-3 border-b text-red-600">{entry.qty_out || "—"}</td>
                {hasPermission("stock_ledger.available_qty") && (
                <td className="px-4 py-3 border-b font-medium">{entry.balance}</td>
                )}
                <td className="px-4 py-3 border-b">{entry.ref_no}</td>
                <td className="px-4 py-3 border-b">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleViewAudit(entry)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      title="View Audit Log"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {hasPermission("stock_ledger.dispense") && (
                    <button 
                      onClick={() => handleDispense(entry)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Dispense
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Audit Log - {selectedItem?.item_name}</h2>
              <button 
                onClick={closeAuditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No audit logs found for this item.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Timestamp</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">User</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Action</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Description</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-sm">{log.timestamp}</td>
                        <td className="px-4 py-2 border-b text-sm">{log.user_name}</td>
                        <td className="px-4 py-2 border-b">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'DISPENSE' ? 'bg-red-100 text-red-800' :
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-b text-sm">{log.description}</td>
                        <td className="px-4 py-2 border-b text-sm">
                          {log.new_values && (
                            <div className="text-xs text-gray-600">
                              {log.new_values.batch_no && <div>Batch: {log.new_values.batch_no}</div>}
                              {log.new_values.reason && <div>Reason: {log.new_values.reason}</div>}
                              {log.new_values.disposal_method && <div>Method: {log.new_values.disposal_method}</div>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}