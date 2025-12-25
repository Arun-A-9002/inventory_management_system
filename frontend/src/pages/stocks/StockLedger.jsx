import React, { useState, useEffect } from "react";
import api from "../../api";

export default function StockLedger() {
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedgerData();
  }, []);

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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Balance</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Reference</th>
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
                <td className="px-4 py-3 border-b font-medium">{entry.balance}</td>
                <td className="px-4 py-3 border-b">{entry.ref_no}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}