import { useState, useEffect } from "react";
import api from "../../api";

// Payment Form Component
function PaymentForm({ grn, onSave, onCancel, filteredGrnList, payments }) {
  // Calculate total due amount for the vendor
  const totalDueAmount = filteredGrnList.reduce((total, grnItem) => {
    const paidAmount = payments[grnItem.id] || 0;
    const outstanding = Math.max(0, (grnItem.total_amount || 0) - paidAmount);
    return total + outstanding;
  }, 0);



  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    reference: '',
    remarks: '',
    amount: ''
  });
  
  // Pre-fill amount with outstanding amount when component mounts or grn changes
  useEffect(() => {
    if (grn && payments) {
      const paidAmount = payments[grn.id] || 0;
      const totalAmount = grn.total_amount || 0;
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);
      setPaymentData(prev => ({
        ...prev,
        amount: outstandingAmount > 0 ? outstandingAmount.toString() : ''
      }));
    }
  }, [grn, payments]);

  
  const paymentAmount = parseFloat(paymentData.amount) || 0;
  const selectedAmount = grn?.total_amount || 0;
  const paidAmount = payments[grn?.id] || 0;
  const outstandingAmount = Math.max(0, selectedAmount - paidAmount);
  const totalToPay = outstandingAmount;

  const handleSave = () => {
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    onSave(grn.id, paymentAmount, 0);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
          <input
            type="date"
            value={paymentData.date}
            onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select
            value={paymentData.method}
            onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="UPI">UPI</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
          <input
            type="text"
            value={paymentData.reference}
            onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Reference number"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <input
            type="text"
            value={paymentData.remarks}
            onChange={(e) => setPaymentData({...paymentData, remarks: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Payment remarks"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            value={paymentData.amount}
            onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Payment amount"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Allocation</h4>
        <div className="flex items-center mb-3">
          <input type="checkbox" id="autoAllocate" className="mr-2" defaultChecked />
          <label htmlFor="autoAllocate" className="text-sm">Auto allocate (oldest first)</label>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <div>Selected: ₹{selectedAmount.toFixed(2)}</div>
          <div>Outstanding: ₹{outstandingAmount.toFixed(2)}</div>
          <div className="font-medium text-blue-600">Total to Pay: ₹{totalToPay.toFixed(2)}</div>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Any extra amount becomes Advance.
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Payment
        </button>
      </div>
    </div>
  );
}

export default function SupplierLedger() {
  const [grnList, setGrnList] = useState([]);
  const [filteredGrnList, setFilteredGrnList] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState({ isOpen: false, grn: null });
  const [printModal, setPrintModal] = useState({ isOpen: false, grn: null });
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, grn: null });
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, grn: null });
  const [payments, setPayments] = useState({});
  const [totalAdvance, setTotalAdvance] = useState(0);
  const [usedAdvances, setUsedAdvances] = useState({});

  useEffect(() => {
    fetchGRNList();
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      const filtered = grnList.filter(grn => grn.vendor_name === selectedVendor);
      setFilteredGrnList(filtered);
      // Fetch payments for filtered GRNs
      if (filtered.length > 0) {
        fetchPaymentsForGRNs(filtered);
      }
    } else {
      setFilteredGrnList(grnList);
    }
  }, [selectedVendor, grnList]);

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors/');
      setVendors(res.data || []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const fetchPaymentsForGRNs = async (grnList) => {
    try {
      const paymentMap = {};
      let advanceTotal = 0;
      
      for (const grn of grnList) {
        try {
          const res = await api.get(`/payments/${grn.grn_number}`);
          const paidAmount = res.data.total_paid || 0;
          paymentMap[grn.id] = paidAmount;
          
          // Calculate advance (overpayment)
          const outstanding = (grn.total_amount || 0) - paidAmount;
          if (outstanding < 0) {
            advanceTotal += Math.abs(outstanding);
          }
        } catch (err) {
          console.error(`Failed to fetch payment for GRN ${grn.grn_number}:`, err);
          paymentMap[grn.id] = 0;
        }
      }
      
      setPayments(paymentMap);
      setTotalAdvance(advanceTotal);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    }
  };

  // Calculate total advance amount for filtered/selected vendor
  const totalAdvanceAmount = (filteredGrnList.length > 0 ? filteredGrnList : grnList).reduce((total, grn) => {
    const paidAmount = payments[grn.id] || 0;
    const outstanding = (grn.total_amount || 0) - paidAmount;
    if (outstanding < 0) {
      return total + Math.abs(outstanding);
    }
    return total;
  }, 0) - (usedAdvances[selectedVendor] || 0);

  const handleViewGRN = (grn) => {
    setViewModal({ isOpen: true, grn });
  };

  const handlePrintGRN = (grn) => {
    setPrintModal({ isOpen: true, grn });
  };

  const handleInvoiceGRN = async (grn) => {
    try {
      const res = await api.get(`/grn/${grn.id}`);
      setInvoiceModal({ isOpen: true, grn: res.data });
    } catch (err) {
      console.error('Failed to fetch GRN details for invoice:', err);
      setInvoiceModal({ isOpen: true, grn });
    }
  };

  const handlePayment = (grn) => {
    setPaymentModal({ isOpen: true, grn });
  };

  const savePayment = async (grnId, amount) => {
    try {
      const response = await api.post(`/payments?grn_id=${grnId}&amount=${parseFloat(amount)}`);
      
      // Only update local state if API call was successful
      if (response.status === 200 || response.status === 201) {
        setPayments(prev => ({
          ...prev,
          [grnId]: (prev[grnId] || 0) + parseFloat(amount)
        }));
        
        // Recalculate advance amount
        const updatedGrnList = filteredGrnList.length > 0 ? filteredGrnList : grnList;
        setTimeout(() => fetchPaymentsForGRNs(updatedGrnList), 100);
        
        setPaymentModal({ isOpen: false, grn: null });
      } else {
        throw new Error('Payment API call failed with status: ' + response.status);
      }
    } catch (err) {
      console.error('Failed to save payment:', err);
      alert('Failed to save payment: ' + (err.response?.data?.detail || err.message));
      
      // Refetch payments to ensure data consistency
      if (filteredGrnList.length > 0) {
        fetchPaymentsForGRNs(filteredGrnList);
      }
    }
  };

  const fetchGRNList = async () => {
    try {
      setLoading(true);
      const res = await api.get("/grn/list");
      setGrnList(res.data || []);
      if (res.data && res.data.length > 0) {
        await fetchPaymentsForGRNs(res.data);
      }
    } catch (err) {
      try {
        const res = await api.get("/grn/");
        setGrnList(res.data || []);
        if (res.data && res.data.length > 0) {
          await fetchPaymentsForGRNs(res.data);
        }
      } catch (err2) {
        console.error("Failed to fetch GRN list:", err2);
        setGrnList([]);
      }
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
            <h1 className="text-2xl font-semibold mb-2">Vendor Ledger</h1>
            <p className="text-gray-600">Track vendor transactions and outstanding amounts</p>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Vendor</label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.email}>
                    {vendor.vendor_name} ({vendor.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Ledger Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">GRN</th>
                <th className="text-left p-4 font-medium text-gray-700">Vendor</th>
                <th className="text-left p-4 font-medium text-gray-700">Invoice</th>
                <th className="text-right p-4 font-medium text-gray-700">Amount</th>
                <th className="text-center p-4 font-medium text-gray-700">Paid</th>
                <th className="text-right p-4 font-medium text-gray-700">Outstanding</th>
                <th className="text-center p-4 font-medium text-gray-700">Status</th>
                <th className="text-center p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredGrnList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    {selectedVendor ? `No records found for ${selectedVendor}` : 'No GRN records found'}
                  </td>
                </tr>
              ) : (
                filteredGrnList.map((grn) => {
                  const paidAmount = payments[grn.id] || 0;
                  const totalAmount = grn.total_amount || 0;
                  const outstanding = Math.max(0, totalAmount - paidAmount);
                  const getPaymentStatus = () => {
                    if (paidAmount === 0) return 'Unpaid';
                    if (outstanding === 0) return 'Paid';
                    return 'Partial';
                  };
                  const status = getPaymentStatus();
                  
                  return (
                  <tr key={grn.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{grn.grn_number}</div>
                      <div className="text-sm text-gray-500">
                        Date: {new Date(grn.grn_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{grn.vendor_name}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">
                        {grn.invoice_number || '—'}
                      </div>
                      {grn.invoice_date && (
                        <div className="text-sm text-gray-500">
                          Due: {new Date(grn.invoice_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium">
                        ₹{totalAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="space-y-1">
                        {outstanding > 0 && (
                          <div className="font-medium text-green-600">
                            ₹{outstanding.toFixed(2)}
                          </div>
                        )}
                        {paidAmount > 0 && (
                          <button 
                            onClick={() => handlePayment(grn)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-medium ${paidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{paidAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-sm ${
                        status === 'Paid' ? 'bg-green-100 text-green-800' : 
                        status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleViewGRN(grn)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handlePrintGRN(grn)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Print Invoice"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleInvoiceGRN(grn)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Generate Invoice"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Record Payment</h2>
              <button 
                onClick={() => setPaymentModal({ isOpen: false, grn: null })}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <PaymentForm 
              grn={paymentModal.grn}
              onSave={(grnId, amount) => {
                savePayment(grnId, amount);
              }}
              onCancel={() => setPaymentModal({ isOpen: false, grn: null })}
              filteredGrnList={filteredGrnList}
              payments={payments}
            />
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Invoice Details</h2>
              <div className="text-sm text-gray-500">{viewModal.grn?.invoice_number}</div>
              <button 
                onClick={() => setViewModal({ isOpen: false, grn: null })}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {viewModal.grn && (
              <div className="space-y-6">
                {(() => {
                  const paidAmount = payments[viewModal.grn.id] || 0;
                  const totalAmount = viewModal.grn.total_amount || 0;
                  const outstanding = Math.max(0, totalAmount - paidAmount);
                  const getStatus = () => {
                    if (paidAmount === 0) return 'Unpaid';
                    if (outstanding === 0) return 'Paid';
                    return 'Partial';
                  };
                  const status = getStatus();
                  
                  return (
                    <>
                      {/* Top Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Vendor</div>
                          <div className="font-semibold">{viewModal.grn.vendor_name}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Invoice</div>
                          <div className="font-semibold">{viewModal.grn.invoice_number || '—'}</div>
                          <div className="text-sm text-gray-500">
                            {viewModal.grn.invoice_date ? new Date(viewModal.grn.invoice_date).toLocaleDateString() : ''}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Status</div>
                          <span className={`px-2 py-1 rounded text-sm ${
                            status === 'Paid' ? 'bg-green-100 text-green-800' : 
                            status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Invoice Amount</div>
                          <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Paid</div>
                          <div className="text-2xl font-bold text-green-600">₹{paidAmount.toFixed(2)}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Outstanding</div>
                          <div className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{outstanding.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Payment History */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Payment History</div>
                        <div className="text-gray-500">
                          {paidAmount > 0 ? 
                            `Payment of ₹${paidAmount.toFixed(2)} recorded for this vendor.` :
                            'No payments found for this vendor.'
                          }
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Print Invoice</h2>
              <button 
                onClick={() => setPrintModal({ isOpen: false, grn: null })}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {printModal.grn && (
              <div className="print-content">
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                  <h1 className="text-2xl font-bold">VENDOR INVOICE</h1>
                  <p className="text-gray-600">Invoice #{printModal.grn.invoice_number || printModal.grn.grn_number}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold mb-2">Vendor Details</h3>
                    <p className="font-medium">{printModal.grn.vendor_name}</p>
                    <p className="text-gray-600">Vendor Address</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold mb-2">Invoice Details</h3>
                    <p>Date: {new Date(printModal.grn.grn_date).toLocaleDateString()}</p>
                    <p>Amount: ₹{printModal.grn.total_amount.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="text-center mt-8">
                  <button 
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Print
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Invoice - {invoiceModal.grn?.grn_number}
              </h2>
              <button 
                onClick={() => setInvoiceModal({ isOpen: false, grn: null })}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            {invoiceModal.grn && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-green-700 mb-2">INVOICE</h3>
                      <div className="space-y-1 text-sm">
                        <p><strong>Invoice No:</strong> INV-{invoiceModal.grn.grn_number}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>GRN Reference:</strong> {invoiceModal.grn.grn_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-green-100 px-4 py-2 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Amount</p>
                        <p className="text-2xl font-bold text-green-700">₹{invoiceModal.grn.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Bill To:</h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{invoiceModal.grn.vendor_name}</p>
                      <p className="text-gray-600">Vendor Address Line 1</p>
                      <p className="text-gray-600">City, State - 000000</p>
                      <p className="text-gray-600">Phone: +91 XXXXXXXXXX</p>
                    </div>
                  </div>
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Ship To:</h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{invoiceModal.grn.store}</p>
                      <p className="text-gray-600">Store Address Line 1</p>
                      <p className="text-gray-600">City, State - 000000</p>
                      <p className="text-gray-600">Phone: +91 XXXXXXXXXX</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 text-lg">Items</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">S.No</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">Description</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 border-b">Qty</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 border-b">Rate</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 border-b">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invoiceModal.grn.items?.map((item, idx) => {
                          const itemAmount = (item.received_qty || 0) * (item.rate || 0);
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-3 px-4 text-center text-sm">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900">{item.item_name}</p>
                                  <p className="text-xs text-gray-500">Batch: {item.batches?.[0]?.batch_no || 'N/A'}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center text-sm">{item.received_qty}</td>
                              <td className="py-3 px-4 text-right text-sm">₹{item.rate}</td>
                              <td className="py-3 px-4 text-right text-sm font-medium">₹{itemAmount.toFixed(2)}</td>
                            </tr>
                          );
                        }) || (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">No items found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{invoiceModal.grn.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Tax (0%):</span>
                    <span className="font-medium">₹0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 mb-4">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">₹{invoiceModal.grn.total_amount.toFixed(2)}</span>
                  </div>
                  
                  {/* Payment Details */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Payment Details</h4>
                    {(() => {
                      const paidAmount = payments[invoiceModal.grn.id] || 0;
                      const totalAmount = invoiceModal.grn.total_amount || 0;
                      const outstanding = Math.max(0, totalAmount - paidAmount);
                      const getStatus = () => {
                        if (paidAmount === 0) return 'Unpaid';
                        if (outstanding === 0) return 'Paid';
                        return 'Partial';
                      };
                      const status = getStatus();
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Paid Amount:</span>
                            <span className={`font-medium ${paidAmount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                              ₹{paidAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Outstanding:</span>
                            <span className={`font-medium ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{outstanding.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-gray-600">Payment Status:</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              status === 'Paid' ? 'bg-green-100 text-green-800' : 
                              status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500 border-t pt-4">
                  <p>Thank you for your business!</p>
                  <p className="mt-2">Generated on: {new Date().toLocaleString()}</p>
                </div>

                <div className="flex justify-center space-x-4 pt-4">
                  <button 
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Invoice
                  </button>
                  <button 
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}