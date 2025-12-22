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
  const [editMode, setEditMode] = useState({ isEditing: false, grnId: null });

  const [form, setForm] = useState({
    grn_date: new Date().toISOString().split('T')[0],
    po_number: "",
    vendor_name: "",
    store: "",
  });

  const [grnItems, setGrnItems] = useState([
    {
      item_name: "",
      po_qty: 0,
      price: 0,
      mrp: 0,
      tax: 0,
      batch_no: "",
      expiry_date: ""
    }
  ]);

  const [itemList, setItemList] = useState([]);

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

  // Fetch GRN list
  const fetchGRNList = async () => {
    try {
      setLoading(true);
      const res = await api.get("/grn/list");
      setGrnList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch GRN list:", err);
      setGrnList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOList();
    fetchGRNList();
    fetchItemList();
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
      expiry_date: ""
    }]);
  };

  // Update item
  const updateItem = (index, field, value) => {
    const updatedItems = grnItems.map((item, idx) => 
      idx === index ? { ...item, [field]: value } : item
    );
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
      const tax = subtotal * (item.tax || 0) / 100;
      return sum + subtotal + tax;
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
        store: grnData.store
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
    if (!form.po_number || !form.vendor_name || !form.store) {
      showToast("Please fill all required fields", 'error');
      return;
    }

    if (grnItems.every(item => !item.item_name || item.po_qty === 0 || !item.batch_no)) {
      showToast("Please add at least one item with quantity and batch number", 'error');
      return;
    }

    try {
      const totalAmount = calculateTotalAmount();
      
      const grnData = {
        ...form,
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
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">Goods Receipt & Inspection</div>
              <h1 className="text-3xl font-semibold mt-2">GRN Management</h1>
              <p className="mt-2 opacity-90">Create GRN, manage batches, QC & stock updates</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">📦 Goods Receipt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* LEFT SIDE - GRN FORM */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">
            {editMode.isEditing ? 'Edit Goods Receipt Note' : 'Create Goods Receipt Note'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GRN Date *</label>
              <input
                type="date"
                value={form.grn_date}
                onChange={(e) => setForm({ ...form, grn_date: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number *</label>
              <select
                value={form.po_number}
                onChange={(e) => handlePOSelect(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Purchase Order</option>
                {poList.map((po) => (
                  <option key={po.id} value={po.po_number}>
                    {po.po_number} - {po.vendor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
              <input
                value={form.vendor_name}
                readOnly
                className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
                placeholder="Auto-filled from PO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store / Warehouse *</label>
              <select
                value={form.store}
                onChange={(e) => setForm({ ...form, store: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Store</option>
                <option value="Main Store">Main Store</option>
                <option value="Warehouse A">Warehouse A</option>
                <option value="Warehouse B">Warehouse B</option>
                <option value="Pharmacy Store">Pharmacy Store</option>
              </select>
            </div>

            {/* ITEM ENTRY SECTION */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-700">Items to Receive</h3>
                <button
                  onClick={addItemRow}
                  className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {grnItems.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                    {/* Item Name Row */}
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Item Name *</label>
                      <input
                        placeholder="Enter item name"
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                      />
                    </div>
                    
                    {/* Quantity, Price, MRP & Tax Row */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={item.po_qty}
                          onChange={(e) => updateItem(idx, 'po_qty', parseFloat(e.target.value) || 0)}
                          className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Price *</label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.price}
                          onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">MRP *</label>
                        <input
                          type="number"
                          placeholder="MRP"
                          value={item.mrp}
                          onChange={(e) => updateItem(idx, 'mrp', parseFloat(e.target.value) || 0)}
                          className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
                        <input
                          type="number"
                          placeholder="Tax %"
                          value={item.tax}
                          onChange={(e) => updateItem(idx, 'tax', parseFloat(e.target.value) || 0)}
                          className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                        />
                      </div>
                    </div>
                    
                    {/* Batch & Expiry Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Batch Number *</label>
                        <input
                          placeholder="Batch/Lot number"
                          value={item.batch_no}
                          onChange={(e) => updateItem(idx, 'batch_no', e.target.value)}
                          className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                        />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                            className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 w-full"
                          />
                        </div>
                        {grnItems.length > 1 && (
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:text-red-800 px-2 mt-5"
                            title="Remove Item"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRICE CALCULATION SECTION */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-slate-700 mb-3">Price Summary</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{grnItems.reduce((sum, item) => sum + ((item.po_qty || 0) * (item.price || 0)), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax Amount:</span>
                  <span>₹{grnItems.reduce((sum, item) => sum + ((item.po_qty || 0) * (item.price || 0) * (item.tax || 0) / 100), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Items:</span>
                  <span>{grnItems.reduce((sum, item) => sum + (item.po_qty || 0), 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Total Amount:</span>
                  <span>₹{calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-purple-600 text-white px-6 py-2 hover:bg-purple-700 transition-colors font-medium"
            >
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
                className="w-full rounded-lg bg-gray-500 text-white px-6 py-2 hover:bg-gray-600 transition-colors font-medium mt-2"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - GRN LIST */}
        <div className="col-span-3 bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Goods Receipt List</h2>
            <button
              onClick={fetchGRNList}
              className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-slate-500">Loading...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">GRN Number</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">PO Number</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Total Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">QC Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">View/Print</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grnList.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        No goods receipts found
                      </td>
                    </tr>
                  ) : (
                    grnList.map((grn) => (
                      <tr key={grn.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{grn.grn_number}</td>
                        <td className="py-3 px-4">{grn.po_number}</td>
                        <td className="py-3 px-4">{grn.vendor_name}</td>
                        <td className="py-3 px-4">{new Date(grn.grn_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-medium text-green-600">₹{(grn.total_amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <select
                            className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 border-0"
                            defaultValue="Pending"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Conditional">Conditional</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={grn.status || 'Pending'}
                            onChange={(e) => updateGRNStatus(grn.id, e.target.value)}
                            className={`px-2 py-1 rounded text-xs border-0 ${
                              grn.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                              grn.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-3">
                            <button 
                              onClick={() => handleViewGRN(grn)}
                              className="text-blue-600 hover:text-blue-800" 
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handlePrintGRN(grn)}
                              className="text-gray-600 hover:text-gray-800" 
                              title="Print"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditGRN(grn)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteGRN(grn)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
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

      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
