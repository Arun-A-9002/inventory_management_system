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
      received_qty: 0,
      uom: "",
      rate: 0,
      batch_no: "",
      mfg_date: "",
      expiry_date: ""
    }
  ]);

  // Fetch PO list
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
  }, []);

  // Handle PO selection
  const handlePOSelect = (poNumber) => {
    const selectedPO = poList.find(po => po.po_number === poNumber);
    if (selectedPO) {
      setForm({
        ...form,
        po_number: poNumber,
        vendor_name: selectedPO.vendor || ''
      });
    }
  };

  // Add new item row
  const addItemRow = () => {
    setGrnItems([...grnItems, {
      item_name: "",
      po_qty: 0,
      received_qty: 0,
      uom: "",
      rate: 0,
      batch_no: "",
      mfg_date: "",
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

  const handleSubmit = async () => {
    if (!form.po_number || !form.vendor_name || !form.store) {
      showToast("Please fill all required fields", 'error');
      return;
    }

    try {
      const grnData = {
        ...form,
        items: grnItems.map(item => ({
          ...item,
          batches: [{
            batch_no: item.batch_no,
            mfg_date: item.mfg_date || null,
            expiry_date: item.expiry_date || null,
            qty: item.received_qty
          }]
        }))
      };

      const res = await api.post("/grn/create", grnData);
      showToast(`GRN Created: ${res.data.grn_number}`, 'success');
      
      // Reset form
      setForm({
        grn_date: new Date().toISOString().split('T')[0],
        po_number: "",
        vendor_name: "",
        store: "",
      });
      setGrnItems([{
        item_name: "",
        po_qty: 0,
        received_qty: 0,
        uom: "",
        rate: 0,
        batch_no: "",
        mfg_date: "",
        expiry_date: ""
      }]);
      
      fetchGRNList();
    } catch (err) {
      showToast("Failed to create GRN", 'error');
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
          <h2 className="text-xl font-semibold mb-4">Create Goods Receipt Note</h2>
          
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
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        placeholder="Item Name *"
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        placeholder="UOM"
                        value={item.uom}
                        onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="PO Qty"
                        value={item.po_qty}
                        onChange={(e) => updateItem(idx, 'po_qty', parseFloat(e.target.value) || 0)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        placeholder="Received *"
                        value={item.received_qty}
                        onChange={(e) => updateItem(idx, 'received_qty', parseFloat(e.target.value) || 0)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        placeholder="Batch No"
                        value={item.batch_no}
                        onChange={(e) => updateItem(idx, 'batch_no', e.target.value)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="date"
                        placeholder="Mfg Date"
                        value={item.mfg_date}
                        onChange={(e) => updateItem(idx, 'mfg_date', e.target.value)}
                        className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500"
                      />
                      <div className="flex gap-1">
                        <input
                          type="date"
                          placeholder="Expiry Date"
                          value={item.expiry_date}
                          onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                          className="text-sm rounded border px-2 py-1 focus:ring-1 focus:ring-purple-500 flex-1"
                        />
                        {grnItems.length > 1 && (
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:text-red-800 px-1"
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

            <button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-purple-600 text-white px-6 py-2 hover:bg-purple-700 transition-colors font-medium"
            >
              Create GRN
            </button>
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
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grnList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-500">
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
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            grn.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                            grn.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {grn.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              View
                            </button>
                            <button className="text-green-600 hover:text-green-800 text-sm">
                              QC
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
    </div>
  );
}
