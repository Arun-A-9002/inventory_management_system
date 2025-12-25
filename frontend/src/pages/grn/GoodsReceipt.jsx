// src/pages/grn/GoodsReceipt.jsx
import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";

export default function GoodsReceipt() {
  const { toast, showToast, hideToast } = useToast();
  const [poList, setPoList] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState({ isOpen: false, grn: null });
  const [printModal, setPrintModal] = useState({ isOpen: false, grn: null });
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, grn: null });
  const [editMode, setEditMode] = useState({ isEditing: false, grnId: null });

  const [form, setForm] = useState({
    grn_date: new Date().toISOString().split('T')[0],
    po_number: "",
    vendor_name: "",
    store: "",
    invoice_number: "",
    invoice_date: "",
    with_po: true
  });

  const [grnItems, setGrnItems] = useState([
    {
      item_name: "",
      po_qty: 0,
      price: 0,
      mrp: 0,
      tax: 0,
      batch_no: "",
      expiry_date: "",
      showPieceCalc: false,
      container: 0,
      package: 0,
      piece: 0,
      package_cost: 0,
      package_mrp: 0
    }
  ]);

  const [itemList, setItemList] = useState([]);
  const [locations, setLocations] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Fetch item list
  const fetchItemList = async () => {
    try {
      const res = await api.get("/items/");
      setItemList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItemList([]);
    }
  };
  const fetchPOList = async () => {
    try {
      const res = await api.get("/purchase/po");
      setPoList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch PO list:", err);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const res = await api.get("/inventory/locations/");
      setLocations(res.data || []);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      setLocations([]);
    }
  };

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      const res = await api.get("/vendors/");
      setVendors(res.data || []);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setVendors([]);
    }
  };

  // Fetch GRN list
  const fetchGRNList = async () => {
    try {
      setLoading(true);
      const res = await api.get("/grn/list");
      console.log('GRN API Response:', res.data);
      setGrnList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch GRN list:", err);
      // Try alternative endpoint
      try {
        const res = await api.get("/grn/");
        console.log('GRN Alternative API Response:', res.data);
        setGrnList(res.data || []);
      } catch (err2) {
        console.error("Both GRN endpoints failed:", err2);
        setGrnList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOList();
    fetchGRNList();
    fetchItemList();
    fetchLocations();
    fetchVendors();
  }, []);



  const fetchPODetails = async (poNumber) => {
    try {
      const poRes = await api.get(`/purchase/po/${poNumber}`);
      const poDetails = poRes.data;
      
      // Get PR details using the PR number from PO
      if (poDetails?.pr_number) {
        const prRes = await api.get('/purchase/pr');
        const matchingPR = prRes.data?.find(pr => pr.pr_number === poDetails.pr_number);
        
        if (matchingPR) {
          const prDetailRes = await api.get(`/purchase/${matchingPR.id}`);
          if (prDetailRes.data?.items?.length > 0) {
            const mappedItems = await Promise.all(prDetailRes.data.items.map(async (item) => {
              // Find matching item in item master to get price and MRP
              const masterItem = itemList.find(master => master.name === item.item_name);
              return {
                item_name: item.item_name || '',
                po_qty: item.quantity || 0,
                price: masterItem?.fixing_price || 0,
                mrp: masterItem?.mrp || 0,
                tax: masterItem?.tax || 0,
                batch_no: '',
                expiry_date: ''
              };
            }));
            setGrnItems(mappedItems);
            showToast(`Loaded ${mappedItems.length} items from Purchase Request with prices`, 'success');
            return;
          }
        }
      }
      
      // Fallback: Check if PO has direct items
      if (poDetails?.items?.length > 0) {
        const mappedItems = await Promise.all(poDetails.items.map(async (item) => {
          // Find matching item in item master to get price and MRP
          const masterItem = itemList.find(master => master.name === item.item_name);
          return {
            item_name: item.item_name || '',
            po_qty: item.quantity || 0,
            price: masterItem?.fixing_price || 0,
            mrp: masterItem?.mrp || 0,
            tax: masterItem?.tax || 0,
            batch_no: '',
            expiry_date: ''
          };
        }));
        setGrnItems(mappedItems);
        showToast(`Loaded ${mappedItems.length} items from PO with prices`, 'success');
        return;
      }
      
      // No items found
      showToast('No items found for this PO', 'warning');
      
    } catch (err) {
      console.error('Error fetching PO details:', err);
      showToast('Failed to load PO items', 'error');
    }
  };

  // Handle PO selection
  const handlePOSelect = async (poNumber) => {
    const selectedPO = poList.find(po => po.po_number === poNumber);
    if (selectedPO) {
      setForm({
        ...form,
        po_number: poNumber,
        vendor_name: selectedPO.vendor || ''
      });
      
      // Fetch and populate PO items
      if (poNumber) {
        await fetchPODetails(poNumber);
      }
    } else {
      // Reset items if no PO selected
      setGrnItems([{
        item_name: '',
        po_qty: 0,
        price: 0,
        mrp: 0,
        tax: 0,
        batch_no: '',
        expiry_date: ''
      }]);
    }
  };

  // Add new item row
  const addItemRow = () => {
    setGrnItems([...grnItems, {
      item_name: "",
      po_qty: 0,
      price: 0,
      mrp: 0,
      tax: 0,
      batch_no: "",
      expiry_date: "",
      showPieceCalc: false,
      container: 0,
      package: 0,
      piece: 0,
      package_cost: 0,
      package_mrp: 0
    }]);
  };

  // Save price to item master
  const savePriceToItemMaster = async (index) => {
    const item = grnItems[index];
    
    if (!item.item_name || !item.price) {
      showToast('Please enter item name and unit price', 'error');
      return;
    }
    
    try {
      await api.post('/grn/save-price', {
        item_name: item.item_name,
        unit_price: item.price,
        mrp: item.mrp || 0
      });
      showToast(`Prices saved to item master for ${item.item_name}`, 'success');
    } catch (err) {
      showToast('Failed to save prices to item master', 'error');
    }
  };
  const updateItem = (index, field, value) => {
    const updatedItems = grnItems.map((item, idx) => {
      if (idx === index) {
        const newItem = { ...item, [field]: value };
        
        // Calculate total pieces from container × package × piece
        const totalPieces = (newItem.container || 0) * (newItem.package || 0) * (newItem.piece || 0);
        
        // Auto-update quantity with calculated total when piece calculation changes
        if (totalPieces > 0) {
          newItem.po_qty = totalPieces; // Override quantity with calculated total
        }
        
        // Auto-calculate and update unit price and MRP when piece calculation changes
        if (totalPieces > 0 && (newItem.package_cost > 0 || newItem.package_mrp > 0)) {
          const totalPackage = (newItem.container || 0) * (newItem.package || 0);
          
          if (newItem.package_cost > 0) {
            const subtotal = totalPackage * newItem.package_cost;
            const costPerPiece = subtotal / totalPieces;
            newItem.price = parseFloat(costPerPiece.toFixed(2));
          }
          
          if (newItem.package_mrp > 0) {
            const mrpTotal = totalPackage * newItem.package_mrp;
            const mrpPerPiece = mrpTotal / totalPieces;
            newItem.mrp = parseFloat(mrpPerPiece.toFixed(2));
          }
        }
        
        return newItem;
      }
      return item;
    });
    setGrnItems(updatedItems);
  };

  // Remove item
  const removeItem = (index) => {
    if (grnItems.length > 1) {
      setGrnItems(grnItems.filter((_, idx) => idx !== index));
    }
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    return grnItems.reduce((sum, item) => {
      const subtotal = (item.po_qty || 0) * (item.price || 0);
      return sum + subtotal;
    }, 0);
  };

  // Calculate subtotal without tax
  const calculateSubtotal = () => {
    return grnItems.reduce((sum, item) => {
      const totalPackage = (item.container || 0) * (item.package || 0);
      if (totalPackage > 0 && item.package_cost > 0) {
        return sum + (totalPackage * item.package_cost);
      }
      return sum + ((item.po_qty || 0) * (item.price || 0));
    }, 0);
  };

  // Calculate MRP total
  const calculateMRPTotal = () => {
    return grnItems.reduce((sum, item) => {
      const totalPackage = (item.container || 0) * (item.package || 0);
      if (totalPackage > 0 && item.package_mrp > 0) {
        return sum + (totalPackage * item.package_mrp);
      }
      return sum + ((item.po_qty || 0) * (item.mrp || 0));
    }, 0);
  };

  // Calculate tax amount
  const calculateTaxAmount = () => {
    return grnItems.reduce((sum, item) => {
      const totalPieces = (item.container || 0) * (item.package || 0) * (item.piece || 0);
      if (totalPieces > 0 && item.package_cost > 0) {
        const taxRate = item.tax || 0;
        return sum + (item.package_cost * taxRate / 100);
      }
      const subtotal = (item.po_qty || 0) * (item.price || 0);
      return sum + (subtotal * (item.tax || 0) / 100);
    }, 0);
  };

  // Update GRN status
  const updateGRNStatus = async (grnId, status) => {
    try {
      await api.put(`/grn/${grnId}/status`, { status });
      showToast(`GRN status updated to ${status}`, 'success');
      fetchGRNList();
    } catch (err) {
      showToast('Failed to update GRN status', 'error');
    }
  };

  // Handle View GRN
  const handleViewGRN = async (grn) => {
    try {
      const res = await api.get(`/grn/${grn.id}`);
      setViewModal({ isOpen: true, grn: res.data });
    } catch (err) {
      showToast('Failed to fetch GRN details', 'error');
    }
  };

  // Handle Print GRN
  const handlePrintGRN = async (grn) => {
    try {
      const res = await api.get(`/grn/${grn.id}`);
      setPrintModal({ isOpen: true, grn: res.data });
    } catch (err) {
      showToast('Failed to fetch GRN details for printing', 'error');
    }
  };

  // Handle Invoice GRN
  const handleInvoiceGRN = async (grn) => {
    try {
      const res = await api.get(`/grn/${grn.id}`);
      setInvoiceModal({ isOpen: true, grn: res.data });
    } catch (err) {
      showToast('Failed to fetch GRN details for invoice', 'error');
    }
  };

  // Print function
  const printGRN = () => {
    window.print();
  };

  // Handle Edit GRN
  const handleEditGRN = async (grn) => {
    try {
      const res = await api.get(`/grn/${grn.id}`);
      const grnData = res.data;
      
      // Set edit mode
      setEditMode({ isEditing: true, grnId: grn.id });
      
      // Load GRN data into form
      setForm({
        grn_date: grnData.grn_date,
        po_number: grnData.po_number,
        vendor_name: grnData.vendor_name,
        store: grnData.store,
        invoice_number: grnData.invoice_number || "",
        invoice_date: grnData.invoice_date || ""
      });
      
      // Load items into form
      const editItems = grnData.items.map(item => ({
        item_name: item.item_name,
        po_qty: item.received_qty,
        price: item.rate,
        mrp: 0, // Default value
        tax: 0, // Default value
        batch_no: item.batches[0]?.batch_no || '',
        expiry_date: item.batches[0]?.expiry_date || ''
      }));
      
      setGrnItems(editItems);
      showToast(`Loaded GRN ${grn.grn_number} for editing`, 'success');
      
    } catch (err) {
      showToast('Failed to load GRN for editing', 'error');
    }
  };

  // Handle Delete GRN
  const handleDeleteGRN = async (grn) => {
    if (window.confirm(`Are you sure you want to delete GRN ${grn.grn_number}?`)) {
      try {
        await api.delete(`/grn/${grn.id}`);
        showToast(`GRN ${grn.grn_number} deleted successfully`, 'success');
        fetchGRNList();
      } catch (err) {
        showToast('Failed to delete GRN', 'error');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.store) {
      showToast("Please select location", 'error');
      return;
    }

    if (form.with_po && !form.po_number) {
      showToast("Please select Purchase Order", 'error');
      return;
    }

    if (!form.with_po && !form.vendor_name) {
      showToast("Please enter vendor name", 'error');
      return;
    }

    if (grnItems.every(item => !item.item_name || item.po_qty === 0 || !item.batch_no)) {
      showToast("Please add at least one item with quantity and batch number", 'error');
      return;
    }

    // Validate that each item has either expiry date or warranty date
    const itemsWithoutDates = grnItems.filter(item => 
      item.item_name && (!item.expiry_date && !item.start_date)
    );
    
    if (itemsWithoutDates.length > 0) {
      showToast("Each item must have either an expiry date or warranty date", 'error');
      return;
    }

    try {
      const totalAmount = calculateTotalAmount();
      
      const grnData = {
        ...form,
        invoice_date: form.invoice_date || null,
        total_amount: totalAmount,
        items: grnItems.map(item => ({
          item_name: item.item_name,
          po_qty: item.po_qty,
          received_qty: item.po_qty,
          uom: "pcs",
          rate: item.price,
          batches: [{
            batch_no: item.batch_no,
            mfg_date: null,
            expiry_date: item.expiry_date || null,
            qty: item.po_qty
          }]
        }))
      };

      let res;
      if (editMode.isEditing) {
        // Update existing GRN
        res = await api.put(`/grn/${editMode.grnId}`, grnData);
        showToast(`GRN Updated: ${res.data.grn_number || 'Successfully'}`, 'success');
      } else {
        // Create new GRN
        res = await api.post("/grn/create", grnData);
        showToast(`GRN Created: ${res.data.grn_number}`, 'success');
      }
      
      // Reset form and edit mode
      setForm({
        grn_date: new Date().toISOString().split('T')[0],
        po_number: "",
        vendor_name: "",
        store: "",
        invoice_number: "",
        invoice_date: ""
      });
      setGrnItems([{
        item_name: "",
        po_qty: 0,
        price: 0,
        mrp: 0,
        tax: 0,
        batch_no: "",
        expiry_date: ""
      }]);
      setEditMode({ isEditing: false, grnId: null });
      
      fetchGRNList();
    } catch (err) {
      showToast(editMode.isEditing ? "Failed to update GRN" : "Failed to create GRN", 'error');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* MODERN HEADER */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Goods Receipt Management</h1>
                <p className="text-sm text-slate-600">Manage incoming inventory, quality control & stock updates</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-700">📦 Active GRNs: {grnList.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT PANEL - GRN FORM */}
          <div className="col-span-5">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {editMode.isEditing ? 'Edit Goods Receipt Note' : 'Create New GRN'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">Fill in the details to process goods receipt</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">GRN Date *</label>
                    <input
                      type="date"
                      value={form.grn_date}
                      onChange={(e) => setForm({ ...form, grn_date: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Location *</label>
                    <select
                      value={form.store}
                      onChange={(e) => setForm({ ...form, store: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select Location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.name}>
                          {location.name} ({location.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* PO Toggle */}
                <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="po_type"
                      checked={form.with_po}
                      onChange={() => setForm({ ...form, with_po: true, po_number: "", vendor_name: "" })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-slate-700">With PO</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="po_type"
                      checked={!form.with_po}
                      onChange={() => setForm({ ...form, with_po: false, po_number: "", vendor_name: "" })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-slate-700">Without PO</span>
                  </label>
                </div>

                {form.with_po && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Purchase Order *</label>
                    <select
                      value={form.po_number}
                      onChange={(e) => handlePOSelect(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select Purchase Order</option>
                      {poList.map((po) => (
                        <option key={po.id} value={po.po_number}>
                          {po.po_number} - {po.vendor}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!form.with_po && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Vendor Name *</label>
                    <select
                      value={form.vendor_name}
                      onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.vendor_name}>
                          {vendor.vendor_name} ({vendor.vendor_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.with_po && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Vendor Name</label>
                    <input
                      value={form.vendor_name}
                      readOnly
                      className="w-full rounded-xl border-2 border-slate-100 px-4 py-3 bg-slate-50 text-slate-600"
                      placeholder="Auto-filled from selected PO"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Number</label>
                    <input
                      type="text"
                      value={form.invoice_number}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Date</label>
                    <input
                      type="date"
                      value={form.invoice_date}
                      onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>



                {/* Items Section */}
                <div className="border-t-2 border-slate-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Items to Receive
                    </h3>
                    <button
                      onClick={addItemRow}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {grnItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-semibold text-slate-600">Item #{idx + 1}</span>
                          {grnItems.length > 1 && (
                            <button
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove Item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Item Name *</label>
                            {form.with_po ? (
                              <input
                                placeholder="Enter item name (e.g., Laptop, Medicine, Raw Material)"
                                value={item.item_name}
                                onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <select
                                value={item.item_name}
                                onChange={(e) => {
                                  const selectedItemName = e.target.value;
                                  const selectedItem = itemList.find(i => i.name === selectedItemName);
                                  
                                  const updatedItems = grnItems.map((grnItem, grnIdx) => {
                                    if (grnIdx === idx) {
                                      return {
                                        ...grnItem,
                                        item_name: selectedItemName,
                                        price: selectedItem?.fixing_price || grnItem.price,
                                        mrp: selectedItem?.mrp || grnItem.mrp,
                                        tax: selectedItem?.tax || grnItem.tax
                                      };
                                    }
                                    return grnItem;
                                  });
                                  setGrnItems(updatedItems);
                                }}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select item</option>
                                {itemList.map((masterItem) => (
                                  <option key={masterItem.id} value={masterItem.name}>
                                    {masterItem.name} ({masterItem.item_code})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
                              <input
                                type="number"
                                placeholder="Quantity"
                                value={item.po_qty}
                                onChange={(e) => updateItem(idx, 'po_qty', parseFloat(e.target.value) || 0)}
                                className={`w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  ((item.container || 0) * (item.package || 0) * (item.piece || 0)) > 0 ? 'bg-yellow-100 font-bold' : ''
                                }`}
                                readOnly={((item.container || 0) * (item.package || 0) * (item.piece || 0)) > 0}
                                title={((item.container || 0) * (item.package || 0) * (item.piece || 0)) > 0 ? 'Auto-calculated from Container × Package × Piece' : 'Enter quantity manually'}
                              />
                            </div>
                            <div>
                              <div 
                                className="text-xs font-medium text-slate-600 mb-1 cursor-pointer hover:text-blue-600 flex items-center"
                                onClick={() => updateItem(idx, 'showPieceCalc', !item.showPieceCalc)}
                              >
                                <span>Piece Calculation</span>
                                <svg 
                                  className={`w-3 h-3 ml-1 transition-transform ${item.showPieceCalc ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              <div className="h-8"></div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price *</label>
                              <input
                                type="number"
                                placeholder="Unit Price"
                                value={item.price}
                                onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">MRP</label>
                              <input
                                type="number"
                                placeholder="MRP"
                                value={item.mrp}
                                onChange={(e) => updateItem(idx, 'mrp', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          {item.showPieceCalc && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-2 p-2 border border-slate-300 rounded-lg bg-blue-50">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Container</label>
                                  <input
                                    type="number"
                                    placeholder="Container"
                                    value={item.container}
                                    onChange={(e) => updateItem(idx, 'container', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Package</label>
                                  <input
                                    type="number"
                                    placeholder="Package"
                                    value={item.package}
                                    onChange={(e) => updateItem(idx, 'package', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Total Package</label>
                                  <div className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm bg-blue-100 font-bold text-center">
                                    {(item.container || 0) * (item.package || 0)}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Piece</label>
                                  <input
                                    type="number"
                                    placeholder="Piece"
                                    value={item.piece}
                                    onChange={(e) => updateItem(idx, 'piece', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Total</label>
                                  <div className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm bg-yellow-100 font-bold text-center">
                                    {(item.container || 0) * (item.package || 0) * (item.piece || 0)}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-2 p-2 border border-slate-300 rounded-lg bg-green-50">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Package Cost</label>
                                  <input
                                    type="number"
                                    placeholder="Package Cost"
                                    value={item.package_cost}
                                    onChange={(e) => updateItem(idx, 'package_cost', parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Package MRP</label>
                                  <input
                                    type="number"
                                    placeholder="Package MRP"
                                    value={item.package_mrp}
                                    onChange={(e) => updateItem(idx, 'package_mrp', parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">MRP Total</label>
                                  <div className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm bg-purple-100 font-bold text-center">
                                    {((item.container || 0) * (item.package || 0) * (item.package_mrp || 0)).toFixed(2)}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Cost Per Piece</label>
                                  <div className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm bg-orange-100 font-bold text-center">
                                    {(() => {
                                      const totalPieces = (item.container || 0) * (item.package || 0) * (item.piece || 0);
                                      const totalPackage = (item.container || 0) * (item.package || 0);
                                      const subtotal = totalPackage > 0 && item.package_cost > 0 ? (totalPackage * item.package_cost) : 0;
                                      return totalPieces > 0 && subtotal > 0 ? (subtotal / totalPieces).toFixed(2) : '0.00';
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">MRP Per Piece</label>
                                  <div className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm bg-purple-100 font-bold text-center">
                                    {(() => {
                                      const totalPieces = (item.container || 0) * (item.package || 0) * (item.piece || 0);
                                      const totalPackage = (item.container || 0) * (item.package || 0);
                                      const mrpTotal = totalPackage > 0 && item.package_mrp > 0 ? (totalPackage * item.package_mrp) : 0;
                                      return totalPieces > 0 && mrpTotal > 0 ? (mrpTotal / totalPieces).toFixed(2) : '0.00';
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-center mt-2">
                                <button
                                  onClick={() => savePriceToItemMaster(idx)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Save Price
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
                              <input
                                type="number"
                                placeholder="Tax %"
                                value={item.tax}
                                onChange={(e) => updateItem(idx, 'tax', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Batch/Lot Number *</label>
                              <input
                                placeholder={`Batch/Lot number (e.g., BT${Date.now().toString().slice(-6)}, LOT${new Date().getFullYear()})`}
                                value={item.batch_no}
                                onChange={(e) => updateItem(idx, 'batch_no', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Date Type</label>
                              <select
                                value={item.date_type || 'expiry'}
                                onChange={(e) => updateItem(idx, 'date_type', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="expiry">Expiry Date</option>
                                <option value="warranty">Warranty Date</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  {item.date_type === 'warranty' ? 'Manufacturing Date' : 'Manufacturing Date'}
                                </label>
                                <input
                                  type="date"
                                  value={item.start_date || ''}
                                  onChange={(e) => updateItem(idx, 'start_date', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  {item.date_type === 'warranty' ? 'Warranty (MM/YYYY)' : 'Expiry Date'}
                                </label>
                                {item.date_type === 'warranty' ? (
                                  <input
                                    type="month"
                                    value={item.expiry_date}
                                    onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                ) : (
                                  <input
                                    type="date"
                                    value={item.expiry_date}
                                    onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Price Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">MRP Total:</span>
                      <span className="font-medium text-purple-600">₹{calculateMRPTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax Amount:</span>
                      <span className="font-medium">₹{calculateTaxAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Items:</span>
                      <span className="font-medium">{grnItems.reduce((sum, item) => sum + (item.po_qty || 0), 0)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2 border-blue-200">
                      <span className="text-slate-800">Grand Total:</span>
                      <span className="text-blue-600">₹{(calculateSubtotal() + calculateTaxAmount()).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editMode.isEditing ? 'Update GRN' : 'Create GRN'}
                  </button>
                  
                  {editMode.isEditing && (
                    <button
                      onClick={() => {
                        setEditMode({ isEditing: false, grnId: null });
                        setForm({
                          grn_date: new Date().toISOString().split('T')[0],
                          po_number: "",
                          vendor_name: "",
                          store: "",
                          invoice_number: "",
                          invoice_date: ""
                        });
                        setGrnItems([{
                          item_name: "",
                          po_qty: 0,
                          price: 0,
                          mrp: 0,
                          tax: 0,
                          batch_no: "",
                          expiry_date: ""
                        }]);
                      }}
                      className="w-full bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - GRN LIST */}
          <div className="col-span-7">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Goods Receipt Records
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">Manage and track all GRN transactions</p>
                  </div>
                  <button
                    onClick={fetchGRNList}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading GRN records...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">GRN Details</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Vendor & PO</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Invoice Details</th>
                        <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Amount</th>
                        <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                        <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grnList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16">
                            <div className="text-slate-400">
                              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                              <p className="text-lg font-medium text-slate-500">No GRN records found</p>
                              <p className="text-sm text-slate-400 mt-1">Create your first goods receipt note to get started</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        grnList.map((grn) => (
                          <tr key={grn.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-semibold text-slate-900">{grn.grn_number}</div>
                                <div className="text-sm text-slate-500">{new Date(grn.grn_date).toLocaleDateString()}</div>
                                <div className="text-xs text-slate-400 mt-1">{grn.store}</div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-medium text-slate-800">{grn.vendor_name}</div>
                                <div className="text-sm text-slate-500">PO: {grn.po_number}</div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                {grn.invoice_number ? (
                                  <div className="font-medium text-slate-800">{grn.invoice_number}</div>
                                ) : (
                                  <div className="text-sm text-slate-400">No Invoice</div>
                                )}
                                {grn.invoice_date ? (
                                  <div className="text-sm text-slate-500">{new Date(grn.invoice_date).toLocaleDateString()}</div>
                                ) : (
                                  <div className="text-sm text-slate-400">No Date</div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="font-bold text-green-600 text-lg">₹{(grn.total_amount || 0).toFixed(2)}</div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="space-y-2">
                                <select
                                  value={grn.status || 'Pending'}
                                  onChange={(e) => updateGRNStatus(grn.id, e.target.value)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${
                                    grn.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                    grn.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </div>
                            </td>
                            <td className="py-4 px-6">
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
                                  title="Print GRN"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleEditGRN(grn)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Edit GRN"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteGRN(grn)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete GRN"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* GRN Details Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">GRN Details</h2>
              <button 
                onClick={() => setViewModal({ isOpen: false, grn: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {viewModal.grn && (
              <div className="space-y-4">
                {/* GRN Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                  <div><strong>GRN Number:</strong> {viewModal.grn.grn_number}</div>
                  <div><strong>Date:</strong> {new Date(viewModal.grn.grn_date).toLocaleDateString()}</div>
                  <div><strong>PO Number:</strong> {viewModal.grn.po_number}</div>
                  <div><strong>Vendor:</strong> {viewModal.grn.vendor_name}</div>
                  <div><strong>Store:</strong> {viewModal.grn.store}</div>
                  <div><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      viewModal.grn.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                      viewModal.grn.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {viewModal.grn.status}
                    </span>
                  </div>
                  <div><strong>Total Items:</strong> {viewModal.grn.items.length}</div>
                  <div><strong>Total Amount:</strong> ₹{viewModal.grn.total_amount.toFixed(2)}</div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="font-semibold mb-2">Items Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-3 py-2 text-left">S.No</th>
                          <th className="border px-3 py-2 text-left">Item Name</th>
                          <th className="border px-3 py-2 text-center">PO Qty</th>
                          <th className="border px-3 py-2 text-center">Received Qty</th>
                          <th className="border px-3 py-2 text-center">UOM</th>
                          <th className="border px-3 py-2 text-right">Rate</th>
                          <th className="border px-3 py-2 text-right">Amount</th>
                          <th className="border px-3 py-2 text-center">Cost/Piece</th>
                          <th className="border px-3 py-2 text-center">MRP/Piece</th>
                          <th className="border px-3 py-2 text-left">Batch Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewModal.grn.items.map((item, idx) => {
                          const itemAmount = (item.received_qty || 0) * (item.rate || 0);
                          return (
                            <tr key={idx}>
                              <td className="border px-3 py-2 text-center">{idx + 1}</td>
                              <td className="border px-3 py-2">{item.item_name}</td>
                              <td className="border px-3 py-2 text-center">{item.po_qty}</td>
                              <td className="border px-3 py-2 text-center">{item.received_qty}</td>
                              <td className="border px-3 py-2 text-center">{item.uom}</td>
                              <td className="border px-3 py-2 text-right">₹{item.rate}</td>
                              <td className="border px-3 py-2 text-right">₹{itemAmount.toFixed(2)}</td>
                              <td className="border px-3 py-2 text-center bg-orange-50">
                                <span className="font-semibold text-orange-700">
                                  ₹{item.cost_per_piece ? item.cost_per_piece.toFixed(2) : '0.00'}
                                </span>
                              </td>
                              <td className="border px-3 py-2 text-center bg-purple-50">
                                <span className="font-semibold text-purple-700">
                                  ₹{item.mrp_per_piece ? item.mrp_per_piece.toFixed(2) : '0.00'}
                                </span>
                              </td>
                              <td className="border px-3 py-2">
                                {item.batches.map((batch, bIdx) => (
                                  <div key={bIdx} className="text-sm mb-1">
                                    <div><strong>Batch:</strong> {batch.batch_no}</div>
                                    <div><strong>Qty:</strong> {batch.qty}</div>
                                    {batch.mfg_date && <div><strong>Mfg:</strong> {new Date(batch.mfg_date).toLocaleDateString()}</div>}
                                    {batch.expiry_date && <div><strong>Exp:</strong> {new Date(batch.expiry_date).toLocaleDateString()}</div>}
                                    {bIdx < item.batches.length - 1 && <hr className="my-1" />}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <div className="text-sm space-y-1">
                        <div>Total Items: {viewModal.grn.items.length}</div>
                        <div>Total Quantity: {viewModal.grn.items.reduce((sum, item) => sum + (item.received_qty || 0), 0)}</div>
                        <div>Created: {new Date(viewModal.grn.grn_date).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <h4 className="font-semibold mb-2">Amount Details</h4>
                      <div className="text-sm space-y-1">
                        <div>Subtotal: ₹{viewModal.grn.items.reduce((sum, item) => sum + ((item.received_qty || 0) * (item.rate || 0)), 0).toFixed(2)}</div>
                        <div className="text-lg font-bold text-green-600">Total: ₹{viewModal.grn.total_amount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* GRN Print Modal */}
      {printModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-xl font-semibold">Print GRN</h2>
              <button 
                onClick={() => setPrintModal({ isOpen: false, grn: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {printModal.grn && (
              <div className="print-content">
                {/* Company Header */}
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">INVENTORY MANAGEMENT SYSTEM</h1>
                  <h2 className="text-xl font-semibold text-gray-600">GOODS RECEIPT NOTE</h2>
                </div>
                
                {/* GRN Info Header */}
                <div className="flex justify-between items-center mb-6 bg-gray-100 p-4 rounded">
                  <div>
                    <h3 className="text-2xl font-bold text-blue-600">GRN: {printModal.grn.grn_number}</h3>
                    <p className="text-gray-600">Date: {new Date(printModal.grn.grn_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      printModal.grn.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      printModal.grn.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      Status: {printModal.grn.status}
                    </div>
                  </div>
                </div>

                {/* Vendor & PO Details */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-300 p-4 rounded">
                    <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Vendor Information</h4>
                    <p><strong>Name:</strong> {printModal.grn.vendor_name}</p>
                    <p><strong>PO Number:</strong> {printModal.grn.po_number}</p>
                    <p><strong>GRN Date:</strong> {new Date(printModal.grn.grn_date).toLocaleDateString()}</p>
                  </div>
                  <div className="border border-gray-300 p-4 rounded">
                    <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Delivery Information</h4>
                    <p><strong>Store:</strong> {printModal.grn.store}</p>
                    <p><strong>Total Items:</strong> {printModal.grn.items.length}</p>
                    <p><strong>Total Amount:</strong> <span className="text-green-600 font-bold">₹{printModal.grn.total_amount.toFixed(2)}</span></p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-lg">Items Received</h4>
                  <table className="w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-gray-400 px-3 py-2 text-left font-semibold">S.No</th>
                        <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Item Name</th>
                        <th className="border border-gray-400 px-3 py-2 text-center font-semibold">PO Qty</th>
                        <th className="border border-gray-400 px-3 py-2 text-center font-semibold">Received</th>
                        <th className="border border-gray-400 px-3 py-2 text-center font-semibold">UOM</th>
                        <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Rate</th>
                        <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="border border-gray-400 px-3 py-2 text-center font-semibold">Cost/Pc</th>
                        <th className="border border-gray-400 px-3 py-2 text-center font-semibold">MRP/Pc</th>
                        <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Batch Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printModal.grn.items.map((item, idx) => {
                        const itemAmount = (item.received_qty || 0) * (item.rate || 0);
                        return (
                          <tr key={idx}>
                            <td className="border border-gray-400 px-3 py-2 text-center">{idx + 1}</td>
                            <td className="border border-gray-400 px-3 py-2">{item.item_name}</td>
                            <td className="border border-gray-400 px-3 py-2 text-center">{item.po_qty}</td>
                            <td className="border border-gray-400 px-3 py-2 text-center">{item.received_qty}</td>
                            <td className="border border-gray-400 px-3 py-2 text-center">{item.uom}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">₹{item.rate}</td>
                            <td className="border border-gray-400 px-3 py-2 text-right">₹{itemAmount.toFixed(2)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-center">
                              ₹{item.cost_per_piece ? item.cost_per_piece.toFixed(2) : '0.00'}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-center">
                              ₹{item.mrp_per_piece ? item.mrp_per_piece.toFixed(2) : '0.00'}
                            </td>
                            <td className="border border-gray-400 px-3 py-2">
                              {item.batches.map((batch, bIdx) => (
                                <div key={bIdx} className="text-sm mb-1">
                                  <div><strong>Batch:</strong> {batch.batch_no}</div>
                                  <div><strong>Qty:</strong> {batch.qty}</div>
                                  {batch.mfg_date && <div><strong>Mfg:</strong> {new Date(batch.mfg_date).toLocaleDateString()}</div>}
                                  {batch.expiry_date && <div><strong>Exp:</strong> {new Date(batch.expiry_date).toLocaleDateString()}</div>}
                                  {bIdx < item.batches.length - 1 && <hr className="my-1" />}
                                </div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="border-t-2 border-gray-800 pt-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <p>Generated on: {new Date().toLocaleString()}</p>
                      <p>Total Items: {printModal.grn.items.length}</p>
                      <p>Total Quantity: {printModal.grn.items.reduce((sum, item) => sum + (item.received_qty || 0), 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg">Subtotal: ₹{printModal.grn.items.reduce((sum, item) => sum + ((item.received_qty || 0) * (item.rate || 0)), 0).toFixed(2)}</p>
                      <p className="text-2xl font-bold text-green-600">
                        Grand Total: ₹{printModal.grn.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t">
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2 mt-12">
                      <p className="font-semibold">Received By</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2 mt-12">
                      <p className="font-semibold">Checked By</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2 mt-12">
                      <p className="font-semibold">Authorized By</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Print Button at Bottom */}
            <div className="flex justify-center mt-6 no-print">
              <button 
                onClick={printGRN}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 text-lg font-medium"
              >
                Print
              </button>
            </div>
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
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {invoiceModal.grn && (
              <div className="space-y-6">
                {/* Invoice Header */}
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

                {/* Billing Information */}
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

                {/* Invoice Items Table */}
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
                        {invoiceModal.grn.items.map((item, idx) => {
                          const itemAmount = (item.received_qty || 0) * (item.rate || 0);
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-3 px-4 text-center text-sm">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900">{item.item_name}</p>
                                  <p className="text-xs text-gray-500">Batch: {item.batches[0]?.batch_no || 'N/A'}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center text-sm">{item.received_qty}</td>
                              <td className="py-3 px-4 text-right text-sm">₹{item.rate}</td>
                              <td className="py-3 px-4 text-right text-sm font-medium">₹{itemAmount.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{invoiceModal.grn.items.reduce((sum, item) => sum + ((item.received_qty || 0) * (item.rate || 0)), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Tax (0%):</span>
                    <span className="font-medium">₹0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">₹{invoiceModal.grn.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Invoice Footer */}
                <div className="text-center text-sm text-gray-500 border-t pt-4">
                  <p>Thank you for your business!</p>
                  <p className="mt-2">Generated on: {new Date().toLocaleString()}</p>
                </div>

                {/* Action Buttons */}
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
                    onClick={() => showToast('Invoice saved successfully!', 'success')}
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

      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
