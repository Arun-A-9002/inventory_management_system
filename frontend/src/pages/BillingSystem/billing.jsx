import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function Billing() {
  const [billings, setBillings] = useState([]);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [showDetailsPage, setShowDetailsPage] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isFinalized, setIsFinalized] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatchInfo, setSelectedBatchInfo] = useState(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'Cash',
    reference_no: '',
    notes: ''
  });
  
  const [refundForm, setRefundForm] = useState({
    amount: '',
    reason: '',
    refund_mode: 'Cash'
  });

  useEffect(() => {
    fetchBillings();
    // Fix any status corruption on component mount
    fixStatusCorruption();
  }, []);

  const fixStatusCorruption = async () => {
    try {
      await api.put('/billing/fix-status-corruption');
      console.log('Status corruption fixed');
    } catch (err) {
      console.warn('Could not fix status corruption:', err);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const fetchBillings = async () => {
    try {
      setLoading(true);
      const returnBillings = await api.get('/billing/return-invoices').catch(() => ({ data: [] }));
      
      const allBillings = (returnBillings.data || []).map(b => ({ 
        ...b, 
        type: 'RETURN', 
        reference: `RTN-${b.return_id}`
      }));
      
      setBillings(allBillings);
    } catch (err) {
      console.error('Failed to fetch billings:', err);
      showMessage('Failed to fetch billings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewBillingDetails = async (billingId, billingType) => {
    try {
      let res;
      if (billingType === 'RETURN') {
        // Always fetch fresh data from API
        res = await api.get(`/billing/return-invoices`);
        const returnBilling = res.data.find(b => b.id === billingId);
        if (returnBilling) {
          setSelectedBilling(returnBilling);
          setIsFinalized(returnBilling.status === 'PAID');
          
          // Fetch actual return items with database IDs
          try {
            console.log('Fetching items for billing_id:', billingId);
            const itemsRes = await api.get(`/billing/invoice-items/${billingId}`);
            console.log('API Response:', itemsRes);
            console.log('Items data:', itemsRes.data);
            
            if (itemsRes.data && itemsRes.data.length > 0) {
              // Log the structure of the first item to understand ID mapping
              console.log('First item structure:', itemsRes.data[0]);
              console.log('Available ID fields:', Object.keys(itemsRes.data[0]).filter(key => key.toLowerCase().includes('id')));
              
              setInvoiceItems(itemsRes.data);
              
              // Update billing totals with correct tax
              const totalGross = itemsRes.data.reduce((sum, item) => sum + item.total, 0);
              const totalTax = itemsRes.data.reduce((sum, item) => sum + item.tax_amount, 0);
              
              setSelectedBilling(prev => ({
                ...prev,
                gross_amount: totalGross,
                tax_amount: totalTax,
                net_amount: totalGross + totalTax,
                balance_amount: (totalGross + totalTax) - parseFloat(prev.paid_amount)
              }));
            } else {
              console.log('No items found in response');
              setInvoiceItems([]);
            }
          } catch (err) {
            console.error('API Error:', err.response?.data || err.message);
            setInvoiceItems([]);
          }
          
          setShowDetailsPage(true);
        } else {
          showMessage('Return billing not found', 'error');
        }
      } else {
        res = await api.get(`/billing/${billingId}`);
        setSelectedBilling(res.data);
        setIsFinalized(res.data.status === 'PAID');
        setInvoiceItems([]);
        setShowDetailsPage(true);
      }
    } catch (err) {
      console.error('Failed to fetch billing details:', err);
      showMessage('Failed to fetch billing details', 'error');
    }
  };

  const openPaymentModal = (billing) => {
    setSelectedBilling(billing);
    const remainingAmount = Math.max(0, parseFloat(billing.net_amount) - parseFloat(billing.paid_amount));
    setPaymentForm({
      amount: remainingAmount.toString(),
      payment_mode: 'Cash',
      reference_no: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const paymentData = {
        paid_amount: parseFloat(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        reference_no: paymentForm.reference_no,
        notes: paymentForm.notes
      };
      
      await api.put(`/billing/return-payment/${selectedBilling.id}`, paymentData);
      showMessage('Payment processed successfully');
      setShowPaymentModal(false);
      // Refresh both the invoice details and the billing list
      await viewBillingDetails(selectedBilling.id, 'RETURN');
      await fetchBillings(); // Refresh the main list to show updated totals
    } catch (err) {
      console.error('Payment failed:', err);
      showMessage('Payment processing failed', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefund = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const refundData = {
        amount: parseFloat(refundForm.amount),
        reason: refundForm.reason,
        refund_mode: refundForm.refund_mode
      };
      
      await api.post(`/billing/refund/${selectedBilling.id}`, refundData);
      showMessage('Refund processed successfully');
      setShowRefundModal(false);
      // Refresh the billing details
      await viewBillingDetails(selectedBilling.id, 'RETURN');
    } catch (err) {
      console.error('Refund failed:', err);
      showMessage('Refund processing failed', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFinalize = async () => {
    try {
      setLoading(true);
      await api.put(`/billing/finalize/${selectedBilling.id}`);
      setIsFinalized(true);
      showMessage('Invoice finalized successfully');
      // Refresh the current invoice details to show finalized state
      await viewBillingDetails(selectedBilling.id, 'RETURN');
    } catch (err) {
      console.error('Finalize failed:', err);
      showMessage('Failed to finalize invoice', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelInvoice = async () => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      try {
        setLoading(true);
        await api.delete(`/billing/cancel/${selectedBilling.id}`);
        showMessage('Invoice cancelled successfully');
        setShowDetailsPage(false);
        fetchBillings();
      } catch (err) {
        console.error('Cancel failed:', err);
        showMessage('Failed to cancel invoice', 'error');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleItemEdit = async (item) => {
    try {
      // Fetch tax rate from item master
      const taxRes = await api.get(`/billing/get-item-tax/${encodeURIComponent(item.name)}`);
      const itemMasterTax = taxRes.data.tax_rate || 0;
      
      // Fetch available batches for this item
      const batchesRes = await api.get(`/billing/available-batches/${encodeURIComponent(item.name)}`);
      const batches = batchesRes.data || [];
      setAvailableBatches(batches);
      
      // Find current batch info
      const currentBatch = batches.find(b => b.batch_no === item.batch_no);
      setSelectedBatchInfo(currentBatch);
      
      console.log('Setting up item edit:', {
        item,
        itemId: item.id,
        itemName: item.name,
        itemMasterTax,
        availableBatches: batches.length
      });
      
      setEditingItem({ 
        ...item, 
        tax_rate: itemMasterTax,
        status: item.status || 'pending',
        returned: item.returned || false,
        // Ensure we have the correct database ID
        database_id: item.id  // Use the ID from the API response directly
      });
    } catch (err) {
      console.error('Failed to fetch item tax rate:', err);
      setEditingItem({ 
        ...item, 
        tax_rate: 0,
        status: item.status || 'pending',
        returned: item.returned || false,
        database_id: item.id  // Use the ID from the API response directly
      });
      setAvailableBatches([]);
      setSelectedBatchInfo(null);
    }
  };
  
  const saveItemEdit = async () => {
    try {
      // Use the database ID - prioritize database_id, then id
      const itemId = editingItem.database_id || editingItem.id;
      
      console.log('Attempting to save item edit:', {
        editingItem,
        itemId,
        availableFields: Object.keys(editingItem)
      });
      
      // Validate that we have a valid item ID
      if (!itemId || itemId <= 0) {
        throw new Error('Invalid item ID - cannot save changes');
      }
      
      // Validate that the item ID exists in the available items
      const currentItem = invoiceItems.find(item => item.id === itemId);
      if (!currentItem) {
        console.error('Item not found in current invoice items:', {
          searchingForId: itemId,
          availableItems: invoiceItems.map(item => ({ id: item.id, name: item.name }))
        });
        throw new Error(`Item with ID ${itemId} not found in current invoice`);
      }
      
      // Save with correct tax calculation from edit modal
      const response = await api.put(`/billing/save-item-edit/${itemId}`, {
        qty: editingItem.qty,
        rate: editingItem.rate,
        tax_rate: editingItem.tax_rate
      });
      
      console.log('Item edit saved successfully:', response.data);
      
      // Update local state with correct values
      const updatedItem = {
        ...editingItem,
        total: editingItem.qty * editingItem.rate,
        tax_amount: editingItem.qty * (editingItem.tax_rate || 0),
        total_with_tax: (editingItem.qty * editingItem.rate) + (editingItem.qty * (editingItem.tax_rate || 0))
      };
      
      const updatedItems = invoiceItems.map(item => 
        item.id === editingItem.id ? updatedItem : item
      );
      
      setInvoiceItems(updatedItems);
      
      // Recalculate billing totals
      const grossAmount = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = updatedItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
      const netAmount = grossAmount + taxAmount;
      
      // Update selectedBilling
      setSelectedBilling(prev => ({
        ...prev,
        gross_amount: grossAmount,
        tax_amount: taxAmount,
        net_amount: netAmount,
        balance_amount: netAmount - parseFloat(prev.paid_amount)
      }));
      
      setEditingItem(null);
      showMessage('Item updated with correct tax calculation');
    } catch (err) {
      console.error('Failed to save item edit:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        editingItem,
        itemId: editingItem.database_id || editingItem.return_item_id || editingItem.id
      });
      showMessage(`Failed to save item changes: ${err.response?.data?.detail || err.message}`, 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-100';
      case 'PARTIAL': return 'text-yellow-600 bg-yellow-100';
      case 'DRAFT': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 p-6">
      {showDetailsPage ? (
        // Invoice Details Page
        <div>
          {/* Back Button */}
          <button
            onClick={() => setShowDetailsPage(false)}
            className="mb-4 flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Invoices
          </button>

          {/* Dashboard Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">Invoice #{selectedBilling.id.toString().padStart(4, '0')}</h2>
                <p className="opacity-90">Reference: RTN-{selectedBilling.return_id}</p>
              </div>
            </div>
            
            {/* Dashboard Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="text-sm opacity-80">Gross Amount</div>
                <div className="text-xl font-bold">₹{parseFloat(selectedBilling.gross_amount).toFixed(2)}</div>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="text-sm opacity-80">Tax Amount</div>
                <div className="text-xl font-bold">₹{parseFloat(selectedBilling.tax_amount).toFixed(2)}</div>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="text-sm opacity-80">Net Amount</div>
                <div className="text-xl font-bold">₹{parseFloat(selectedBilling.net_amount).toFixed(2)}</div>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="text-sm opacity-80">Balance Due</div>
                <div className="text-xl font-bold">₹{parseFloat(selectedBilling.balance_amount).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            {!isFinalized && (
              <>
                <button
                  onClick={() => openPaymentModal(selectedBilling)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Payment
                </button>
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                  Refund
                </button>
                <button
                  onClick={handleCancelInvoice}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={handleFinalize}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finalize
                </button>
              </>
            )}
            <button
              onClick={() => window.open(`http://localhost:8000/billing/invoice/${selectedBilling.id}`, '_blank')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={() => window.open(`http://localhost:8000/billing/invoice/${selectedBilling.id}`, '_blank')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
          </div>

          {/* Invoice Items */}
          <div className="bg-white border rounded-xl mb-6">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Invoice Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Item</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Batch No</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Rate</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Tax/Unit</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Warranty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Gross Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total Tax</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</th>
                    {!isFinalized && <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoiceItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-900">{item.batch_no || "N/A"}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-900">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">₹{item.rate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-900">₹{(item.tax_amount / item.qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-900">{item.warranty}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">₹{item.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">₹{item.tax_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">₹{item.total_with_tax.toFixed(2)}</td>
                      {!isFinalized && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleItemEdit(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer & Payment Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl">
              <h4 className="font-semibold text-slate-900 mb-3">Customer Details</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Name:</span> {selectedBilling.customer_name || 'N/A'}</div>
                <div><span className="font-medium">Phone:</span> {selectedBilling.customer_phone || 'N/A'}</div>
                <div><span className="font-medium">Email:</span> {selectedBilling.customer_email || 'N/A'}</div>
                <div><span className="font-medium">ID:</span> {selectedBilling.customer_id || 'N/A'}</div>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <h4 className="font-semibold text-slate-900 mb-3">Amount Calculation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span className="font-semibold">₹{parseFloat(selectedBilling.gross_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-semibold">₹{parseFloat(selectedBilling.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Net Amount:</span>
                  <span>₹{parseFloat(selectedBilling.net_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment Summary */}
          <div className="bg-slate-50 p-4 rounded-xl mt-6">
            <h4 className="font-semibold text-slate-900 mb-3">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Net Amount:</span>
                <span className="font-semibold text-blue-600">₹{parseFloat(selectedBilling.net_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-semibold text-green-600">₹{parseFloat(selectedBilling.paid_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Balance:</span>
                <span className="font-semibold text-red-600">₹{Math.max(0, parseFloat(selectedBilling.net_amount) - parseFloat(selectedBilling.paid_amount)).toFixed(2)}</span>
              </div>
              {selectedBilling.status === 'PARTIAL' && selectedBilling.due_date && (
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="font-semibold text-orange-600">{new Date(selectedBilling.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {parseFloat(selectedBilling.paid_amount) > parseFloat(selectedBilling.net_amount) && (
                <div className="flex justify-between">
                  <span>Extra Amount:</span>
                  <span className="font-semibold text-orange-600">₹{(parseFloat(selectedBilling.paid_amount) - parseFloat(selectedBilling.net_amount)).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span>Status:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedBilling.status)}`}>
                  {selectedBilling.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Main Billing List Page
        <div>
      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">Financial Management</div>
              <h1 className="text-3xl font-semibold mt-2">Billing System</h1>
              <p className="mt-2 opacity-90">Manage invoices, payments and billing records.</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/app/billing/create"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Invoice
              </Link>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">Total Invoices</span>
                <div className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">{billings.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl shadow-sm ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {message.text}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-600">Loading...</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Invoice ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Customer Details</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Net Amount</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {billings.map((billing) => (
                <tr key={billing.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">INV-{billing.id.toString().padStart(4, '0')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {billing.reference || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{billing.customer_name || 'N/A'}</div>
                      <div className="text-slate-500">{billing.customer_phone || 'N/A'}</div>
                      <div className="text-slate-500">{billing.customer_email || 'N/A'}</div>
                      <div className="text-xs text-slate-400">ID: {billing.customer_id || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-slate-900">
                    ₹{parseFloat(billing.net_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600">
                    ₹{parseFloat(billing.paid_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-red-600">
                    ₹{parseFloat(billing.balance_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(billing.status)}`}>
                      {billing.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => window.open(`http://localhost:8000/billing/invoice/${billing.id}`, '_blank')}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Print Invoice"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => viewBillingDetails(billing.id, billing.type)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        title="Open Details"
                      >
                        Open
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {billings.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No invoices found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by creating your first invoice.</p>
          </div>
        )}
      </div>

        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Process Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_mode: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Optional notes"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Process Refund</h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleRefund} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Refund Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({...refundForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Refund Mode</label>
                <select
                  value={refundForm.refund_mode}
                  onChange={(e) => setRefundForm({...refundForm, refund_mode: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Refund</label>
                <textarea
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({...refundForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows="3"
                  placeholder="Reason for refund"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Edit Modal */}
      {editingItem && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Batch Number</label>
                <select
                  value={editingItem.batch_no || ''}
                  onChange={(e) => {
                    const selectedBatch = availableBatches.find(b => b.batch_no === e.target.value);
                    setSelectedBatchInfo(selectedBatch);
                    setEditingItem({...editingItem, batch_no: e.target.value});
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Batch</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.batch_no} value={batch.batch_no}>
                      {batch.batch_no} (Available: {batch.qty})
                    </option>
                  ))}
                </select>
                {selectedBatchInfo && (
                  <div className="text-xs text-blue-600 mt-1">
                    Remaining Quantity: {selectedBatchInfo.qty} units
                    {selectedBatchInfo.expiry_date && (
                      <span className="ml-2">| Expiry: {selectedBatchInfo.expiry_date}</span>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={editingItem.qty}
                  onChange={(e) => setEditingItem({...editingItem, qty: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max={selectedBatchInfo ? selectedBatchInfo.qty : undefined}
                />
                {selectedBatchInfo && editingItem.qty > selectedBatchInfo.qty && (
                  <div className="text-xs text-red-600 mt-1">
                    Quantity exceeds available stock ({selectedBatchInfo.qty})
                  </div>
                )}
                {(() => {
                  const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                  const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                  if (qtyDiff !== 0) {
                    return (
                      <>
                        <div className={`text-sm mt-1 ${
                          qtyDiff > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff} from original ({originalItem?.qty || 0})
                        </div>
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              editingItem.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {editingItem.status === 'approved' ? 'Approved' : 'Pending'}
                            </span>
                            {editingItem.status !== 'approved' && (
                              <button
                                onClick={() => setEditingItem({...editingItem, status: 'approved'})}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.rate}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-gray-100 text-gray-600"
                  readOnly
                />
                <div className="text-xs text-gray-500 mt-1">Rate cannot be modified</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.tax_rate || 0}
                  onChange={(e) => setEditingItem({...editingItem, tax_rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{(editingItem.qty * editingItem.rate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({editingItem.tax_rate || 0}/unit × {editingItem.qty}):</span>
                    <span>₹{(editingItem.qty * (editingItem.tax_rate || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>₹{((editingItem.qty * editingItem.rate) + (editingItem.qty * (editingItem.tax_rate || 0))).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-2 px-2 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Handle Take action - increase quantity and decrease stock
                    const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                    const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                    if (qtyDiff > 0 && editingItem.status === 'approved') {
                      try {
                        // Check if sufficient stock is available
                        if (selectedBatchInfo && selectedBatchInfo.qty < qtyDiff) {
                          showMessage(`Insufficient stock. Available: ${selectedBatchInfo.qty}, Required: ${qtyDiff}`, 'error');
                          return;
                        }
                        
                        // Update stock by reducing the extra quantity from the specific batch
                        await api.post('/stocks/add-batch-stock', {
                          item_name: editingItem.name,
                          batch_no: editingItem.batch_no,  // Uses the selected batch number (1256)
                          quantity: -qtyDiff  // Negative quantity to decrease stock (-6)
                        });
                        
                        // Save the item edit
                        await saveItemEdit();
                        showMessage(`Taken ${qtyDiff} units of ${editingItem.name} (Stock decreased by ${qtyDiff})`);
                      } catch (err) {
                        console.error('Failed to update stock:', err);
                        showMessage('Failed to update stock quantity', 'error');
                      }
                    } else if (qtyDiff > 0 && editingItem.status !== 'approved') {
                      showMessage('Please approve the quantity increase first', 'error');
                    } else {
                      showMessage('No additional quantity to take', 'error');
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    (() => {
                      const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                      const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                      const canTake = qtyDiff > 0 && editingItem.status === 'approved';
                      return canTake 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed';
                    })()
                  }`}
                  disabled={(() => {
                    const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                    const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                    return qtyDiff <= 0 || editingItem.status !== 'approved';
                  })()}
                >
                  {(() => {
                    const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                    const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                    return qtyDiff > 0 ? `Take ${qtyDiff}` : 'Take';
                  })()}
                </button>
                <button
                  onClick={async () => {
                    // Handle Return action - decrease quantity and add back to stock
                    const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                    const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                    
                    if (qtyDiff >= 0) {
                      showMessage('No quantity to return', 'error');
                      return;
                    }
                    
                    if (editingItem.status !== 'approved') {
                      showMessage('Please approve the return first', 'error');
                      return;
                    }
                    
                    try {
                      // Process the return - add stock back and mark as returned
                      const returnedQty = Math.abs(qtyDiff);
                      await api.post(`/returns/${selectedBilling.return_id}/process-return`, {
                        item_name: editingItem.name,
                        batch_no: editingItem.batch_no,
                        quantity: returnedQty
                      });
                      
                      // Mark item as returned in the UI
                      setEditingItem({...editingItem, returned: true});
                      showMessage(`Returned ${returnedQty} units of ${editingItem.name} to batch ${editingItem.batch_no}`);
                    } catch (err) {
                      console.error('Failed to process return:', err);
                      showMessage('Failed to process return', 'error');
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    (() => {
                      const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                      const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                      const canReturn = qtyDiff < 0 && editingItem.status === 'approved' && !editingItem.returned;
                      return canReturn 
                        ? 'bg-orange-600 text-white hover:bg-orange-700' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed';
                    })()
                  }`}
                  disabled={(() => {
                    const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                    const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                    return qtyDiff >= 0 || editingItem.status !== 'approved' || editingItem.returned;
                  })()}
                >
                  {(() => {
                    const originalItem = invoiceItems.find(item => item.id === editingItem.id);
                    const qtyDiff = editingItem.qty - (originalItem?.qty || 0);
                    if (editingItem.returned) return 'Returned';
                    return qtyDiff < 0 ? `Return ${Math.abs(qtyDiff)}` : 'Return';
                  })()}
                </button>
                <button
                  onClick={saveItemEdit}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>



);
}