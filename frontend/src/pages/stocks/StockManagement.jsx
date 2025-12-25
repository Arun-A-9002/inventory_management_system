import { useEffect, useState } from "react";
import api from "../../api";

export default function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState({});
  const [viewModal, setViewModal] = useState({ isOpen: false, item: null });
  


  const handleBatchChange = (itemId, batchIndex) => {
    setSelectedBatches(prev => ({
      ...prev,
      [itemId]: batchIndex === "" ? null : batchIndex
    }));
  };

  const getSelectedBatch = (item) => {
    const selectedIndex = selectedBatches[item.id];
    if (selectedIndex === null || selectedIndex === undefined) return null;
    return item.batches && item.batches.length > 0 ? item.batches[selectedIndex] : null;
  };

  const getDisplayQuantity = (item) => {
    const selectedBatch = getSelectedBatch(item);
    return selectedBatch ? selectedBatch.qty : item.available_qty;
  };

  const getDisplayLocation = (item) => {
    const selectedBatch = getSelectedBatch(item);
    return selectedBatch ? selectedBatch.location : item.location;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate.split('/').reverse().join('-'));
    return expiry <= new Date();
  };

  const handleViewItem = (item) => {
    setViewModal({ isOpen: true, item });
  };

  const handleDispense = async (item, batchNo) => {
    const batchIndex = item.batches.findIndex(b => b.batch_no === batchNo);
    const batch = item.batches[batchIndex];
    const quantity = batch.qty;
    
    if (window.confirm(`Dispense entire batch ${batchNo} (${quantity} units) for ${item.item_name}?`)) {
      try {
        await api.post(`/stock-overview/dispense/${item.id}?batch_index=${batchIndex}&quantity=${quantity}`);
        alert('Item dispensed successfully');
        loadData();
        setViewModal({ isOpen: false, item: null });
      } catch (error) {
        alert('Failed to dispense item: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stocksRes, itemsRes, locationsRes, deptsRes, dashRes] = await Promise.all([
        api.get("/stock-overview/"),
        api.get("/stocks/items"),
        api.get("/inventory/locations/"),
        api.get("/stocks/departments"),
        api.get("/stocks/dashboard")
      ]);
      
      setStocks(stocksRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locationsRes.data || []);
      setDepartments(deptsRes.data || []);
      setDashboard(dashRes.data);
      
      // Debug: Log stock data to see structure
      console.log('Stock data:', stocksRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
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
                <th className="border p-2">Warranty</th>
                <th className="border p-2">Batch Number</th>
                <th className="border p-2">Expiry</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id}>
                  <td className="border p-2">
                    <div className="font-medium">{s.item_name}</div>
                    <div className="text-xs text-gray-500">{s.item_code}</div>
                  </td>
                  <td className="border p-2">{getDisplayLocation(s)}</td>
                  <td className="border p-2 font-semibold">{getDisplayQuantity(s)}</td>
                  <td className="border p-2">{s.min_stock}</td>
                  <td className="border p-2">
                    {(() => {
                      const selectedBatch = getSelectedBatch(s);
                      const warranty = selectedBatch?.warranty || s.warranty;
                      
                      if (warranty && warranty.end_date) {
                        return (
                          <div className="text-xs">
                            <div className={`${
                              new Date(warranty.end_date) <= new Date() 
                                ? 'text-red-600 font-semibold' 
                                : new Date(warranty.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-orange-600 font-semibold'
                                : ''
                            }`}>
                              Warranty: {warranty.end_date}
                            </div>
                            {warranty.start_date && <div>Start: {warranty.start_date}</div>}
                          </div>
                        );
                      }
                      return <span className="text-gray-400">—</span>;
                    })()}
                  </td>
                  <td className="border p-2">
                    {s.batches && s.batches.length > 0 ? (
                      <select 
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={selectedBatches[s.id] ?? ""}
                        onChange={(e) => handleBatchChange(s.id, e.target.value)}
                      >
                        <option value="">
                          {s.batches.length > 1 ? `All Batches` : s.batches[0]?.batch_no}
                        </option>
                        {s.batches.length > 1 && s.batches.map((batch, index) => (
                          <option key={index} value={index}>
                            {batch.batch_no}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {(() => {
                      const selectedBatch = getSelectedBatch(s);
                      return selectedBatch && selectedBatch.expiry_date ? (
                        <div className="text-xs">
                          <div className={`${
                            new Date(selectedBatch.expiry_date) <= new Date() 
                              ? 'text-red-600 font-semibold' 
                              : new Date(selectedBatch.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'text-orange-600 font-semibold'
                              : ''
                          }`}>
                            Expiry: {selectedBatch.expiry_date}
                          </div>
                          {selectedBatch.mfg_date && <div>Mfg: {selectedBatch.mfg_date}</div>}
                        </div>
                      ) : s.expiry_date && s.expiry_date !== "—" ? (
                        <div className="text-xs">
                          <div>Expiry: {s.expiry_date}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      );
                    })()}
                  </td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      getDisplayQuantity(s) <= s.min_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {getDisplayQuantity(s) <= s.min_stock ? 'Low Stock' : 'Good'}
                    </span>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleViewItem(s)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="View Details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>



      {/* DASHBOARD & ALERTS */}
      <section>
        <h2 className="text-xl font-bold mb-4">Real-Time Stock Dashboard & Alerts</h2>
      </section>

      {/* Stock Details Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Stock Details</h2>
              <button 
                onClick={() => setViewModal({ isOpen: false, item: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {viewModal.item && (
              <div className="space-y-4">
                {/* Item Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                  <div><strong>Item Name:</strong> {viewModal.item.item_name}</div>
                  <div><strong>Item Code:</strong> {viewModal.item.item_code}</div>
                  <div><strong>Location:</strong> {viewModal.item.location}</div>
                  <div><strong>Total Quantity:</strong> {viewModal.item.available_qty}</div>
                  <div><strong>Min Stock:</strong> {viewModal.item.min_stock}</div>
                  <div><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      viewModal.item.available_qty <= viewModal.item.min_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {viewModal.item.available_qty <= viewModal.item.min_stock ? 'Low Stock' : 'Good'}
                    </span>
                  </div>
                </div>

                {/* Batches Table */}
                {viewModal.item.batches && viewModal.item.batches.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Batch Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border px-3 py-2 text-left">Batch No</th>
                            <th className="border px-3 py-2 text-center">Quantity</th>
                            <th className="border px-3 py-2 text-left">Location</th>
                            <th className="border px-3 py-2 text-left">Expiry Date</th>
                            <th className="border px-3 py-2 text-left">Mfg Date</th>
                            <th className="border px-3 py-2 text-center">Status</th>
                            <th className="border px-3 py-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewModal.item.batches.map((batch, idx) => {
                            const expired = isExpired(batch.expiry_date);
                            return (
                              <tr key={idx} className={expired ? 'bg-red-50' : ''}>
                                <td className="border px-3 py-2 font-medium">{batch.batch_no}</td>
                                <td className="border px-3 py-2 text-center">{batch.qty}</td>
                                <td className="border px-3 py-2">{batch.location || viewModal.item.location}</td>
                                <td className="border px-3 py-2">
                                  <span className={expired ? 'text-red-600 font-semibold' : ''}>
                                    {batch.expiry_date || '—'}
                                  </span>
                                </td>
                                <td className="border px-3 py-2">{batch.mfg_date || '—'}</td>
                                <td className="border px-3 py-2 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    expired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {expired ? 'Expired' : 'Good'}
                                  </span>
                                </td>
                                <td className="border px-3 py-2 text-center">
                                  {expired && (
                                    <button
                                      onClick={() => handleDispense(viewModal.item, batch.batch_no)}
                                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                                    >
                                      Dispense
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <div className="text-sm space-y-1">
                        <div>Total Batches: {viewModal.item.batches?.length || 0}</div>
                        <div>Total Quantity: {viewModal.item.available_qty}</div>
                        <div>Expired Batches: {viewModal.item.batches?.filter(b => isExpired(b.expiry_date)).length || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}