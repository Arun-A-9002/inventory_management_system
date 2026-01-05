import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

export default function StockOverview() {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState({});
  const [dispenseQuantities, setDispenseQuantities] = useState({});

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/stock-overview/`);
      console.log('Stock data received:', response.data);
      setStockData(response.data);
    } catch (err) {
      setError("Failed to fetch stock data");
      console.error("Error fetching stock data:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusColor = (qty, minStock) => {
    if (qty <= minStock) {
      return "text-red-600 bg-red-100";
    }
    return "text-green-600 bg-green-100";
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate || expiryDate === "—") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    // Handle DD/MM/YYYY format
    const parts = expiryDate.split('/');
    if (parts.length === 3) {
      const expiry = new Date(parts[2], parts[1] - 1, parts[0]); // Year, Month (0-indexed), Day
      return expiry < today;
    }
    return false;
  };

  const getExpiredBatches = (batches) => {
    if (!batches) return [];
    return batches.filter(batch => isExpired(batch.expiry_date));
  };

  const getTotalExpiredQty = (batches) => {
    return getExpiredBatches(batches).reduce((total, batch) => total + batch.qty, 0);
  };

  const handleDispenseQuantityChange = (itemId, quantity) => {
    setDispenseQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleDispense = async (item) => {
    const selectedBatchIndex = selectedBatches[item.id];
    const quantity = parseInt(dispenseQuantities[item.id] || 0);
    
    console.log('Dispense clicked:', { itemId: item.id, selectedBatchIndex, quantity });
    
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    if (selectedBatchIndex === null || selectedBatchIndex === undefined) {
      alert('Please select a batch');
      return;
    }
    
    const selectedBatch = item.batches[selectedBatchIndex];
    if (quantity > selectedBatch.qty) {
      alert('Quantity exceeds available stock in selected batch');
      return;
    }
    
    try {
      console.log('Making API call:', `${API_BASE_URL}/stock-overview/dispense/${item.id}?batch_index=${selectedBatchIndex}&quantity=${quantity}`);
      const response = await axios.post(`${API_BASE_URL}/stock-overview/dispense/${item.id}?batch_index=${selectedBatchIndex}&quantity=${quantity}`);
      console.log('API response:', response.data);
      
      setDispenseQuantities(prev => ({ ...prev, [item.id]: '' }));
      setSelectedBatches(prev => ({ ...prev, [item.id]: null }));
      
      fetchStockData();
      
      alert(`Successfully dispensed ${quantity} units`);
    } catch (err) {
      console.error('Dispense error:', err);
      alert('Failed to dispense stock: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDispenseExpired = async (item) => {
    const expiredBatches = getExpiredBatches(item.batches);
    if (expiredBatches.length === 0) {
      alert('No expired batches to dispense');
      return;
    }
    
    const quantity = parseInt(dispenseQuantities[item.id] || 0);
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    // Find the first expired batch with sufficient quantity
    let targetBatchIndex = -1;
    for (let i = 0; i < item.batches.length; i++) {
      if (isExpired(item.batches[i].expiry_date) && item.batches[i].qty >= quantity) {
        targetBatchIndex = i;
        break;
      }
    }
    
    if (targetBatchIndex === -1) {
      alert('No expired batch has sufficient quantity');
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/stock-overview/dispense/${item.id}?batch_index=${targetBatchIndex}&quantity=${quantity}`);
      
      setDispenseQuantities(prev => ({ ...prev, [item.id]: '' }));
      fetchStockData();
      
      alert(`Successfully dispensed ${quantity} units from expired batch`);
    } catch (err) {
      console.error('Dispense expired error:', err);
      alert('Failed to dispense expired stock: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Stock Overview</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Stock Overview</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Stock Overview</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Item</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Available Qty</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Min Stock</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Expired Batches</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Batch Number</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Expiry</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {stockData.map((item) => {
              console.log(`Rendering item: ${item.item_name}, batches:`, item.batches);
              const selectedBatch = getSelectedBatch(item);
              const displayQty = getDisplayQuantity(item);
              const expiredBatches = getExpiredBatches(item.batches);
              const expiredQty = getTotalExpiredQty(item.batches);
              const hasExpiredBatches = expiredBatches.length > 0;
              const stockStatus = displayQty <= item.min_stock ? "Low Stock" : "Good";
              const status = hasExpiredBatches ? "Expired" : stockStatus;
              const batchStatus = selectedBatch && isExpired(selectedBatch.expiry_date) ? "Expired" : status;
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b">
                    <div>
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-500">{item.item_code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">{item.location}</td>
                  <td className="px-4 py-3 border-b text-gray-700">{displayQty}</td>
                  <td className="px-4 py-3 border-b text-gray-700">{item.min_stock}</td>
                  <td className="px-4 py-3 border-b">
                    {hasExpiredBatches ? (
                      <div className="text-red-600">
                        <div className="font-medium">{expiredBatches.length} batch(es)</div>
                        <div className="text-xs">{expiredQty} units expired</div>
                        <div className="text-xs mt-1">
                          {expiredBatches.map((batch, idx) => (
                            <div key={idx} className="text-red-500">
                              {batch.batch_no}: {batch.qty} units
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-green-600">No expired batches</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b">
                    {(() => {
                      console.log(`Item ${item.item_name} batches:`, item.batches);
                      return item.batches && item.batches.length > 0 ? (
                        <select 
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={selectedBatches[item.id] ?? ""}
                          onChange={(e) => handleBatchChange(item.id, e.target.value)}
                        >
                          <option value="">
                            {item.batches.length > 1 ? `All Batches - ${item.location}` : `${item.batches[0]?.batch_no} - ${item.batches[0]?.location || item.location}`}
                          </option>
                          {item.batches.length > 1 && item.batches.map((batch, index) => (
                            <option key={index} value={index}>
                              {batch.batch_no} - {batch.location || item.location}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-500">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="text-gray-700">
                      {selectedBatch && selectedBatch.expiry_date ? (
                        <>
                          <div>Expiry: {selectedBatch.expiry_date}</div>
                          {selectedBatch.mfg_date && (
                            <div className="text-xs text-gray-500">Mfg: {selectedBatch.mfg_date}</div>
                          )}
                        </>
                      ) : item.batches && item.batches.length > 0 && item.batches[0]?.expiry_date ? (
                        <>
                          <div>Expiry: {item.batches[0].expiry_date}</div>
                          {item.batches[0].mfg_date && (
                            <div className="text-xs text-gray-500">Mfg: {item.batches[0].mfg_date}</div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === "Expired" || batchStatus === "Expired"
                          ? "text-red-600 bg-red-100" 
                          : getStatusColor(displayQty, item.min_stock)
                      }`}>
                        {status === "Expired" ? "Has Expired Batches" : batchStatus}
                      </span>
                      {hasExpiredBatches && (
                        <div className="text-xs text-red-500 font-medium">
                          ⚠️ {expiredBatches.length} expired batch(es)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="number"
                        placeholder="Qty"
                        className="border rounded px-2 py-1 text-sm w-16"
                        value={dispenseQuantities[item.id] || ''}
                        onChange={(e) => handleDispenseQuantityChange(item.id, e.target.value)}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDispense(item)}
                          className={`px-3 py-1 rounded text-sm text-white ${
                            selectedBatch && isExpired(selectedBatch.expiry_date)
                              ? "bg-orange-500 hover:bg-orange-600"
                              : "bg-red-500 hover:bg-red-600"
                          }`}
                          disabled={(!selectedBatches[item.id] && selectedBatches[item.id] !== 0) || !dispenseQuantities[item.id]}
                        >
                          {selectedBatch && isExpired(selectedBatch.expiry_date) ? "Dispense Expired" : "Dispense"}
                        </button>
                        {hasExpiredBatches && (
                          <button
                            onClick={() => handleDispenseExpired(item)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-medium"
                            disabled={!dispenseQuantities[item.id]}
                            title={`Dispense from ${expiredBatches.length} expired batch(es)`}
                          >
                            ⚠️ Expired
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}