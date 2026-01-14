import { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";

// Payment Form Component
function PaymentForm({ grn, onSave, onCancel, filteredGrnList, payments, showToast }) {
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    reference: '',
    remarks: '',
    amount: ''
  });

  const [bankDetails, setBankDetails] = useState(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [editingBankDetails, setEditingBankDetails] = useState(false);
  const [bankForm, setBankForm] = useState({
    ifsc_code: '',
    account_number: '',
    account_holder_name: '',
    branch_name: ''
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

  const fetchVendorBankDetails = async () => {
    try {
      const vendorRes = await api.get(`/vendors/by-name/${encodeURIComponent(grn.vendor_name)}`);
      const bankRes = await api.get(`/vendors/${vendorRes.data.id}/bank-details`);
      
      setBankDetails(bankRes.data);
      setBankForm({
        ifsc_code: bankRes.data.ifsc_code || '',
        account_number: bankRes.data.account_number || '',
        account_holder_name: bankRes.data.account_holder_name || '',
        branch_name: bankRes.data.branch_name || ''
      });
      
      setShowBankDetails(true);
      
      if (!bankRes.data.ifsc_code && !bankRes.data.account_number) {
        setEditingBankDetails(true);
      }
    } catch (err) {
      console.error('Failed to fetch vendor bank details:', err);
      setShowBankDetails(true);
      setEditingBankDetails(true);
    }
  };

  const handleMethodChange = (method) => {
    setPaymentData({ ...paymentData, method });
    
    if (method === 'Bank Transfer') {
      fetchVendorBankDetails();
    } else {
      setShowBankDetails(false);
      setEditingBankDetails(false);
    }
  };

  const saveBankDetails = async () => {
    try {
      const vendorRes = await api.get(`/vendors/by-name/${encodeURIComponent(grn.vendor_name)}`);
      await api.put(`/vendors/${vendorRes.data.id}/bank-details`, bankForm);
      
      setBankDetails({ ...bankDetails, ...bankForm });
      setEditingBankDetails(false);
    } catch (err) {
      console.error('Failed to save bank details:', err);
    }
  };
  
  const paymentAmount = parseFloat(paymentData.amount) || 0;
  const selectedAmount = grn?.total_amount || 0;
  const paidAmount = payments[grn?.id] || 0;
  const outstandingAmount = Math.max(0, selectedAmount - paidAmount);
  const totalToPay = outstandingAmount;

  const handleSave = async () => {
    if (paymentAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }
    
    if (paymentData.method === 'Bank Transfer') {
      if (!bankForm.ifsc_code || !bankForm.account_number || !bankForm.account_holder_name) {
        showToast('Please fill all required bank details', 'error');
        return;
      }
      
      if (editingBankDetails) {
        await saveBankDetails();
      }
    }
    
    onSave(grn.id, paymentAmount, paymentData.method, paymentData.reference, paymentData.remarks);
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
            onChange={(e) => handleMethodChange(e.target.value)}
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
      
      {/* Bank Details Section */}
      {showBankDetails && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-blue-900">Bank Details</h4>
            {bankDetails && !editingBankDetails && (
              <button
                type="button"
                onClick={() => setEditingBankDetails(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
          </div>

          {editingBankDetails ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  value={bankForm.ifsc_code}
                  onChange={(e) => setBankForm({...bankForm, ifsc_code: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., SBIN0001234"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
                <input
                  type="text"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({...bankForm, account_number: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Account number"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  value={bankForm.account_holder_name}
                  onChange={(e) => setBankForm({...bankForm, account_holder_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Account holder name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={bankForm.branch_name}
                  onChange={(e) => setBankForm({...bankForm, branch_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Branch name"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">IFSC Code:</span>
                <div className="text-gray-600">{bankDetails?.ifsc_code || 'Not provided'}</div>
              </div>
              <div>
                <span className="font-medium">Account Number:</span>
                <div className="text-gray-600">{bankDetails?.account_number || 'Not provided'}</div>
              </div>
              <div>
                <span className="font-medium">Account Holder:</span>
                <div className="text-gray-600">{bankDetails?.account_holder_name || 'Not provided'}</div>
              </div>
              <div>
                <span className="font-medium">Branch:</span>
                <div className="text-gray-600">{bankDetails?.branch_name || 'Not provided'}</div>
              </div>
            </div>
          )}
        </div>
      )}
      
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
  const [paymentFilter, setPaymentFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [viewModal, setViewModal] = useState({ isOpen: false, grn: null });
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, grn: null });
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, grn: null });
  const [payments, setPayments] = useState({});
  const [paymentHistory, setPaymentHistory] = useState({});
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("vendor_ledger.view")) {
      fetchGRNList();
      fetchVendors();
    }
  }, []);

  useEffect(() => {
    let filtered = Array.isArray(grnList) ? grnList : [];
    
    if (selectedVendor) {
      filtered = filtered.filter(grn => grn.vendor_name === selectedVendor);
    }
    
    if (paymentFilter) {
      filtered = filtered.filter(grn => {
        const paidAmount = payments[grn.id] || 0;
        const totalAmount = grn.total_amount || 0;
        const outstanding = Math.max(0, totalAmount - paidAmount);
        
        if (paymentFilter === 'paid') return outstanding === 0 && paidAmount > 0;
        if (paymentFilter === 'unpaid') return paidAmount === 0 && totalAmount > 0;
        if (paymentFilter === 'partial') return paidAmount > 0 && outstanding > 0;
        return true;
      });
    }
    
    setFilteredGrnList(filtered.sort((a, b) => new Date(b.grn_date) - new Date(a.grn_date)));
  }, [selectedVendor, grnList, paymentFilter, payments]);

  // Reset page only when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVendor, paymentFilter]);

  // Fetch payments for all filtered data once
  useEffect(() => {
    if (filteredGrnList.length > 0 && filteredGrnList.length <= 100 && !paymentFilter) {
      fetchPaymentsForGRNs(filteredGrnList);
    }
  }, [filteredGrnList.length]);

  // Fetch payments when payment filter is applied
  useEffect(() => {
    if (paymentFilter && filteredGrnList.length > 0 && Object.keys(payments).length === 0) {
      fetchPaymentsForGRNs(filteredGrnList);
    }
  }, [paymentFilter]);

  // Check if user has permission to view vendor ledger
  if (!hasPermission("vendor_ledger.view")) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view the Vendor Ledger.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors/');
      const vendorData = res.data || [];
      const vendorArray = Array.isArray(vendorData) ? vendorData : [];
      console.log('Vendor Ledger - Vendors:', vendorArray);
      setVendors(vendorArray);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setVendors([]);
      if (err.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
        window.location.href = '/login';
      }
    }
  };



  const fetchPaymentsForGRNs = async (grnList) => {
    if (!grnList || grnList.length === 0) return;
    
    try {
      setPaymentsLoading(true);
      const paymentMap = {};
      
      // Batch API calls with Promise.allSettled and timeout to prevent blocking
      const paymentPromises = grnList.map(async (grn) => {
        try {
          // Add timeout to prevent hanging requests (reduced to 5 seconds)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 5000)
          );
          
          const apiPromise = api.get(`/payments/${grn.grn_number}`);
          const res = await Promise.race([apiPromise, timeoutPromise]);
          
          return { id: grn.id, amount: res.data.total_paid || 0 };
        } catch (err) {
          console.error(`Failed to fetch payment for GRN ${grn.grn_number}:`, err);
          return { id: grn.id, amount: 0 };
        }
      });
      
      const results = await Promise.allSettled(paymentPromises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          paymentMap[result.value.id] = result.value.amount;
        }
      });
      
      setPayments(paymentMap);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      showToast('Some payment data could not be loaded', 'warning');
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Calculate total advance amount for filtered/selected vendor
  // const totalAdvanceAmount = (filteredGrnList.length > 0 ? filteredGrnList : grnList).reduce((total, grn) => {
  //   const paidAmount = payments[grn.id] || 0;
  //   const outstanding = (grn.total_amount || 0) - paidAmount;
  //   if (outstanding < 0) {
  //     return total + Math.abs(outstanding);
  //   }
  //   return total;
  // }, 0) - (usedAdvances[selectedVendor] || 0);

  const fetchPaymentHistory = async (grnNumber) => {
    try {
      const res = await api.get(`/payments/history/${grnNumber}`);
      return res.data.payment_history || [];
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      return [];
    }
  };

  const handleViewGRN = async (grn) => {
    if (!hasPermission("vendor_ledger.view")) {
      showToast("Permission denied", 'error');
      return;
    }
    
    // Fetch payment history for this GRN
    const history = await fetchPaymentHistory(grn.grn_number);
    setPaymentHistory(prev => ({ ...prev, [grn.grn_number]: history }));
    
    setViewModal({ isOpen: true, grn });
  };

  const handlePrintGRN = async (grn) => {
    if (!hasPermission("vendor_ledger.print")) {
      showToast("Permission denied", 'error');
      return;
    }
    try {
      const res = await api.get(`/payments/ledger/print/${grn.grn_number}`);
      
      if (res.data.error) {
        showToast(`Error: ${res.data.error}`, 'error');
        return;
      }
      
      // Get HTML content from backend
      const htmlContent = res.data.html_content;
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
      showToast('Print dialog opened successfully', 'success');
    } catch (err) {
      console.error('Failed to print:', err);
      showToast('Failed to print vendor ledger', 'error');
    }
  };



  // const handleInvoiceGRN = async (grn) => {
  //   if (!hasPermission("vendor_ledger.invoice_view")) {
  //     showToast("Permission denied", 'error');
  //     return;
  //   }
  //   try {
  //     const res = await api.get(`/grn/${grn.id}`);
  //     setInvoiceModal({ isOpen: true, grn: res.data });
  //   } catch (err) {
  //     console.error('Failed to fetch GRN details for invoice:', err);
  //     setInvoiceModal({ isOpen: true, grn });
  //   }
  // };

  const handlePayment = (grn) => {
    if (!hasPermission("vendor_ledger.pay")) {
      showToast("Permission denied", 'error');
      return;
    }
    setPaymentModal({ isOpen: true, grn });
  };

  const savePayment = async (grnId, amount, paymentMethod, reference, remarks) => {
    try {
      const params = new URLSearchParams({
        grn_id: grnId,
        amount: parseFloat(amount),
        payment_method: paymentMethod || 'Cash',
        reference: reference || '',
        remarks: remarks || ''
      });
      
      const response = await api.post(`/payments?${params.toString()}`);
      
      // Only update local state if API call was successful
      if (response.status === 200 || response.status === 201) {
        setPayments(prev => ({
          ...prev,
          [grnId]: (prev[grnId] || 0) + parseFloat(amount)
        }));
        
        // Refresh payments after successful payment
        const currentList = filteredGrnList.length > 0 ? filteredGrnList : grnList;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentPageData = currentList.slice(startIndex, endIndex);
        if (currentPageData.length > 0) {
          setTimeout(() => fetchPaymentsForGRNs(currentPageData), 100);
        }
        
        setPaymentModal({ isOpen: false, grn: null });
        showToast(`Payment of ₹${parseFloat(amount).toFixed(2)} saved successfully`, 'success');
      } else {
        throw new Error('Payment API call failed with status: ' + response.status);
      }
    } catch (err) {
      console.error('Failed to save payment:', err);
      showToast('Failed to save payment: ' + (err.response?.data?.detail || err.message), 'error');
      
      // Refetch payments to ensure data consistency
      if (filteredGrnList.length > 0) {
        fetchPaymentsForGRNs(filteredGrnList);
      }
    }
  };

  const fetchGRNList = async () => {
    try {
      setLoading(true);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const apiPromise = api.get("/grn/list?page=1&limit=1000");
      const res = await Promise.race([apiPromise, timeoutPromise]);
      
      const grnData = res.data?.data || res.data || [];
      const grnArray = Array.isArray(grnData) ? grnData : [];
      console.log('Vendor Ledger - GRN Data:', grnArray);
      setGrnList(grnArray);
    } catch (err) {
      if (err.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
        window.location.href = '/login';
        return;
      }
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 8000)
        );
        
        const apiPromise = api.get("/grn/");
        const res = await Promise.race([apiPromise, timeoutPromise]);
        
        const grnData = res.data || [];
        const grnArray = Array.isArray(grnData) ? grnData : [];
        console.log('Vendor Ledger - GRN Data (fallback):', grnArray);
        setGrnList(grnArray);
      } catch (err2) {
        console.error("Failed to fetch GRN list:", err2);
        setGrnList([]);
        showToast('Failed to load GRN data. Please refresh the page.', 'error');
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
            {paymentsLoading && (
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading payment data...
              </div>
            )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
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
              {loading || paymentsLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">
                        {loading ? 'Loading GRN data...' : 'Loading payment information...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredGrnList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    {selectedVendor ? `No records found for ${selectedVendor}` : 'No GRN records found'}
                  </td>
                </tr>
              ) : (
                filteredGrnList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((grn) => {
                  // Memoize calculations to prevent re-computation on every render
                  const paidAmount = payments[grn.id] || 0;
                  const totalAmount = grn.total_amount || 0;
                  const outstanding = Math.max(0, totalAmount - paidAmount);
                  const status = paidAmount === 0 ? 'Unpaid' : outstanding === 0 ? 'Paid' : 'Partial';
                  
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
                      <div className="font-medium">
                        ₹{paidAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium">
                        ₹{outstanding.toFixed(2)}
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
                        {hasPermission("vendor_ledger.pay") && (
                        <button 
                          onClick={() => handlePayment(grn)}
                          disabled={outstanding === 0}
                          className={`px-3 py-1 rounded text-sm ${
                            outstanding === 0 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Pay
                        </button>
                        )}
                        {hasPermission("vendor_ledger.view") && (
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
                        )}
                        {hasPermission("vendor_ledger.print") && (
                        <button 
                          onClick={() => handlePrintGRN(grn)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Print Ledger"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredGrnList.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredGrnList.length)} to {Math.min(currentPage * itemsPerPage, filteredGrnList.length)} of {filteredGrnList.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.ceil(filteredGrnList.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === Math.ceil(filteredGrnList.length / itemsPerPage) || 
                  Math.abs(page - currentPage) <= 2
                )
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && <span className="px-2">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded ${
                        currentPage === page 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))
              }
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredGrnList.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredGrnList.length / itemsPerPage)}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
              onSave={(grnId, amount, method, reference, remarks) => {
                savePayment(grnId, amount, method, reference, remarks);
              }}
              onCancel={() => setPaymentModal({ isOpen: false, grn: null })}
              filteredGrnList={filteredGrnList}
              payments={payments}
              showToast={showToast}
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
                        {(() => {
                          const history = paymentHistory[viewModal.grn.grn_number] || [];
                          if (history.length > 0) {
                            return (
                              <div className="space-y-2">
                                {history.map((payment, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                                    <div className="flex-1">
                                      <div className="font-medium text-green-600">₹{payment.payment_amount.toFixed(2)}</div>
                                      <div className="text-xs text-gray-500">{payment.payment_date}</div>
                                    </div>
                                    <div className="flex-1 text-center">
                                      <div className="text-sm">{payment.payment_method}</div>
                                      {payment.reference_number && (
                                        <div className="text-xs text-gray-500">Ref: {payment.reference_number}</div>
                                      )}
                                    </div>
                                    <div className="flex-1 text-right">
                                      {payment.remarks && (
                                        <div className="text-xs text-gray-600">{payment.remarks}</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="text-xs text-gray-500 mt-2">
                                  Total {history.length} payment{history.length !== 1 ? 's' : ''} made
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-gray-500">
                                {paidAmount > 0 ? 
                                  `Payment of ₹${paidAmount.toFixed(2)} recorded for this vendor.` :
                                  'No payments found for this vendor.'
                                }
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </>
                  );
                })()}
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
                                  <p className="text-xs text-gray-500">Batch: {item.batches?.[0]?.batch_no || 'N/A'} - {item.batches?.[0]?.location || 'N/A'}</p>
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
                  {hasPermission("vendor_ledger.print") && (
                  <button 
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Invoice
                  </button>
                  )}
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
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}