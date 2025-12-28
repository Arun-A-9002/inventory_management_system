import { useState, useEffect } from "react";
import api from "../../api";

export default function ReturnDisposal() {
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [itemBatches, setItemBatches] = useState({});
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [returnForm, setReturnForm] = useState({
    return_type: 'TO_VENDOR',
    location: '',
    supplier: '',
    customer_id: '',
    selected_invoice_id: '',
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
      const res = await api.get('/customers/approved');
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch approved customers:', err);
    }
  };

  const updateReturnQuantity = (item, quantity) => {
    const updatedItems = [...returnForm.items];
    const existingIndex = updatedItems.findIndex(i => i.item_name === item.item_name && i.batch_no === item.batch_no);
    
    if (quantity > 0) {
      const returnItem = {
        item_name: item.item_name,
        batch_no: item.batch_no,
        quantity: quantity,
        rate: item.rate,
        reason: returnForm.reason || 'Customer return'
      };
      
      if (existingIndex >= 0) {
        updatedItems[existingIndex] = returnItem;
      } else {
        updatedItems.push(returnItem);
      }
    } else {
      if (existingIndex >= 0) {
        updatedItems.splice(existingIndex, 1);
      }
    }
    
    setReturnForm({...returnForm, items: updatedItems});
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const calculateRefundAmount = () => {
    return returnForm.items.reduce((total, item) => {
      return total + (item.quantity * item.rate);
    }, 0).toFixed(2);
  };

  const fetchInvoiceDetails = async (billingId) => {
    try {
      const res = await api.get(`/billing/invoice-details/${billingId}`);
      setSelectedInvoiceDetails(res.data);
      // Clear previous return items when selecting new invoice
      setReturnForm({...returnForm, items: []});
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
    }
  };

  const fetchCustomerInvoices = async (customerId) => {
    try {
      console.log('Fetching invoices for customer ID:', customerId);
      const res = await api.get(`/billing/customer/${customerId}/paid-invoices`);
      console.log('Customer invoices response:', res.data);
      setCustomerInvoices(res.data || []);
    } catch (err) {
      console.error('Failed to fetch customer invoices:', err);
      setCustomerInvoices([]);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/returns/');
      const allReturns = res.data || [];
      // Filter out deleted returns
      const activeReturns = allReturns.filter(returnItem => returnItem.status !== 'DELETED');
      setReturns(activeReturns);
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
      // Use the new location-filtered endpoint
      const res = await api.get(`/stock-overview/by-location/${encodeURIComponent(location)}`);
      const stockData = res.data || [];
      
      // Convert stock data to items format
      const locationItems = stockData.map(stock => ({
        id: stock.id,
        name: stock.item_name,
        item_code: stock.item_code
      }));
      
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
      // If we have a selected location, get batches from that location only
      if (returnForm.location) {
        const res = await api.get(`/stock-overview/by-location/${encodeURIComponent(returnForm.location)}`);
        const stockData = res.data || [];
        const item = stockData.find(stock => stock.item_name === itemName);
        
        if (item && item.batches) {
          return item.batches.filter(batch => batch.qty > 0);
        }
        return [];
      }
      
      // Fallback to original method if no location selected
      const res = await api.get('/stock-overview/');
      const stockData = res.data || [];
      const item = stockData.find(stock => stock.item_name === itemName);
      
      if (item && item.batches) {
        const enhancedBatches = await Promise.all(item.batches.map(async (batch) => {
          try {
            const itemRes = await api.get('/items/');
            const itemsData = itemRes.data || [];
            
            const masterItem = itemsData.find(itm => itm.name === itemName);
            const rate = masterItem ? (masterItem.mrp || masterItem.price || masterItem.rate || 0) : 0;
            
            return { ...batch, rate: rate || 30 };
          } catch (err) {
            console.error('Failed to fetch rate for batch:', batch.batch_no, err);
            return { ...batch, rate: 30 };
          }
        }));
        
        if (returnForm.location) {
          return enhancedBatches.filter(batch => 
            batch.location === returnForm.location && batch.qty > 0
          );
        }
        return enhancedBatches.filter(batch => batch.qty > 0);
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      return [];
    }
  };

  const calculateItemAmount = (item, quantity) => {
    const qty = parseFloat(quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  const getTotalAmount = () => {
    return returnForm.items.reduce((total, item) => {
      return total + calculateItemAmount(item, item.quantity);
    }, 0);
  };

  const openNewReturnModal = () => {
    setReturnForm({
      return_type: 'TO_VENDOR',
      location: '',
      supplier: '',
      customer_id: '',
      selected_invoice_id: '',
      reason: '',
      items: []
    });
    setItems([]);
    setEditMode(false);
    setSelectedReturn(null);
    setItemBatches({});
    setCustomerInvoices([]);
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

  const viewReturn = async (returnId) => {
    try {
      const res = await api.get(`/returns/${returnId}`);
      const returnData = res.data;
      
      // Enhance items with rate if missing
      if (returnData.items) {
        for (let item of returnData.items) {
          if (!item.rate || item.rate === 0) {
            try {
              // Try to get rate from stock overview
              const stockRes = await api.get('/stock-overview/');
              const stockData = stockRes.data || [];
              const stockItem = stockData.find(stock => stock.item_name === item.item_name);
              
              if (stockItem && stockItem.batches) {
                const batch = stockItem.batches.find(b => b.batch_no === item.batch_no);
                if (batch && (batch.mrp || batch.rate)) {
                  item.rate = batch.mrp || batch.rate;
                } else {
                  // Try to get from item master
                  try {
                    const itemRes = await api.get('/items/');
                    const itemsData = itemRes.data || [];
                    
                    const masterItem = itemsData.find(itm => itm.name === item.item_name);
                    if (masterItem) {
                      item.rate = masterItem.mrp || masterItem.price || masterItem.rate || 30;
                    }
                  } catch (itemErr) {
                    console.log('Item master fetch failed in view');
                  }
                  
                  if (!item.rate) {
                    item.rate = 30; // Use actual default if needed
                  }
                }
              } else {
                item.rate = 30;
              }
            } catch (err) {
              item.rate = 30; // Use correct default rate
            }
          }
        }
      }
      
      setSelectedReturn(returnData);
      setShowViewModal(true);
    } catch (err) {
      console.error('Failed to fetch return details:', err);
      alert('Failed to fetch return details');
    }
  };

  const editReturn = async (returnId) => {
    try {
      const res = await api.get(`/returns/${returnId}`);
      const returnData = res.data;
      
      console.log('Return data for editing:', returnData);
      
      // Load necessary data first
      await fetchSuppliers();
      await fetchLocations();
      await fetchCustomers();
      
      // Load items based on return type and location
      if (returnData.header.location) {
        if (returnData.header.return_type === 'TO_CUSTOMER') {
          const locationItems = await fetchItemsForLocation(returnData.header.location);
          setItems(locationItems);
        } else {
          await fetchItems();
        }
      }
      
      // Find customer by checking all customers
      let customerId = '';
      if (returnData.header.return_type === 'TO_CUSTOMER') {
        // Try to find customer by name or other identifier
        const customer = customers.find(c => 
          (c.customer_type === 'organization' ? c.org_name : c.name) === returnData.header.customer_name
        );
        if (customer) {
          customerId = customer.id;
        }
      }
      
      setReturnForm({
        return_type: returnData.header.return_type || 'TO_VENDOR',
        location: returnData.header.location || '',
        from_location: returnData.header.from_location || returnData.header.location || '',
        to_location: returnData.header.to_location || '',
        supplier: returnData.header.vendor || returnData.header.supplier || '',
        customer_id: customerId || returnData.header.customer_id || '',
        reason: returnData.header.reason || '',
        items: returnData.items.map(item => ({
          item_name: item.item_name,
          quantity: item.qty,
          batch_no: item.batch_no,
          reason: item.remarks || ''
        }))
      });
      
      console.log('Form populated with:', {
        return_type: returnData.header.return_type,
        location: returnData.header.location,
        supplier: returnData.header.vendor,
        customer_id: customerId,
        reason: returnData.header.reason
      });
      
      // Load batches for each item
      for (let i = 0; i < returnData.items.length; i++) {
        const item = returnData.items[i];
        const batches = await fetchBatchesForItem(item.item_name);
        setItemBatches(prev => ({ ...prev, [i]: batches }));
      }
      
      setSelectedReturn(returnData);
      setEditMode(true);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to fetch return for editing:', err);
      showMessage('Failed to fetch return details: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const deleteReturn = async (returnId) => {
    // Find the return to check its status
    const returnToDelete = returns.find(r => r.id === returnId);
    
    if (returnToDelete && returnToDelete.status === 'APPROVED') {
      showMessage('Return was approved so we cannot delete', 'error');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this return?')) {
      try {
        await api.patch(`/returns/${returnId}/status?status=DELETED`);
        showMessage('Return deleted successfully');
        fetchReturns();
      } catch (err) {
        console.error('Failed to delete return:', err);
        showMessage('Failed to delete return: ' + (err.response?.data?.detail || err.message), 'error');
      }
    }
  };

  const updateReturnStatus = async (returnId, status) => {
    try {
      await api.patch(`/returns/${returnId}/status?status=${status}`);
      
      // Auto-create invoice when status changes to APPROVED (but skip for INTERNAL returns)
      if (status === 'APPROVED') {
        // Check if this is an internal return
        const returnItem = returns.find(r => r.id === returnId);
        
        if (returnItem && returnItem.return_type === 'INTERNAL') {
          // Skip billing for internal returns
          showMessage(`Internal return ${status.toLowerCase()} successfully - no billing required`);
        } else {
          // Create billing for external returns
          try {
            console.log('Creating invoice for return ID:', returnId);
            const res = await api.post('/billing/return', {
              return_id: returnId
            });
            console.log('Invoice created:', res.data);
            showMessage(`Return ${status.toLowerCase()} and invoice created: INV-${res.data.id.toString().padStart(4, '0')}`);
          } catch (invoiceErr) {
            console.error('Invoice creation failed:', invoiceErr);
            console.error('Error details:', invoiceErr.response?.data);
            showMessage(`Return ${status.toLowerCase()} successfully, but invoice creation failed: ${invoiceErr.response?.data?.detail || invoiceErr.message}`, 'error');
          }
        }
      } else {
        showMessage(`Return ${status.toLowerCase()} successfully`);
      }
      
      fetchReturns();
    } catch (err) {
      console.error('Failed to update status:', err);
      showMessage('Failed to update status: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const createReturn = async () => {
    if (!returnForm.return_type) {
      alert('Please select return type');
      return;
    }

    // Handle FROM CUSTOMER returns
    if (returnForm.return_type === 'FROM CUSTOMER') {
      if (!returnForm.customer_id) {
        alert('Please select customer');
        return;
      }
      
      if (!selectedInvoiceDetails) {
        alert('Please select an invoice');
        return;
      }
      
      if (returnForm.items.length === 0) {
        alert('Please specify return quantities for at least one item');
        return;
      }
      
      try {
        setLoading(true);
        const res = await api.post('/returns/', {
          return_type: 'FROM_CUSTOMER',
          customer_id: returnForm.customer_id,
          invoice_id: selectedInvoiceDetails.id,
          reason: returnForm.reason,
          items: returnForm.items
        });
        alert(`Customer return created successfully: ${res.data.return_number}`);
        setShowModal(false);
        fetchReturns();
      } catch (err) {
        console.error('Failed to create customer return:', err);
        alert('Failed to create customer return: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }
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

    console.log('DEBUG: Sending return data:', {
      ...returnForm,
      items: returnForm.items.map(item => ({
        ...item,
        rate: item.rate || 0,
        amount: calculateItemAmount(item, item.quantity)
      }))
    });

    try {
      setLoading(true);
      const res = await api.post('/returns/', {
        ...returnForm,
        items: returnForm.items.map(item => ({
          ...item,
          rate: item.rate || 0,
          amount: calculateItemAmount(item, item.quantity)
        }))
      });
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

  const createInvoiceForReturn = async (returnId) => {
    try {
      setLoading(true);
      const res = await api.post('/billing/return', {
        return_id: returnId
      });
      showMessage(`Invoice created successfully: INV-${res.data.id.toString().padStart(4, '0')}`);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      showMessage('Failed to create invoice: ' + (err.response?.data?.detail || err.message), 'error');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* MODERN HEADER */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 5v1a4 4 0 01-4 4H8m0 0l3-3m-3 3l3 3" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
                <p className="text-sm text-slate-600">Returns to suppliers, from customers, and internal adjustments</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-red-50 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-red-700">📦 Active Returns: {returns.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Returns Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Returns Records
                </h2>
                <p className="text-sm text-slate-600 mt-1">Manage and track all return transactions</p>
              </div>
              <button
                onClick={openNewReturnModal}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Return
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Loading return records...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Return Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Type & Supplier</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Location & Reason</th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16">
                        <div className="text-slate-400">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 5v1a4 4 0 01-4 4H8m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <p className="text-lg font-medium text-slate-500">No return records found</p>
                          <p className="text-sm text-slate-400 mt-1">Create your first return to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    returns.map((returnItem, index) => (
                      <tr key={returnItem.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-slate-900">{returnItem.return_no}</div>
                            <div className="text-sm text-slate-500">{new Date(returnItem.return_date).toLocaleDateString()}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-medium text-slate-800">{returnItem.return_type}</div>
                            <div className="text-sm text-slate-500">{returnItem.vendor || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-medium text-slate-800">{returnItem.location || 'N/A'}</div>
                            <div className="text-sm text-slate-500">{returnItem.reason || '—'}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="space-y-2">
                            <select
                              value={returnItem.status || 'DRAFT'}
                              onChange={(e) => updateReturnStatus(returnItem.id, e.target.value)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${
                                returnItem.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                returnItem.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              <option value="DRAFT">DRAFT</option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="REJECTED">REJECTED</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="DELETED">DELETED</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => viewReturn(returnItem.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => editReturn(returnItem.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit Return"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => deleteReturn(returnItem.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Return"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editMode ? 'Edit Return' : 'New Return'} (DRAFT)</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedReturn(null);
                  setItemBatches({});
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Choose return type (to supplier / from customer / internal), and specify items & quantities.</p>
            
            <div className="space-y-4">
              {/* Return Type and Location */}
              <div className={`grid gap-4 ${returnForm.return_type === 'FROM CUSTOMER' ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
                ) : returnForm.return_type !== 'FROM CUSTOMER' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <select
                      value={returnForm.location}
                      onChange={async (e) => {
                        const selectedLocation = e.target.value;
                        setReturnForm({...returnForm, location: selectedLocation});
                        
                        // Load location-specific items
                        if (selectedLocation) {
                          const locationItems = await fetchItemsForLocation(selectedLocation);
                          setItems(locationItems);
                        } else {
                          setItems([]);
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

              {/* Vendor Selection - Hide for FROM CUSTOMER */}
              {returnForm.return_type !== 'FROM CUSTOMER' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor (for return)</label>
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
              )}

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Customer</label>
                <select
                  value={returnForm.customer_id}
                  onChange={async (e) => {
                    const customerId = e.target.value;
                    console.log('Customer selected:', customerId);
                    setReturnForm({...returnForm, customer_id: customerId});
                    if (customerId) {
                      await fetchCustomerInvoices(customerId);
                    } else {
                      setCustomerInvoices([]);
                    }
                  }}
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
                <div className="text-xs text-gray-500 mt-1">Debug: customerInvoices.length = {customerInvoices.length}</div>
              </div>

              {/* Customer Invoices - Show for FROM CUSTOMER */}
              {returnForm.return_type === 'FROM CUSTOMER' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Invoices</label>
                  <div className="min-h-32 max-h-60 overflow-y-auto border rounded-lg bg-gray-50">
                    {customerInvoices.length > 0 ? (
                      <div className="space-y-2 p-2">
                        {customerInvoices.map(invoice => (
                          <div 
                            key={invoice.id} 
                            className="bg-white border rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => fetchInvoiceDetails(invoice.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-blue-600">{invoice.invoice_number}</h4>
                                <p className="text-sm text-gray-600">{new Date(invoice.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">₹{invoice.total_amount}</p>
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                  Paid
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm">No paid invoices found</p>
                          <p className="text-xs text-gray-400">Customer has no invoices available for refund</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {customerInvoices.length > 0 
                      ? "Click on an invoice to view details and process refund" 
                      : "Paid invoices will appear here when available"}
                  </p>
                </div>
              )}

              {/* Selected Invoice Details with Return Quantities */}
              {selectedInvoiceDetails && (
                <div>
                  <label className="block text-sm font-medium mb-2">Return Items from {selectedInvoiceDetails.invoice_number}</label>
                  <div className="border rounded-lg bg-white">
                    <div className="p-3 bg-gray-50 border-b">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Invoice Date:</span>
                          <p className="font-medium">{new Date(selectedInvoiceDetails.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Paid:</span>
                          <p className="font-medium text-green-600">₹{selectedInvoiceDetails.paid_amount}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Refund Amount:</span>
                          <p className="font-medium text-blue-600">₹{calculateRefundAmount()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium mb-3">Select Items to Return:</h4>
                      <div className="space-y-3">
                        {selectedInvoiceDetails.items.map((item, index) => {
                          const returnQty = returnForm.items.find(i => i.item_name === item.item_name && i.batch_no === item.batch_no)?.quantity || 0;
                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                              <div className="flex-1">
                                <p className="font-medium">{item.item_name}</p>
                                <p className="text-sm text-gray-600">Batch: {item.batch_no} | Rate: ₹{item.rate}</p>
                                <p className="text-sm text-blue-600">Purchased: {item.quantity} units</p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-right">
                                  <label className="block text-xs text-gray-600 mb-1">Return Qty</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={returnQty}
                                    onChange={(e) => updateReturnQuantity(item, parseInt(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border rounded text-center"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-600">Refund</p>
                                  <p className="font-medium text-green-600">₹{(returnQty * item.rate).toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {returnForm.items.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-blue-800">Total Refund Amount:</span>
                            <span className="text-xl font-bold text-blue-600">₹{calculateRefundAmount()}</span>
                          </div>
                          <p className="text-sm text-blue-600 mt-1">Items will be returned to stock in their original batches</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}



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

              {/* Line Items - Hide for FROM CUSTOMER since items come from invoice */}
              {returnForm.return_type !== 'FROM CUSTOMER' && (
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
                        <div key={`${renderKey}-${index}-${item.item_name}-${item.batch_no}`} className={`grid gap-3 p-3 border rounded ${
                          returnForm.return_type === 'INTERNAL' ? 'grid-cols-5' : 'grid-cols-6'
                        }`}>
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
                            onChange={async (e) => {
                              const selectedBatchNo = e.target.value;
                              const currentBatches = itemBatches[index] || [];
                              const selectedBatch = currentBatches.find(b => b.batch_no === selectedBatchNo);
                              const quantity = selectedBatch ? selectedBatch.qty : '';
                              const rate = selectedBatch ? selectedBatch.rate : 0;
                              
                              const newItem = { ...item, batch_no: selectedBatchNo, quantity: quantity, rate: rate };
                              const updatedItems = [...returnForm.items];
                              updatedItems[index] = newItem;
                              setReturnForm({ ...returnForm, items: updatedItems });
                            }}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select batch</option>
                            {(itemBatches[index] || []).map(batch => (
                              <option key={batch.batch_no} value={batch.batch_no}>
                                {batch.batch_no} (Qty: {batch.qty}, Rate: ₹{batch.rate || 0})
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
                          {returnForm.return_type !== 'INTERNAL' && (
                            <div className="border rounded px-2 py-1 text-sm bg-gray-50">
                              ₹{calculateItemAmount(item, item.quantity).toFixed(2)}
                            </div>
                          )}
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
              )}
              
              {/* Total Amount Display - Hide for Internal returns */}
              {returnForm.items.length > 0 && returnForm.return_type !== 'INTERNAL' && (
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">₹{getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedReturn(null);
                  setItemBatches({});
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={createReturn}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                >
                  {editMode ? 'Update Return' : 'Create Return'} (DRAFT)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Return Modal */}
      {showViewModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Return Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Return Number</label>
                  <p className="text-sm">{selectedReturn.header.return_no}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Return Type</label>
                  <p className="text-sm">{selectedReturn.header.return_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm">{selectedReturn.header.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <p className="text-sm">{selectedReturn.header.vendor || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm">{selectedReturn.header.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm">{new Date(selectedReturn.header.return_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <p className="text-sm">{selectedReturn.header.reason || '—'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-left p-2">Batch</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Rate</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.items.map((item, index) => {
                        const amount = (item.qty || 0) * (item.rate || 0);
                        return (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.item_name}</td>
                            <td className="p-2">{item.batch_no}</td>
                            <td className="p-2">{item.qty}</td>
                            <td className="p-2">₹{(item.rate || 0).toFixed(2)}</td>
                            <td className="p-2">₹{amount.toFixed(2)}</td>
                            <td className="p-2">{item.remarks || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="4" className="p-2 text-right font-medium">Total Amount:</td>
                        <td className="p-2 font-bold text-green-600">
                          ₹{selectedReturn.items.reduce((total, item) => total + ((item.qty || 0) * (item.rate || 0)), 0).toFixed(2)}
                        </td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
