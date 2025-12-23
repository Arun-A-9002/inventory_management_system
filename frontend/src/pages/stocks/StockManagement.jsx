import { useEffect, useState } from "react";
import api from "../../api";

export default function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [movements, setMovements] = useState([]);
  
  // Adjustment state
  const [selectedItem, setSelectedItem] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("OPENING");
  const [adjustReason, setAdjustReason] = useState("");
  
  // Transfer state
  const [transferItem, setTransferItem] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [fromStore, setFromStore] = useState("");
  const [toStore, setToStore] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  
  // Issue state
  const [issueItem, setIssueItem] = useState("");
  const [issueQty, setIssueQty] = useState("");
  const [issueDept, setIssueDept] = useState("");
  const [issueReason, setIssueReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stocksRes, itemsRes, locationsRes, deptsRes, dashRes, movementsRes] = await Promise.all([
        api.get("/stocks/"),
        api.get("/stocks/items"),
        api.get("/inventory/locations/"),
        api.get("/stocks/departments"),
        api.get("/stocks/dashboard"),
        api.get("/stocks/movements?limit=10")
      ]);
      
      setStocks(stocksRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locationsRes.data || []);
      setDepartments(deptsRes.data || []);
      setDashboard(dashRes.data);
      setMovements(movementsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedItem || !adjustQty) {
      alert("Select item and quantity");
      return;
    }

    try {
      await api.post("/stocks/adjust", {
        item_name: selectedItem,
        adjustment_type: adjustType,
        quantity: parseFloat(adjustQty),
        reason: adjustReason || "Manual adjustment"
      });
      alert("Stock adjusted successfully");
      setSelectedItem("");
      setAdjustQty("");
      setAdjustReason("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || "Error adjusting stock");
    }
  };

  const handleTransfer = async () => {
    if (!transferItem || !transferQty || !fromStore || !toStore) {
      alert("Fill all transfer fields");
      return;
    }

    try {
      await api.post("/stocks/transfer", {
        item_name: transferItem,
        qty: parseFloat(transferQty),
        from_store: fromStore,
        to_store: toStore,
        transport_mode: "Internal",
        remarks: transferRemarks
      });
      alert("Stock transferred successfully");
      setTransferItem("");
      setTransferQty("");
      setFromStore("");
      setToStore("");
      setTransferRemarks("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || "Error transferring stock");
    }
  };

  const handleIssue = async () => {
    if (!issueItem || !issueQty || !issueDept || !requestedBy) {
      alert("Fill all issue fields");
      return;
    }

    try {
      await api.post("/stocks/issue", {
        item_name: issueItem,
        qty: parseFloat(issueQty),
        department: issueDept,
        requested_by: requestedBy,
        reason: issueReason || "Department requirement"
      });
      alert("Stock issued successfully");
      setIssueItem("");
      setIssueQty("");
      setIssueDept("");
      setRequestedBy("");
      setIssueReason("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || "Error issuing stock");
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* DASHBOARD SUMMARY - TOP OF PAGE */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded border">
            <h3 className="font-semibold text-blue-800">Total Items</h3>
            <p className="text-2xl font-bold text-blue-600">{dashboard.summary?.total_items || 0}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded border">
            <h3 className="font-semibold text-red-800">Low Stock Alerts</h3>
            <p className="text-2xl font-bold text-red-600">{dashboard.summary?.low_stock_count || 0}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded border">
            <h3 className="font-semibold text-yellow-800">Expiry Alerts</h3>
            <p className="text-2xl font-bold text-yellow-600">{dashboard.summary?.expiry_alerts_count || 0}</p>
          </div>
        </div>
      )}

      {/* STOCK OVERVIEW */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stock Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Item</th>
                <th className="border p-2">Location</th>
                <th className="border p-2">Available Qty</th>
                <th className="border p-2">Min Stock</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id}>
                  <td className="border p-2">
                    <div className="font-medium">{s.item_name}</div>
                    <div className="text-xs text-gray-500">{s.item_code}</div>
                  </td>
                  <td className="border p-2">{s.location}</td>
                  <td className="border p-2 font-semibold">{s.available_qty}</td>
                  <td className="border p-2">{s.min_stock}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      s.available_qty <= s.min_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {s.available_qty <= s.min_stock ? 'Low Stock' : 'Good'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* STOCK ADJUSTMENTS */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stock Adjustments & Opening Stock</h2>
        <div className="bg-white p-4 border rounded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <select
              className="border p-2 rounded"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            
            <select
              className="border p-2 rounded"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value)}
            >
              <option value="OPENING">Opening Stock</option>
              <option value="INCREASE">Increase</option>
              <option value="DECREASE">Decrease</option>
            </select>
            
            <input
              type="number"
              placeholder="Quantity"
              className="border p-2 rounded"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
            
            <input
              type="text"
              placeholder="Reason"
              className="border p-2 rounded"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleAdjustment}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Adjustment
          </button>
        </div>
      </section>

      {/* STOCK TRANSFER */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stock Transfer (Inter-Store)</h2>
        <div className="bg-white p-4 border rounded">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <select
              className="border p-2 rounded"
              value={transferItem}
              onChange={(e) => setTransferItem(e.target.value)}
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            
            <input
              type="number"
              placeholder="Quantity"
              className="border p-2 rounded"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
            />
            
            <select
              className="border p-2 rounded"
              value={fromStore}
              onChange={(e) => setFromStore(e.target.value)}
            >
              <option value="">From Store</option>
              {locations.map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
            
            <select
              className="border p-2 rounded"
              value={toStore}
              onChange={(e) => setToStore(e.target.value)}
            >
              <option value="">To Store</option>
              {locations.map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Remarks"
              className="border p-2 rounded"
              value={transferRemarks}
              onChange={(e) => setTransferRemarks(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleTransfer}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Transfer Stock
          </button>
        </div>
      </section>

      {/* STOCK ISSUE */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stock Issue to Departments</h2>
        <div className="bg-white p-4 border rounded">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <select
              className="border p-2 rounded"
              value={issueItem}
              onChange={(e) => setIssueItem(e.target.value)}
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            
            <input
              type="number"
              placeholder="Quantity"
              className="border p-2 rounded"
              value={issueQty}
              onChange={(e) => setIssueQty(e.target.value)}
            />
            
            <select
              className="border p-2 rounded"
              value={issueDept}
              onChange={(e) => setIssueDept(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Requested By"
              className="border p-2 rounded"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
            />
            
            <input
              type="text"
              placeholder="Reason"
              className="border p-2 rounded"
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleIssue}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Issue Stock
          </button>
        </div>
      </section>

      {/* DASHBOARD & ALERTS */}
      <section>
        <h2 className="text-xl font-bold mb-4">Real-Time Stock Dashboard & Alerts</h2>
        
        {/* Expiry Alerts */}
        {dashboard?.expiry_alerts?.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2 text-yellow-700">⚠️ Expiry Alerts</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              {dashboard.expiry_alerts.map((alert, idx) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span className="font-medium">{alert.item_name}</span>
                  <span className="text-sm text-yellow-600">
                    Batch: {alert.batch_no} | Expires in {alert.days_to_expiry} days | Qty: {alert.qty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Stock Movements */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">📊 Recent Stock Movements</h3>
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Item</th>
                  <th className="border p-2">Type</th>
                  <th className="border p-2">In</th>
                  <th className="border p-2">Out</th>
                  <th className="border p-2">Balance</th>
                  <th className="border p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement, idx) => (
                  <tr key={idx}>
                    <td className="border p-2 font-medium">{movement.item_name}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        movement.txn_type === 'OPENING' ? 'bg-blue-100 text-blue-800' :
                        movement.txn_type === 'ISSUE' ? 'bg-red-100 text-red-800' :
                        movement.txn_type === 'TRANSFER' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {movement.txn_type}
                      </span>
                    </td>
                    <td className="border p-2 text-green-600">{movement.qty_in || '-'}</td>
                    <td className="border p-2 text-red-600">{movement.qty_out || '-'}</td>
                    <td className="border p-2 font-semibold">{movement.balance}</td>
                    <td className="border p-2 text-sm text-gray-600">{movement.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}