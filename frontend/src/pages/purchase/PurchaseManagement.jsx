import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState("PR");
  const { toast, showToast, hideToast } = useToast();

  const tabs = [
    { id: "PR", name: "Purchase Request", icon: "📝" },
    { id: "PO", name: "Purchase Order", icon: "📋" },
    //{ id: "Tracking", name: "PO Tracking", icon: "📦" }
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
  const [editingPR, setEditingPR] = useState(null); // Track which PR is being edited
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
      console.log("Items from API:", res.data);
      console.log("Item count:", res.data?.length || 0);
      if (res.data && res.data.length > 0) {
        console.log("First item structure:", res.data[0]);
        // Filter only active items
        const activeItems = res.data.filter(item => item.is_active !== false);
        console.log("Active items count:", activeItems.length);
        setItemList(activeItems);
      } else {
        setItemList([]);
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
      console.error("Error details:", err.response?.data || err.message);
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
    } else if (activeTab === "Tracking") {
      fetchPOList(); // Fetch PO list for tracking dropdown
      fetchTrackingList(); // Fetch tracking list
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
    if (!prItem.item_name || !prItem.quantity) {
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
      // Get full PR details with items
      const res = await api.get(`/purchase/${pr.id}`);
      const prDetails = res.data;
      
      // Set editing mode
      setEditingPR(pr);
      
      // Populate form
      setRequestedBy(prDetails.requested_by);
      
      // Load items if they exist
      if (prDetails.items && prDetails.items.length > 0) {
        const formattedItems = prDetails.items.map(item => ({
          id: Date.now() + Math.random(), // Generate unique ID for frontend
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
      
      showToast(`Editing PR: ${pr.pr_number} - Form populated with ${prDetails.items?.length || 0} items`, 'info');
    } catch (err) {
      console.error('Failed to fetch PR details:', err);
      // Fallback to basic edit
      setEditingPR(pr);
      setRequestedBy(pr.requested_by);
      setSelectedItems([]);
      showToast(`Edit PR: ${pr.pr_number} (Items not loaded - API error)`, 'error');
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

  // Update PR Status
  const updatePRStatus = async (prId, newStatus) => {
    try {
      await api.patch(`/purchase/${prId}/status?status=${newStatus}`);
      // Update local state immediately
      setPrList(prevList => 
        prevList.map(pr => 
          pr.id === prId ? { ...pr, status: newStatus } : pr
        )
      );
    } catch (err) {
      showToast('Failed to update PR status', 'error');
      console.error(err);
      fetchPRList(); // Refresh on error
    }
  };

  // Delete PR
  const deletePR = async (prId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this Purchase Request?');
    if (!confirmDelete) {
      return;
    }
    
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
      // Get PR details with items
      const res = await api.get(`/purchase/${pr.id}`);
      const prDetails = res.data;
      
      // Create items list for email
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
      // First create PO
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
      
      // Then send email with PO number
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
      fetchPOList(); // Refresh PO list to show new PO
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
        // Update existing PR
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
        // Create new PR
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
      
      // Reset form
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
      // Refresh list
      fetchPRList();
    } catch (err) {
      showToast(editingPR ? "Failed to update PR" : "Failed to create PR", 'error');
      console.error(err);
    }
  };

  /* ---------------- PO ---------------- */
  const [poList, setPoList] = useState([]);
  const [showPoEmailModal, setShowPoEmailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poEmailForm, setPoEmailForm] = useState({
    email: '',
    subject: '',
    message: ''
  });

  const fetchPOList = async () => {
    try {
      const res = await api.get("/purchase/po");
      setPoList(res.data);
    } catch (err) {
      console.error("Failed to fetch PO list:", err);
    }
  };

  const openPoEmailModal = (po) => {
    setSelectedPO(po);
    setPoEmailForm({
      email: '',
      subject: `Purchase Order ${po.po_number} - ${po.vendor}`,
      message: `Dear ${po.vendor},\n\nPlease find the Purchase Order ${po.po_number} details.\n\nThank you.`
    });
    setShowPoEmailModal(true);
  };

  const sendPoEmail = async () => {
    if (!poEmailForm.email) {
      showToast('Please enter email address', 'error');
      return;
    }

    try {
      await api.post(`/purchase/po/${selectedPO.id}/send-email`, {
        email: poEmailForm.email
      });
      showToast('PO email sent successfully!', 'success');
      setShowPoEmailModal(false);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send email';
      showToast(errorMsg, 'error');
    }
  };



  /* ---------------- PO TRACKING ---------------- */
  const [tracking, setTracking] = useState({
    po_number: "",
    dispatch_date: "",
    transporter: "",
    tracking_number: "",
    expected_delivery: "",
    status: "",
    remarks: ""
  });
  const [trackingList, setTrackingList] = useState([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Handle PO selection for tracking
  const handleTrackingPOSelect = (poNumber) => {
    const selectedPO = poList.find(po => po.po_number === poNumber);
    if (selectedPO) {
      setTracking({
        ...tracking,
        po_number: poNumber
      });
    }
  };

  // Fetch tracking list
  const fetchTrackingList = async () => {
    try {
      setLoadingTracking(true);
      const res = await api.get("/purchase/po-tracking");
      console.log("Tracking list response:", res.data);
      setTrackingList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch tracking list:", err);
      // Handle 422 error gracefully - tracking endpoint might not exist yet
      if (err.response?.status === 422) {
        console.log("Tracking endpoint not available - using empty list");
      }
      setTrackingList([]);
    } finally {
      setLoadingTracking(false);
    }
  };

  // Generate tracking number and send email
  const updateTrackingWithEmail = async (poNumber, status) => {
    if (!status) {
      showToast("Please select status", 'error');
      return;
    }

    try {
      const trackingData = {
        po_number: poNumber,
        dispatch_date: new Date().toISOString().split('T')[0],
        transporter: "Default Transporter",
        tracking_number: "", // Will be auto-generated
        expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        status: status,
        remarks: `Status updated to ${status}`
      };

      const res = await api.post("/purchase/po-tracking", trackingData);
      showToast(`Tracking updated! Number: ${res.data.tracking_number}`, 'success');
      
      if (res.data.email_sent) {
        showToast("Professional email sent to vendor", 'info');
      }
      
      fetchTrackingList(); // Refresh tracking list
    } catch (err) {
      showToast("Failed to update tracking", 'error');
    }
  };

  const updateTracking = async () => {
    if (!tracking.po_number) {
      showToast("Please select PO number", 'error');
      return;
    }

    try {
      const trackingData = {
        po_number: tracking.po_number,
        dispatch_date: tracking.dispatch_date || new Date().toISOString().split('T')[0],
        transporter: tracking.transporter || "Default Transporter",
        tracking_number: "", // Will be auto-generated
        expected_delivery: tracking.expected_delivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Pending", // Default status
        remarks: tracking.remarks || "Tracking created"
      };

      const res = await api.post("/purchase/po-tracking", trackingData);
      showToast(`Tracking created! Number: ${res.data.tracking_number}`, 'success');
      
      // Reset form
      setTracking({
        po_number: "",
        dispatch_date: "",
        transporter: "",
        tracking_number: "",
        expected_delivery: "",
        status: "",
        remarks: ""
      });
      
      // Refresh tracking list immediately
      await fetchTrackingList();
    } catch (err) {
      showToast("Failed to create tracking", 'error');
      console.error("Tracking creation error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">Purchase Management</div>
              <h1 className="text-3xl font-semibold mt-2">Purchase Operations</h1>
              <p className="mt-2 opacity-90">Manage purchase requests, orders, quotations and tracking.</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">Active Module</span>
                <div className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">Purchase</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "PR" && (
        <div className="grid grid-cols-5 gap-6">
          {/* LEFT SIDE - FORM */}
          <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Create Purchase Request</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Requested By</label>
                <input 
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter requester name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                <select 
                  value={prItem.item_id || ""}
                  onChange={e => {
                    const itemId = e.target.value;
                    if (itemId) {
                      handleItemSelect(itemId);
                    } else {
                      setPrItem({ ...prItem, item_id: "", item_name: "", uom: "" });
                    }
                  }}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select item from master</option>
                  {itemList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.item_code ? `(${item.item_code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 mt-1">
                  {itemList.length === 0 ? "No items found. Please add items to the item master first." : `${itemList.length} items available`}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input 
                    value={prItem.category}
                    readOnly
                    className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled from item"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label>
                  <input 
                    value={prItem.sub_category}
                    readOnly
                    className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled from item"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input 
                    value={prItem.brand}
                    readOnly
                    className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled from item"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                  <input 
                    value={prItem.manufacturer}
                    readOnly
                    className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled from item"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fixing Price</label>
                  <input 
                    value={prItem.fixing_price}
                    readOnly
                    className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                  <input 
                    value={prItem.quantity}
                    onChange={e => setPrItem({ ...prItem, quantity: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Quantity"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select 
                  value={prItem.priority}
                  onChange={e => setPrItem({ ...prItem, priority: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select priority (optional)</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea 
                  value={prItem.remarks}
                  onChange={e => setPrItem({ ...prItem, remarks: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional remarks"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={addItemToList}
                  className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2 hover:bg-green-700 transition-colors"
                >
                  Add Item
                </button>
              </div>
              
              {/* Selected Items List */}
              {selectedItems.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Selected Items ({selectedItems.length})</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="text-sm flex-1">
                          <span className="font-medium">{item.item_name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500">Qty:</span>
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const updatedItems = selectedItems.map(selectedItem => 
                                  selectedItem.id === item.id 
                                    ? { ...selectedItem, quantity: e.target.value }
                                    : selectedItem
                                );
                                setSelectedItems(updatedItems);
                              }}
                              className="w-16 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-500 ml-2">Priority: {item.priority}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  {editingPR && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <span className="text-blue-800 font-medium">Editing: {editingPR.pr_number}</span>
                      <button 
                        onClick={cancelEdit}
                        className="ml-2 text-blue-600 hover:text-blue-800 underline"
                      >
                        Cancel Edit
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={createPR}
                    className="w-full rounded-full bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingPR ? `Update Purchase Request (${selectedItems.length} items)` : `Create Purchase Request (${selectedItems.length} items)`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE - PR LIST */}
          <div className="col-span-3 bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Purchase Request List</h2>
              <button 
                onClick={fetchPRList}
                className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
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
                      <th className="text-left py-3 px-4 font-medium text-slate-700">#</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">PR Number</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Requested By</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-slate-500">
                          No purchase requests found
                        </td>
                      </tr>
                    ) : (
                      prList.map((pr, index) => (
                        <tr key={pr.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{pr.pr_number}</div>
                          </td>
                          <td className="py-3 px-4">{pr.requested_by}</td>
                          <td className="py-3 px-4">{new Date(pr.request_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <select 
                              value={pr.status || 'Draft'}
                              onChange={(e) => updatePRStatus(pr.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => editPR(pr)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => deletePR(pr.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                              <button 
                                onClick={() => openEmailModal(pr)}
                                disabled={pr.status !== 'Approved'}
                                className={`text-sm px-2 py-1 rounded ${
                                  pr.status === 'Approved' 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                Send Purchase Order
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
      )}

      {activeTab === "PO" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Purchase Order List</h2>
            <button 
              onClick={fetchPOList}
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Refresh
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-700">#</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">PO Number</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Vendor</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">PR Number</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {poList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  poList.map((po, index) => (
                    <tr key={po.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{po.po_number}</div>
                      </td>
                      <td className="py-3 px-4">{po.vendor}</td>
                      <td className="py-3 px-4">{po.pr_number}</td>
                      <td className="py-3 px-4">{new Date(po.po_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded">
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
        <div className="grid grid-cols-5 gap-6">
          {/* LEFT SIDE - TRACKING FORM */}
          <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Create PO Tracking</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Number *</label>
                <select
                  value={tracking.po_number}
                  onChange={(e) => handleTrackingPOSelect(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dispatch Date</label>
                  <input 
                    type="date"
                    value={tracking.dispatch_date}
                    onChange={e => setTracking({ ...tracking, dispatch_date: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                  <input 
                    type="date"
                    value={tracking.expected_delivery}
                    onChange={e => setTracking({ ...tracking, expected_delivery: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transporter</label>
                <input 
                  value={tracking.transporter}
                  onChange={e => setTracking({ ...tracking, transporter: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Transporter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea 
                  value={tracking.remarks}
                  onChange={e => setTracking({ ...tracking, remarks: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tracking remarks"
                />
              </div>
              <button 
                onClick={updateTracking}
                className="w-full rounded-full bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition-colors font-medium"
              >
                Create Tracking
              </button>
              <div className="text-xs text-slate-500 text-center">
                Tracking number will be auto-generated. Use status dropdown in list to send emails.
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - PO LIST WITH TRACKING */}
          <div className="col-span-3 bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">POs with Tracking - Status Management</h2>
              <button 
                onClick={() => { fetchPOList(); fetchTrackingList(); }}
                className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Refresh
              </button>
            </div>
            
            {loadingTracking ? (
              <div className="text-center py-8">
                <div className="text-slate-500">Loading...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">#</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">PO Number</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Vendor</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Tracking Number</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-slate-500">
                          No tracking records found. Create tracking from left form first.
                        </td>
                      </tr>
                    ) : (
                      trackingList.map((trackingInfo, index) => {
                        const po = poList.find(p => p.po_number === trackingInfo.po_number);
                        return (
                          <tr key={trackingInfo.id} className="border-b hover:bg-slate-50">
                            <td className="py-3 px-4">{index + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{trackingInfo.po_number}</div>
                            </td>
                            <td className="py-3 px-4">{po?.vendor || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {trackingInfo.tracking_number}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <select 
                                value={trackingInfo.status || ''}
                                onChange={(e) => updateTrackingWithEmail(trackingInfo.po_number, e.target.value)}
                                className="text-sm px-2 py-1 rounded border focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Update Status & Send Email</option>
                                <option value="Dispatched">Dispatched</option>
                                <option value="In Transit">In Transit</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Delayed">Delayed</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {trackingInfo.status && trackingInfo.status !== 'Pending' ? (
                                  <span className="text-green-600 text-sm font-medium">✓ {trackingInfo.status}</span>
                                ) : (
                                  <span className="text-orange-600 text-sm">Pending Status</span>
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
            )}
          </div>
        </div>
      )}
      
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

      {/* PO Email Modal */}
      {showPoEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Purchase Order</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={poEmailForm.email}
                  onChange={(e) => setPoEmailForm({...poEmailForm, email: e.target.value})}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={poEmailForm.subject}
                  onChange={(e) => setPoEmailForm({...poEmailForm, subject: e.target.value})}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={poEmailForm.message}
                  onChange={(e) => setPoEmailForm({...poEmailForm, message: e.target.value})}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendPoEmail}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Send Purchase Order
              </button>
              <button
                onClick={() => setShowPoEmailModal(false)}
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
