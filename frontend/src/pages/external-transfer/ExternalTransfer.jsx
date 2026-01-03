import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function ExternalTransfer() {
  const [transfers, setTransfers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [itemBatches, setItemBatches] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnProcessing, setShowReturnProcessing] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState(null);
  const [transferItems, setTransferItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [form, setForm] = useState({
    return_type: 'External',
    location: '',
    staff_name: '',
    staff_id: '',
    staff_location: '',
    return_date: '',
    items: []
  });

  useEffect(() => {
    loadTransfers();
    loadLocations();
  }, []);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/external-transfers/');
      setTransfers(response.data || []);
    } catch (err) {
      console.error('Failed to load transfers:', err);
      showMessage('Failed to load transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await api.get('/inventory/locations/');
      setLocations(response.data || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const fetchItemsForLocation = async (location) => {
    try {
      const res = await api.get(`/stock-overview/by-location/${encodeURIComponent(location)}`);
      const stockData = res.data || [];
      const locationItems = stockData.map(stock => ({
        id: stock.id,
        name: stock.item_name,
        item_code: stock.item_code
      }));
      return locationItems;
    } catch (err) {
      console.error('Failed to fetch items for location:', err);
      return [];
    }
  };

  const fetchBatchesForItem = async (itemName) => {
    try {
      if (form.location) {
        const res = await api.get(`/stock-overview/by-location/${encodeURIComponent(form.location)}`);
        const stockData = res.data || [];
        const item = stockData.find(stock => stock.item_name === itemName);
        
        if (item && item.batches) {
          return item.batches.filter(batch => batch.qty > 0);
        }
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      return [];
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSubmit = async () => {
    if (!form.staff_name || !form.staff_id || !form.staff_location || form.items.length === 0) {
      showMessage('All fields and at least one item are required', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        location: form.location || 'Default Location',
        staff_name: form.staff_name,
        staff_id: form.staff_id,
        staff_location: form.staff_location,
        reason: `Staff allocation to ${form.staff_name} (ID: ${form.staff_id})`,
        items: form.items.map(item => ({
          item_name: item.item_name,
          batch_no: item.batch_no,
          quantity: parseInt(item.quantity),
          reason: item.reason || '',
          return_date: item.return_date || null
        }))
      };
      
      console.log('Submitting payload:', payload);
      const response = await api.post('/api/external-transfers/', payload);
      console.log('Response:', response.data);
      
      showMessage(`External transfer created successfully: ${response.data.transfer_no}`, 'success');
      resetForm();
      loadTransfers();
    } catch (err) {
      console.error('Submit error:', err);
      showMessage('Failed to create transfer: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      return_type: 'External',
      location: '',
      staff_name: '',
      staff_id: '',
      staff_location: '',
      return_date: '',
      items: []
    });
    setItems([]);
    setItemBatches({});
    setShowCreateModal(false);
  };

  const addLineItem = () => {
    setForm({
      ...form,
      items: [...form.items, { item_name: '', quantity: '', batch_no: '', reason: '', return_date: '' }]
    });
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setForm({ ...form, items: updatedItems });
  };

  const removeLineItem = (index) => {
    const updatedItems = form.items.filter((_, idx) => idx !== index);
    setForm({ ...form, items: updatedItems });
  };

  const handleSendTransfer = async (transferId) => {
    try {
      setLoading(true);
      const response = await api.put(`/api/external-transfers/${transferId}/send`);
      showMessage('Transfer sent successfully', 'success');
      loadTransfers();
    } catch (err) {
      console.error('Send error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
      showMessage('Failed to send transfer: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openReturnProcessing = async (transferId) => {
    try {
      const res = await api.get(`/api/external-transfers/${transferId}/items`);
      setTransferItems(res.data || []);
      setSelectedTransferId(transferId);
      setShowReturnProcessing(true);
    } catch (err) {
      console.error('Failed to fetch transfer items:', err);
      showMessage('Failed to fetch transfer items', 'error');
    }
  };

  const processTransferReturn = async (item, returnQty) => {
    try {
      const res = await api.post(`/api/external-transfers/${selectedTransferId}/process-return`, {
        item_name: item.item_name,
        batch_no: item.batch_no,
        quantity: returnQty
      });
      showMessage(res.data.message, 'success');
      await openReturnProcessing(selectedTransferId); // Refresh
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to process return', 'error');
    }
  };

  const handleReturnTransfer = (transfer) => {
    setSelectedTransfer(transfer);
    const items = transfer.items.map(item => ({
      item_id: item.id,
      item_name: item.item_name,
      batch_no: item.batch_no,
      original_quantity: item.quantity,
      already_returned: (item.returned_quantity || 0) + (item.damaged_quantity || 0),
      remaining_quantity: item.quantity - ((item.returned_quantity || 0) + (item.damaged_quantity || 0)),
      returned_quantity: 0,
      damaged_quantity: 0,
      damage_reason: ''
    }));
    setReturnItems(items);
    setShowReturnModal(true);
  };

  const handleReturnSubmit = async () => {
    // Check if any items have return quantities
    const hasReturns = returnItems.some(item => 
      (parseInt(item.returned_quantity) || 0) > 0 || (parseInt(item.damaged_quantity) || 0) > 0
    );
    
    if (!hasReturns) {
      showMessage('Please enter return quantities for at least one item', 'error');
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        items: returnItems.map(item => ({
          item_id: item.item_id,
          returned_quantity: parseInt(item.returned_quantity) || 0,
          damaged_quantity: parseInt(item.damaged_quantity) || 0,
          damage_reason: item.damage_reason || null
        }))
      };
      
      console.log('Return payload:', payload);
      const response = await api.put(`/api/external-transfers/${selectedTransfer.id}/return`, payload);
      console.log('Return response:', response.data);
      showMessage('Items returned successfully', 'success');
      loadTransfers();
      setShowReturnModal(false);
      setReturnItems([]);
    } catch (err) {
      console.error('Return error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
      showMessage('Failed to return items: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReturnItem = (index, field, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate remaining quantity in real-time
    if (field === 'returned_quantity' || field === 'damaged_quantity') {
      const item = updatedItems[index];
      const currentReturned = parseInt(item.returned_quantity) || 0;
      const currentDamaged = parseInt(item.damaged_quantity) || 0;
      const totalCurrentReturn = currentReturned + currentDamaged;
      
      // Update remaining quantity: original - already_returned - current_return
      item.remaining_quantity = item.original_quantity - item.already_returned - totalCurrentReturn;
    }
    
    setReturnItems(updatedItems);
  };

  const handleEdit = (transfer) => {
    setSelectedTransfer(transfer);
    setForm({
      location: transfer.location,
      staff_name: transfer.staff_name,
      staff_id: transfer.staff_id,
      staff_location: transfer.staff_location,
      items: transfer.items || []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTransfer) return;
    
    try {
      setLoading(true);
      const payload = {
        location: form.location,
        staff_name: form.staff_name,
        staff_id: form.staff_id,
        staff_location: form.staff_location,
        items: form.items.map(item => ({
          item_name: item.item_name,
          batch_no: item.batch_no,
          quantity: parseInt(item.quantity),
          reason: item.reason || '',
          return_date: item.return_date || null
        }))
      };
      
      await api.put(`/api/external-transfers/${selectedTransfer.id}`, payload);
      showMessage('Transfer updated successfully', 'success');
      loadTransfers();
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      console.error('Edit error:', err);
      showMessage('Failed to update transfer: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">External Transfer</h1>
                <p className="text-sm text-slate-600">Transfer items to external locations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-700">📦 Active Transfers: {transfers.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  External Transfers
                </h2>
                <p className="text-sm text-slate-600 mt-1">Manage transfers to external locations</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Transfer
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Loading transfers...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Transfer Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Staff Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Staff Location</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Date</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-16">
                        <div className="text-slate-400">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <p className="text-lg font-medium text-slate-500">No external transfers found</p>
                          <p className="text-sm text-slate-400 mt-1">Create your first transfer to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-slate-900">{transfer.transfer_no}</div>
                            <div className="text-sm text-slate-500">{transfer.reason}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Items: {transfer.items?.length || 0} | Location: {transfer.location || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{transfer.staff_name || 'N/A'}</div>
                          <div className="text-sm text-slate-500">ID: {transfer.staff_id || 'N/A'}</div>
                          <div className="text-xs text-slate-400">From: {transfer.staff_location || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{transfer.staff_location || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                            {transfer.status || 'DRAFT'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-slate-500">
                            Created: {new Date(transfer.created_at).toLocaleDateString()}
                          </div>
                          {transfer.sent_at && (
                            <div className="text-xs text-blue-600">
                              Sent: {new Date(transfer.sent_at).toLocaleDateString()}
                            </div>
                          )}
                          {transfer.returned_at && (
                            <div className="text-xs text-green-600">
                              Returned: {new Date(transfer.returned_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {transfer.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => handleEdit(transfer)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleSendTransfer(transfer.id)}
                                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                                >
                                  Send
                                </button>
                              </>
                            )}
                            {transfer.status === 'SENT' && (
                              <>
                                {transfer.items?.some(item => {
                                  const totalReturned = (item.returned_quantity || 0) + (item.damaged_quantity || 0);
                                  return item.quantity > totalReturned;
                                }) ? (
                                  <>
                                    <button
                                      onClick={() => handleReturnTransfer(transfer)}
                                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                    >
                                      Return
                                    </button>
                                    <button
                                      onClick={() => openReturnProcessing(transfer.id)}
                                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                                    >
                                      Process
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-sm">Fully Returned</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Transfer (DRAFT)</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={form.location}
                  onChange={async (e) => {
                    const selectedLocation = e.target.value;
                    setForm({...form, location: selectedLocation});
                    
                    if (selectedLocation) {
                      const locationItems = await fetchItemsForLocation(selectedLocation);
                      setItems(locationItems);
                    } else {
                      setItems([]);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {locations.filter(loc => loc.location_type === 'internal').map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Name</label>
                  <input
                    type="text"
                    value={form.staff_name}
                    onChange={(e) => setForm({...form, staff_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Staff ID</label>
                  <input
                    type="text"
                    value={form.staff_id}
                    onChange={(e) => setForm({...form, staff_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter staff ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Location</label>
                  <select
                    value={form.staff_location}
                    onChange={(e) => setForm({...form, staff_location: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff Location</option>
                    {locations.filter(loc => loc.location_type === 'external').map(location => (
                      <option key={location.id} value={location.name}>
                        {location.name} ({location.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">Line items</label>
                  <button
                    onClick={addLineItem}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    + Add line
                  </button>
                </div>
                
                {form.items.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <select className="border rounded px-2 py-1 text-sm" disabled>
                        <option>Select Item</option>
                      </select>
                      <select className="border rounded px-2 py-1 text-sm" disabled>
                        <option>Select Batch</option>
                      </select>
                      <input type="number" placeholder="Quantity" className="border rounded px-2 py-1 text-sm w-20" disabled />
                      <input type="text" placeholder="Reason" className="border rounded px-2 py-1 text-sm" disabled />
                      <input type="date" className="border rounded px-2 py-1 text-sm" disabled />
                    </div>
                    <p className="text-sm mt-2">Click "+ Add line" to add items</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-3 p-3 border rounded">
                        <select
                          value={item.item_name || ''}
                          onChange={async (e) => {
                            const selectedItemName = e.target.value;
                            updateLineItem(index, 'item_name', selectedItemName);
                            
                            if (selectedItemName) {
                              const batches = await fetchBatchesForItem(selectedItemName);
                              setItemBatches(prev => ({ ...prev, [index]: batches }));
                            }
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select Item</option>
                          {items.map(itm => (
                            <option key={itm.id} value={itm.name}>
                              {itm.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={item.batch_no || ''}
                          onChange={(e) => {
                            updateLineItem(index, 'batch_no', e.target.value);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select Batch</option>
                          {(itemBatches[index] || []).map(batch => (
                            <option key={batch.batch_no} value={batch.batch_no}>
                              {batch.batch_no} (Qty: {batch.qty})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Reason"
                          value={item.reason}
                          onChange={(e) => updateLineItem(index, 'reason', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          value={item.return_date || ''}
                          onChange={(e) => updateLineItem(index, 'return_date', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Submit Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Transfer - {selectedTransfer.transfer_no}</h2>
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({...form, location: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {locations.filter(loc => loc.location_type === 'internal').map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staff Name</label>
                  <input
                    type="text"
                    value={form.staff_name}
                    onChange={(e) => setForm({...form, staff_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Staff ID</label>
                  <input
                    type="text"
                    value={form.staff_id}
                    onChange={(e) => setForm({...form, staff_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Staff Location</label>
                <input
                  type="text"
                  value={form.staff_location}
                  onChange={(e) => setForm({...form, staff_location: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Return Items - {selectedTransfer.transfer_no}</h2>
              <button
                onClick={() => { setShowReturnModal(false); setReturnItems([]); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">Staff: {selectedTransfer.staff_name} ({selectedTransfer.staff_id})</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Location</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Batch</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Original Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Return Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Good Return</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Damaged</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Damage Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-sm">{item.item_name}</td>
                      <td className="px-4 py-2 text-sm">{selectedTransfer.location}</td>
                      <td className="px-4 py-2 text-sm">{item.batch_no}</td>
                      <td className="px-4 py-2 text-sm font-medium">{item.original_quantity}</td>
                      <td className="px-4 py-2 text-sm font-medium">{(parseInt(item.returned_quantity) || 0) + (parseInt(item.damaged_quantity) || 0)}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={item.remaining_quantity - (parseInt(item.damaged_quantity) || 0)}
                          value={item.returned_quantity}
                          onChange={(e) => updateReturnItem(index, 'returned_quantity', e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={item.remaining_quantity - (parseInt(item.returned_quantity) || 0)}
                          value={item.damaged_quantity}
                          onChange={(e) => updateReturnItem(index, 'damaged_quantity', e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.damage_reason}
                          onChange={(e) => updateReturnItem(index, 'damage_reason', e.target.value)}
                          placeholder="Reason for damage"
                          className="w-full border rounded px-2 py-1 text-sm"
                          disabled={!item.damaged_quantity || item.damaged_quantity === '0'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => { setShowReturnModal(false); setReturnItems([]); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Returns'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Processing Modal */}
      {showReturnProcessing && selectedTransferId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Return Items - ET{selectedTransferId}</h2>
              <button onClick={() => setShowReturnProcessing(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Item</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Location</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Batch</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Original Qty</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Return Qty</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Good Return</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Damaged</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Damage Reason & Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transferItems.map((item, index) => {
                    const returnedQty = item.returned_qty || 0;
                    const remainingQty = item.qty - returnedQty;
                    
                    return (
                      <TransferReturnRow
                        key={index}
                        item={item}
                        returnedQty={returnedQty}
                        remainingQty={remainingQty}
                        onProcess={processTransferReturn}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-6">
              <button onClick={() => setShowReturnProcessing(false)} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Process Returns</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransferReturnRow({ item, returnedQty, remainingQty, onProcess }) {
  const [returnQty, setReturnQty] = useState(0);
  const [goodReturn, setGoodReturn] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [damageReason, setDamageReason] = useState('');
  
  const handleReturnQtyChange = (value) => {
    const qty = Math.min(value, remainingQty);
    setReturnQty(qty);
    setGoodReturn(qty);
    setDamaged(0);
  };
  
  const handleGoodReturnChange = (value) => {
    const good = Math.min(value, returnQty);
    setGoodReturn(good);
    setDamaged(returnQty - good);
  };
  
  const handleDamagedChange = (value) => {
    const dmg = Math.min(value, returnQty);
    setDamaged(dmg);
    setGoodReturn(returnQty - dmg);
  };
  
  const handleProcessReturn = () => {
    if (returnQty > 0) {
      onProcess(item, returnQty);
      setReturnQty(0);
      setGoodReturn(0);
      setDamaged(0);
      setDamageReason('');
    }
  };
  
  return (
    <tr className={remainingQty <= 0 ? 'bg-green-50' : 'bg-white'}>
      <td className="border border-gray-300 px-4 py-3">
        <div className="font-medium">{item.item_name}</div>
        {returnedQty > 0 && <div className="text-sm text-green-600">Returned: {returnedQty}/{item.qty}</div>}
        {remainingQty <= 0 && <div className="text-sm text-green-600 font-medium">✓ Fully Returned</div>}
      </td>
      <td className="border border-gray-300 px-4 py-3">main</td>
      <td className="border border-gray-300 px-4 py-3">{item.batch_no}</td>
      <td className="border border-gray-300 px-4 py-3 text-center">{item.qty}</td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        {remainingQty > 0 ? (
          <input 
            type="number" 
            min="0" 
            max={remainingQty} 
            value={returnQty} 
            onChange={(e) => handleReturnQtyChange(parseInt(e.target.value) || 0)} 
            className="w-20 px-2 py-1 border rounded text-center" 
          />
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        {remainingQty > 0 ? (
          <input 
            type="number" 
            min="0" 
            max={returnQty} 
            value={goodReturn} 
            onChange={(e) => handleGoodReturnChange(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 border rounded text-center" 
          />
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        {remainingQty > 0 ? (
          <input 
            type="number" 
            min="0" 
            max={returnQty} 
            value={damaged} 
            onChange={(e) => handleDamagedChange(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 border rounded text-center" 
          />
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="border border-gray-300 px-4 py-3">
        {remainingQty > 0 ? (
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Reason for damage" 
              value={damageReason}
              onChange={(e) => setDamageReason(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm" 
            />
            {returnQty > 0 && (
              <button
                onClick={handleProcessReturn}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Return
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
    </tr>
  );
}