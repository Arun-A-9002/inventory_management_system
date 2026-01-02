import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState("PR");
  const { toast, showToast, hideToast } = useToast();

  const tabs = [
    { id: "PR", name: "Purchase Request", icon: "📝", desc: "Create and manage purchase requests" },
    { id: "PO", name: "Purchase Order", icon: "📋", desc: "View purchase orders" },
    { id: "Tracking", name: "PO Tracking", icon: "📦", desc: "Track order status" }
  ];

  /* ---------------- PR ---------------- */
  const [requestedBy, setRequestedBy] = useState("");
  const [prItem, setPrItem] = useState({
    item_id: "",
    item_name: "",
    category: "",
    sub_category: "",
    brand: "",
    manufacturer: "",
    fixing_price: "",
    quantity: "",
    uom: "",
    priority: "",
    remarks: ""
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemList, setItemList] = useState([]);
  const [prList, setPrList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPR, setEditingPR] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [emailForm, setEmailForm] = useState({
    vendor_email: '',
    location: '',
    subject: '',
    message: ''
  });
  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);

  // Fetch PR list
  const fetchPRList = async () => {
    try {
      setLoading(true);
      const res = await api.get("/purchase/pr");
      setPrList(res.data);
    } catch (err) {
      console.error("Failed to fetch PR list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch item list
  const fetchItemList = async () => {
    try {
      const res = await api.get("/items/");
      if (res.data && res.data.length > 0) {
        const activeItems = res.data.filter(item => item.is_active !== false);
        setItemList(activeItems);
      } else {
        setItemList([]);
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItemList([]);
    }
  };
  
  // Handle item selection and auto-fill
  const handleItemSelect = (itemId) => {
    const selectedItem = itemList.find(item => item.id === parseInt(itemId));
    if (selectedItem) {
      setPrItem({
        ...prItem,
        item_id: itemId,
        item_name: selectedItem.name,
        category: selectedItem.category || "",
        sub_category: selectedItem.sub_category || "",
        brand: selectedItem.brand || "",
        manufacturer: selectedItem.manufacturer || "",
        fixing_price: selectedItem.fixing_price || "",
        uom: selectedItem.uom || ""
      });
    }
  };

  useEffect(() => {
    if (activeTab === "PR") {
      fetchPRList();
      fetchItemList();
      fetchVendors();
      fetchLocations();
    } else if (activeTab === "PO") {
      fetchPOList();
    }
  }, [activeTab]);

  // Fetch vendors for email
  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors/');
      setVendors(res.data || []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  // Fetch locations for email
  const fetchLocations = async () => {
    try {
      const res = await api.get('/inventory/locations/');
      setLocations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  // Add item to selected list
  const addItemToList = () => {
    if (!prItem.item_name || !prItem.quantity || !prItem.uom) {
      showToast("Please select item and enter quantity", 'error');
      return;
    }
    
    setSelectedItems([...selectedItems, { ...prItem, id: Date.now() }]);
    setPrItem({
      item_id: "",
      item_name: "",
      category: "",
      sub_category: "",
      brand: "",
      manufacturer: "",
      fixing_price: "",
      quantity: "",
      uom: "",
      priority: "",
      remarks: ""
    });
  };

  // Remove item from selected list
  const removeItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  // Edit PR
  const editPR = async (pr) => {
    try {
      const res = await api.get(`/purchase/${pr.id}`);
      const prDetails = res.data;
      
      setEditingPR(pr);
      setRequestedBy(prDetails.requested_by);
      
      if (prDetails.items && prDetails.items.length > 0) {
        const formattedItems = prDetails.items.map(item => ({
          id: Date.now() + Math.random(),
          item_name: item.item_name,
          quantity: item.quantity.toString(),
          uom: item.uom,
          priority: item.priority,
          remarks: item.remarks || ''
        }));
        setSelectedItems(formattedItems);
      } else {
        setSelectedItems([]);
      }
      
      showToast(`Editing PR: ${pr.pr_number}`, 'info');
    } catch (err) {
      console.error('Failed to fetch PR details:', err);
      setEditingPR(pr);
      setRequestedBy(pr.requested_by);
      setSelectedItems([]);
      showToast(`Edit PR: ${pr.pr_number} (Items not loaded)`, 'error');
    }
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setEditingPR(null);
    setRequestedBy("");
    setSelectedItems([]);
    setPrItem({
      item_name: "",
      quantity: "",
      uom: "",
      priority: "",
      remarks: ""
    });
  };

  // Delete PR
  const deletePR = async (prId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this Purchase Request?');
    if (!confirmDelete) return;
    
    try {
      await api.delete(`/purchase/${prId}`);
      showToast('Purchase Request deleted successfully', 'success');
      fetchPRList();
    } catch (err) {
      showToast('Failed to delete Purchase Request', 'error');
      console.error(err);
    }
  };

  // Open email modal
  const openEmailModal = async (pr) => {
    try {
      const res = await api.get(`/purchase/${pr.id}`);
      const prDetails = res.data;
      
      const itemsList = prDetails.items?.map(item => 
        `- ${item.item_name} (Qty: ${item.quantity} ${item.uom}) - Priority: ${item.priority}`
      ).join('\n') || 'No items found';
      
      setSelectedPR(pr);
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;
      setEmailForm({
        vendor_email: '',
        location: locations.length > 0 ? locations[0].name : '',
        po_number: poNumber,
        subject: `Purchase Order ${poNumber} for PR ${pr.pr_number}`,
        message: `Dear Vendor,\n\nPlease find Purchase Order ${poNumber} for Purchase Request ${pr.pr_number}:\n\n${itemsList}\n\nLocation: ${locations.length > 0 ? locations[0].name : 'TBD'}\n\nPlease confirm receipt and delivery schedule.\n\nThank you.`
      });
      setShowEmailModal(true);
    } catch (err) {
      showToast('Failed to load PR details', 'error');
    }
  };

  // Send email to vendor and create PO
  const sendEmailToVendor = async () => {
    if (!emailForm.vendor_email || !emailForm.location) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const poRes = await api.post('/purchase/po', {
        pr_number: selectedPR.pr_number,
        vendor: emailForm.vendor_email.split(' - ')[0] || 'Selected Vendor',
        items: [{
          item_name: 'Items from PR',
          quantity: 1,
          rate: 0,
          tax: 0,
          discount: 0
        }]
      });
      
      await api.post('/purchase/send-email', {
        pr_id: selectedPR.id,
        pr_number: selectedPR.pr_number,
        po_number: poRes.data.po_number,
        vendor_email: emailForm.vendor_email,
        location: emailForm.location,
        subject: emailForm.subject,
        message: emailForm.message
      });
      
      showToast(`PO ${poRes.data.po_number} created and email sent!`, 'success');
      setShowEmailModal(false);
      fetchPOList();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send email';
      showToast(errorMsg, 'error');
    }
  };

  const createPR = async () => {
    if (!requestedBy || selectedItems.length === 0) {
      showToast("Please enter requester name and add at least one item", 'error');
      return;
    }
    
    try {
      if (editingPR) {
        await api.put(`/purchase/${editingPR.id}`, {
          requested_by: requestedBy,
          items: selectedItems.map(item => ({
            item_name: item.item_name,
            quantity: parseFloat(item.quantity),
            uom: item.uom,
            priority: item.priority,
            remarks: item.remarks
          }))
        });
        showToast(`PR Updated: ${editingPR.pr_number}`, 'success');
      } else {
        const res = await api.post("/purchase/pr", {
          requested_by: requestedBy,
          items: selectedItems.map(item => ({
            item_name: item.item_name,
            quantity: parseFloat(item.quantity),
            uom: item.uom,
            priority: item.priority,
            remarks: item.remarks
          }))
        });
        showToast(`PR Created: ${res.data.pr_number}`, 'success');
      }
      
      setRequestedBy("");
      setSelectedItems([]);
      setEditingPR(null);
      setPrItem({
        item_name: "",
        quantity: "",
        uom: "",
        priority: "",
        remarks: ""
      });
      fetchPRList();
    } catch (err) {
      showToast(editingPR ? "Failed to update PR" : "Failed to create PR", 'error');
      console.error(err);
    }
  };

  /* ---------------- PO ---------------- */
  const [poList, setPoList] = useState([]);

  const fetchPOList = async () => {
    try {
      const res = await api.get("/purchase/po");
      setPoList(res.data);
    } catch (err) {
      console.error("Failed to fetch PO list:", err);
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
                <span className="text-2xl">🛒</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Purchase Management</h1>
                <p className="text-sm text-slate-600">Manage purchase requests, orders, quotations & tracking</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-700">📦 Active PRs: {prList.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* TABS */}
        <div className="bg-white rounded-2xl shadow-lg border p-2 mb-6">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-center">
                  <div>{tab.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "PR" && (
          <div className="grid grid-cols-12 gap-8">
            {/* LEFT PANEL - CREATE PR FORM */}
            <div className="col-span-5">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Form Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <span className="text-lg mr-2">➕</span>
                    {editingPR ? 'Edit Purchase Request' : 'Create New Purchase Request'}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">Fill in the details to create purchase request</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Requested By</label>
                    <input
                      type="text"
                      value={requestedBy}
                      onChange={(e) => setRequestedBy(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter requester name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Item Name
                      <span className="text-slate-500 font-normal ml-2">({itemList.length} items available)</span>
                    </label>
                    <select
                      value={prItem.item_id || ""}
                      onChange={(e) => {
                        const itemId = e.target.value;
                        if (itemId) {
                          handleItemSelect(itemId);
                        } else {
                          setPrItem({ ...prItem, item_id: "", item_name: "", uom: "" });
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select item from master</option>
                      {itemList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.item_code ? `(${item.item_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {prItem.item_id && (
                    <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                      <h3 className="font-semibold text-slate-700 mb-4">Item Details (Auto-filled)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Category</label>
                          <input
                            type="text"
                            value={prItem.category}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Sub Category</label>
                          <input
                            type="text"
                            value={prItem.sub_category}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Brand</label>
                          <input
                            type="text"
                            value={prItem.brand}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Manufacturer</label>
                          <input
                            type="text"
                            value={prItem.manufacturer}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Fixing Price</label>
                          <input
                            type="text"
                            value={prItem.fixing_price}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">UOM</label>
                          <input
                            type="text"
                            value={prItem.uom}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={prItem.quantity}
                        onChange={(e) => setPrItem({ ...prItem, quantity: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Enter quantity"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Priority</label>
                      <select
                        value={prItem.priority}
                        onChange={(e) => setPrItem({ ...prItem, priority: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="">Select priority (optional)</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Remarks</label>
                    <textarea
                      value={prItem.remarks}
                      onChange={(e) => setPrItem({ ...prItem, remarks: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      rows="4"
                      placeholder="Additional remarks or special instructions"
                    />
                  </div>

                  <button 
                    onClick={addItemToList}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">➕</span>
                    Add Item
                  </button>
                </div>

                {selectedItems.length > 0 && (
                  <div className="border-t-2 border-slate-100 p-6">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-lg">🛒</span>
                      Selected Items ({selectedItems.length})
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800">{item.item_name}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              Qty: <span className="font-medium">{item.quantity} {item.uom}</span> | 
                              Priority: <span className={`font-medium ${
                                item.priority === 'Urgent' ? 'text-red-600' :
                                item.priority === 'High' ? 'text-orange-600' :
                                item.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                              }`}>{item.priority || 'Normal'}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <span className="text-sm">🗑️</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItems.length > 0 && (
                  <div className="p-6 space-y-4 border-t border-slate-100">
                    {editingPR && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800 font-semibold">Editing: {editingPR.pr_number}</span>
                          <button 
                            onClick={cancelEdit}
                            className="text-amber-600 hover:text-amber-800 font-medium underline"
                          >
                            Cancel Edit
                          </button>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={createPR}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <span className="text-lg">📝</span>
                      {editingPR ? `Update Purchase Request (${selectedItems.length} items)` : `Create Purchase Request (${selectedItems.length} items)`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL - PR LIST */}
            <div className="col-span-7">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Table Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                        <span className="text-lg mr-2">📋</span>
                        Purchase Request Records
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">Manage and track all purchase requests</p>
                    </div>
                    <button 
                      onClick={fetchPRList}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <span className="text-sm mr-2">🔄</span>
                      Refresh
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-slate-500">Loading purchase requests...</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">PR Details</th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Requested By</th>
                          <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Date</th>
                          <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                          <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prList.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-16">
                              <div className="text-slate-400">
                                <span className="text-4xl opacity-50">📝</span>
                                <p className="text-lg font-medium text-slate-500 mt-4">No purchase requests found</p>
                                <p className="text-sm text-slate-400 mt-1">Create your first purchase request to get started</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          prList.map((pr, index) => (
                            <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-6">
                                <div>
                                  <div className="font-bold text-blue-600">{pr.pr_number}</div>
                                  <div className="text-sm text-slate-500">#{index + 1}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-medium text-slate-800">{pr.requested_by}</div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="text-slate-600">{new Date(pr.request_date).toLocaleDateString()}</div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                  pr.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                  pr.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                  pr.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                  pr.status === 'Closed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {pr.status || 'Draft'}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center space-x-2">
                                  <button 
                                    onClick={() => editPR(pr)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                    title="Edit PR"
                                  >
                                    <span className="text-xs">✏️</span>
                                  </button>
                                  <button 
                                    onClick={() => deletePR(pr.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete PR"
                                  >
                                    <span className="text-xs">🗑️</span>
                                  </button>
                                  <button 
                                    onClick={() => openEmailModal(pr)}
                                    disabled={pr.status !== 'Approved'}
                                    className={`p-2 rounded-lg transition-colors ${
                                      pr.status === 'Approved' 
                                        ? 'text-green-600 hover:bg-green-50' 
                                        : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                    title="Send Purchase Order"
                                  >
                                    <span className="text-xs">📧</span>
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
          </div>
        )}

        {activeTab === "PO" && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                    <span className="text-lg mr-2">🛒</span>
                    Purchase Order Records
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">Manage and track all purchase orders</p>
                </div>
                <button 
                  onClick={fetchPOList}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <span className="text-sm mr-2">🔄</span>
                  Refresh
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">PO Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Vendor</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">PR Number</th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Date</th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16">
                        <div className="text-slate-400">
                          <span className="text-4xl opacity-50">🛒</span>
                          <p className="text-lg font-medium text-slate-500 mt-4">No purchase orders found</p>
                          <p className="text-sm text-slate-400 mt-1">Purchase orders will appear here once created</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    poList.map((po, index) => (
                      <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-green-600">{po.po_number}</div>
                            <div className="text-sm text-slate-500">#{index + 1}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{po.vendor}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-blue-600">{po.pr_number}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="text-slate-600">{new Date(po.po_date).toLocaleDateString()}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            Purchase Order Sent
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Tracking" && (
          <div className="grid grid-cols-12 gap-8">
            {/* LEFT PANEL - TRACKING FORM */}
            <div className="col-span-5">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Form Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Create PO Tracking
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">Fill in the details to track purchase order</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">PO Number *</label>
                    <select
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Dispatch Date</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Expected Delivery</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Transporter</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Transporter name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tracking Number</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Auto-generated"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <select
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select status</option>
                      <option value="Pending">Pending</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Delayed">Delayed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Remarks</label>
                    <textarea
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      rows={3}
                      placeholder="Tracking remarks"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Tracking
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL - TRACKING LIST */}
            <div className="col-span-7">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Table Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        PO Tracking Records
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">Manage and track all PO deliveries</p>
                    </div>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">PO Details</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Vendor & Transporter</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Tracking Details</th>
                        <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                        <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poList.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-16">
                            <div className="text-slate-400">
                              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="text-lg font-medium text-slate-500">No tracking records found</p>
                              <p className="text-sm text-slate-400 mt-1">Create tracking for purchase orders to monitor deliveries</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        poList.map((po, index) => (
                          <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-semibold text-slate-900">{po.po_number}</div>
                                <div className="text-sm text-slate-500">{new Date(po.po_date).toLocaleDateString()}</div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-medium text-slate-800">{po.vendor}</div>
                                <div className="text-sm text-slate-500">Transporter: Default Transporter</div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mb-1">
                                  TRK-{Date.now().toString().slice(-6)}
                                </div>
                                <div className="text-sm text-slate-500">
                                  Expected: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="space-y-2">
                                <select
                                  className={`px-3 py-1 rounded-full text-xs font-medium border-0 bg-yellow-100 text-yellow-800`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Dispatched">Dispatched</option>
                                  <option value="In Transit">In Transit</option>
                                  <option value="Out for Delivery">Out for Delivery</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Delayed">Delayed</option>
                                </select>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center space-x-2">
                                <button 
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                  title="View Details"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button 
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Edit Tracking"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Send Update"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Email to Vendor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Email *</label>
                <select
                  value={emailForm.vendor_email}
                  onChange={(e) => setEmailForm({...emailForm, vendor_email: e.target.value})}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vendor email</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.email}>
                      {vendor.vendor_name} - {vendor.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                <select
                  value={emailForm.location}
                  onChange={(e) => setEmailForm({...emailForm, location: e.target.value})}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PR Number</label>
                  <input
                    type="text"
                    value={selectedPR?.pr_number || ''}
                    readOnly
                    className="w-full rounded-lg border px-3 py-2 bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={emailForm.po_number || ''}
                    readOnly
                    className="w-full rounded-lg border px-3 py-2 bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendEmailToVendor}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Send Email
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
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