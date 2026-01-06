import React, { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";

export default function StockLedger() {
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const response = await api.get("/stocks/ledger");
      setLedgerData(response.data);
    } catch (error) {
      console.error("Error fetching ledger:", error);
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
              {hasPermission("stock_ledger.dispense") && (
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Actions</th>
              )}
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
                {hasPermission("stock_ledger.dispense") && (
                <td className="px-4 py-3 border-b">
                  <button 
                    onClick={() => handleDispense(entry)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Dispense
                  </button>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}