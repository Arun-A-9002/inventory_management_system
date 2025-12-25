import { useState, useEffect } from "react";
import api from "../../api";

export default function ReturnDisposal() {
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [itemBatches, setItemBatches] = useState({});
  const [renderKey, setRenderKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [returnForm, setReturnForm] = useState({
    return_type: 'TO_VENDOR',
    location: '',
    supplier: '',
    customer_id: '',
    reason: '',
    items: []
  });

  useEffect(() => {
    fetchReturns();
    fetchSuppliers();
    fetchLocations();
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/');
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/returns/');
      setReturns(res.data || []);
    } catch (err) {
      console.error('Failed to fetch returns:', err);
      showMessage('Failed to fetch returns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/vendors/');
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/inventory/locations/');
      setLocations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const fetchItemsForLocation = async (location) => {
    try {
      const res = await api.get('/stock-overview/');
      const stockData = res.data || [];
      
      // Filter items that have batches in the specified location
      const locationItems = [];
      
      stockData.forEach(stock => {
        if (stock.batches && stock.batches.length > 0) {
          // Check if any batch exists in the specified location
          const hasLocationBatch = stock.batches.some(batch => 
            batch.location === location && batch.qty > 0
          );
          
          if (hasLocationBatch) {
            locationItems.push({
              id: stock.id,
              name: stock.item_name,
              item_code: stock.item_code
            });
          }
        }
      });
      
      console.log('Items for location', location, ':', locationItems);
      return locationItems;
    } catch (err) {
      console.error('Failed to fetch items for location:', err);
      return [];
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get('/items/');
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const fetchBatchesForItem = async (itemName) => {
    try {
      // Get stock overview data and find the item
      const res = await api.get('/stock-overview/');
      const stockData = res.data || [];
      const item = stockData.find(stock => stock.item_name === itemName);
      
      if (item && item.batches) {
        // Filter batches by from_location if it's an internal transfer
        if (returnForm.return_type === 'INTERNAL' && returnForm.from_location) {
          const filteredBatches = item.batches.filter(batch => 
            batch.location === returnForm.from_location && batch.qty > 0
          );
          console.log('Filtered batches for location:', returnForm.from_location, filteredBatches);
          return filteredBatches;
        }
        // For non-internal returns, filter by selected location
        if (returnForm.location) {
          return item.batches.filter(batch => 
            batch.location === returnForm.location && batch.qty > 0
          );
        }
        return item.batches.filter(batch => batch.qty > 0);
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      return [];
    }
  };

  const openNewReturnModal = () => {
    setReturnForm({
      return_type: 'TO_VENDOR',
      location: '',
      supplier: '',
      customer_id: '',
      reason: '',
      items: []
    });
    setItems([]); // Reset items when opening modal
    setShowModal(true);
  };

  const addLineItem = () => {
    setReturnForm({
      ...returnForm,
      items: [...returnForm.items, { item_name: '', quantity: '', batch_no: '', reason: '' }]
    });
  };

  const updateLineItem = (index, field, value) => {
    console.log(`Updating item ${index}, field ${field}, value:`, value);
    const updatedItems = [...returnForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    const newForm = { ...returnForm, items: updatedItems };
    console.log('New form state:', newForm);
    setReturnForm(newForm);
    setRenderKey(prev => prev + 1);
  };

  const removeLineItem = (index) => {
    const updatedItems = returnForm.items.filter((_, idx) => idx !== index);
    setReturnForm({ ...returnForm, items: updatedItems });
  };

  const updateReturnStatus = async (returnId, status) => {
    try {
      await api.patch(`/returns/${returnId}/status?status=${status}`);
      fetchReturns();
      alert(`Return ${status.toLowerCase()} successfully`);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    }
  };

  const createReturn = async () => {
    if (!returnForm.return_type) {
      alert('Please select return type');
      return;
    }

    // Handle Internal transfers differently
    if (returnForm.return_type === 'INTERNAL') {
      if (!returnForm.from_location || !returnForm.to_location) {
        alert('Please select both from and to locations for internal transfer');
        return;
      }
      
      if (returnForm.items.length === 0) {
        alert('Please add at least one item');
        return;
      }
      
      // Process internal transfer
      try {
        setLoading(true);
        
        for (const item of returnForm.items) {
          console.log('Sending internal transfer:', {
            item_name: item.item_name,
            batch_no: item.batch_no,
            quantity: item.quantity,
            from_location: returnForm.from_location,
            to_location: returnForm.to_location,
            reason: item.reason || returnForm.reason
          });
          
          console.log('API URL:', '/stocks/internal-transfer');
          await api.post('/stocks/internal-transfer', {
            item_name: item.item_name,
            batch_no: item.batch_no,
            quantity: item.quantity,
            from_location: returnForm.from_location,
            to_location: returnForm.to_location,
            reason: item.reason || returnForm.reason
          });
        }
        
        alert('Internal transfer completed successfully');
        
        // Also create a return record for tracking
        try {
          await api.post('/returns/', {
            return_type: 'INTERNAL',
            location: returnForm.from_location,
            to_location: returnForm.to_location,
            supplier: returnForm.supplier || '',
            reason: returnForm.reason,
            items: returnForm.items
          });
        } catch (err) {
          console.log('Note: Transfer completed but return record creation failed');
        }
        
        setShowModal(false);
        fetchReturns();
      } catch (err) {
        console.error('Failed to process internal transfer:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        alert('Failed to process internal transfer: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (returnForm.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Regular return processing
    if (!returnForm.location) {
      alert('Please select location');
      return;
    }

    if (returnForm.return_type === 'TO_CUSTOMER' && !returnForm.customer_id) {
      alert('Please select customer');
      return;
    }

    if (returnForm.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    console.log('DEBUG: Sending return data:', returnForm);

    try {
      setLoading(true);
      const res = await api.post('/returns/', returnForm);
      alert(`Return created successfully: ${res.data.return_number}`);
      setShowModal(false);
      fetchReturns();
    } catch (err) {
      console.error('Failed to create return:', err);
      alert('Failed to create return: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const createReturnWithInvoice = async () => {
    if (!returnForm.return_type) {
      alert('Please select return type');
      return;
    }

    if (!returnForm.location) {
      alert('Please select location');
      return;
    }

    if (!returnForm.customer_id) {
      alert('Please select customer');
      return;
    }

    if (returnForm.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      
      // Create return first
      const returnRes = await api.post('/returns/', returnForm);
      
      // Generate invoice and send email
      await api.post('/returns/generate-invoice', {
        return_id: returnRes.data.id,
        customer_id: returnForm.customer_id
      });
      
      alert(`Return created and invoice sent successfully: ${returnRes.data.return_number}`);
      setShowModal(false);
      fetchReturns();
    } catch (err) {
      console.error('Failed to create return with invoice:', err);
      alert('Failed to create return with invoice: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Returns {returns.length}</h1>
            <p className="text-gray-600">Returns to suppliers, from customers, and internal adjustments.</p>
          </div>
          <button
            onClick={openNewReturnModal}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
          >
            + New return
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">Return no.</th>
                <th className="text-left p-4 font-medium text-gray-700">Type / supplier</th>
                <th className="text-left p-4 font-medium text-gray-700">Location / reason</th>
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                <th className="text-left p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No returns found
                  </td>
                </tr>
              ) : (
                returns.map((returnItem, index) => (
                  <tr key={returnItem.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{returnItem.return_no}</div>
                      <div className="text-sm text-gray-500">Date: {new Date(returnItem.return_date).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{returnItem.return_type}</div>
                      <div className="text-sm text-gray-500">{returnItem.vendor || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div>{returnItem.location || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{returnItem.reason || '—'}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        {returnItem.status || 'DRAFT'}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={returnItem.status || 'DRAFT'}
                        onChange={(e) => updateReturnStatus(returnItem.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Return (DRAFT)</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Choose return type (to supplier / from customer / internal), and specify items & quantities.</p>
            
            <div className="space-y-4">
              {/* Return Type and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Return type</label>
                  <select
                    value={returnForm.return_type}
                    onChange={(e) => setReturnForm({...returnForm, return_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TO VENDOR">To Vendor</option>
                    <option value="FROM CUSTOMER">From Customer</option>
                    <option value="TO_CUSTOMER">To Customer</option>
                    <option value="INTERNAL">Internal</option>
                  </select>
                </div>
                {returnForm.return_type === 'INTERNAL' ? (
                  <>
                  <div>
                    <label className="block text-sm font-medium mb-2">From Location</label>
                    <select
                      value={returnForm.from_location || ''}
                      onChange={async (e) => {
                        const selectedLocation = e.target.value;
                        setReturnForm({...returnForm, from_location: selectedLocation});
                        
                        // Update items list based on selected location
                        if (selectedLocation) {
                          const locationItems = await fetchItemsForLocation(selectedLocation);
                          setItems(locationItems);
                        } else {
                          setItems([]);
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select from location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.name}>
                          {location.name} ({location.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <select
                      value={returnForm.location}
                      onChange={async (e) => {
                        const selectedLocation = e.target.value;
                        setReturnForm({...returnForm, location: selectedLocation});
                        
                        // Load location-specific items for TO_CUSTOMER returns
                        if (selectedLocation) {
                          if (returnForm.return_type === 'TO_CUSTOMER') {
                            const locationItems = await fetchItemsForLocation(selectedLocation);
                            setItems(locationItems);
                          } else {
                            // Load all items for other return types
                            fetchItems();
                          }
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.name}>
                          {location.name} ({location.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* To Location for Internal transfers */}
              {returnForm.return_type === 'INTERNAL' && (
                <div>
                  <label className="block text-sm font-medium mb-2">To Location</label>
                  <select
                    value={returnForm.to_location || ''}
                    onChange={(e) => setReturnForm({...returnForm, to_location: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select to location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.name}>
                        {location.name} ({location.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Selection for TO_CUSTOMER returns */}
              {returnForm.return_type === 'TO_CUSTOMER' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Customer *</label>
                  <select
                    value={returnForm.customer_id}
                    onChange={(e) => setReturnForm({...returnForm, customer_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customer_type === 'organization' ? customer.org_name : customer.name}
                        {customer.customer_type === 'organization' && customer.org_mobile ? ` - ${customer.org_mobile}` : ''}
                        {customer.customer_type !== 'organization' && customer.mobile ? ` - ${customer.mobile}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vendor - Optional for Internal and TO_CUSTOMER */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Vendor (for return) 
                  {(returnForm.return_type === 'INTERNAL' || returnForm.return_type === 'TO_CUSTOMER') && 
                    <span className="text-gray-500">(optional)</span>
                  }
                </label>
                <select
                  value={returnForm.supplier}
                  onChange={(e) => setReturnForm({...returnForm, supplier: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vendor</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.vendor_name}>
                      {supplier.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium mb-2">Reason</label>
                <textarea
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({...returnForm, reason: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason for return"
                />
              </div>

              {/* Line Items */}
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
                
                {returnForm.items.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">
                    No lines yet. Click "Add line" or use "Create return" from Expired / Quarantine batches.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {returnForm.items.map((item, index) => (
                      <div key={`${renderKey}-${index}-${item.item_name}-${item.batch_no}`} className="grid grid-cols-5 gap-3 p-3 border rounded">
                        <select
                          value={item.item_name || ''}
                          onChange={async (e) => {
                            const selectedItemName = e.target.value;
                            console.log('Selected item:', selectedItemName);
                            
                            // Create new item object
                            const newItem = { ...item, item_name: selectedItemName, batch_no: '', quantity: '' };
                            const updatedItems = [...returnForm.items];
                            updatedItems[index] = newItem;
                            setReturnForm({ ...returnForm, items: updatedItems });
                            
                            if (selectedItemName) {
                              const itemBatches = await fetchBatchesForItem(selectedItemName);
                              console.log('Fetched batches:', itemBatches);
                              setItemBatches(prev => ({ ...prev, [index]: itemBatches }));
                            }
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select item</option>
                          {items.map(itm => (
                            <option key={itm.id} value={itm.name}>
                              {itm.name} ({itm.item_code || 'N/A'})
                            </option>
                          ))}
                        </select>
                        <select
                          value={item.batch_no || ''}
                          onChange={(e) => {
                            const selectedBatchNo = e.target.value;
                            console.log('Selected batch:', selectedBatchNo);
                            
                            const currentBatches = itemBatches[index] || [];
                            const selectedBatch = currentBatches.find(b => b.batch_no === selectedBatchNo);
                            const quantity = selectedBatch ? selectedBatch.qty : '';
                            
                            // Create new item object
                            const newItem = { ...item, batch_no: selectedBatchNo, quantity: quantity };
                            const updatedItems = [...returnForm.items];
                            updatedItems[index] = newItem;
                            setReturnForm({ ...returnForm, items: updatedItems });
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select batch</option>
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

            {/* Modal Actions */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={createReturn}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                >
                  Create Return (DRAFT)
                </button>
                {returnForm.return_type === 'TO_CUSTOMER' && (
                  <button
                    onClick={createReturnWithInvoice}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create & Send Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
