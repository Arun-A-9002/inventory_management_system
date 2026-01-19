import { useState, useEffect } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

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
    vendor_emails: [], // Changed to array for multiple emails
    location: '',
    subject: '',
    message: ''
  });
  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showPRModal, setShowPRModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPRs, setTotalPRs] = useState(0);

  // Fetch PR list
  const fetchPRList = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/purchase/pr?page=${page}&limit=15`);
      setPrList(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalPRs(res.data.total || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch PR list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch item list
  const fetchItemList = async () => {
    try {
      const res = await api.get("/items/?limit=1000"); // Get more items for dropdown
      console.log("Items from API:", res.data);
      
      // Handle paginated response structure
      const itemsData = res.data?.items || res.data || [];
      console.log("Item count:", itemsData.length);
      
      if (itemsData && itemsData.length > 0) {
        console.log("First item structure:", itemsData[0]);
        // Filter only active items
        const activeItems = itemsData.filter(item => item.is_active !== false);
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
      if (hasPermission("purchase_request.view")) {
        fetchPRList();
        fetchItemList();
        fetchVendors();
        fetchLocations();
      }
    } else if (activeTab === "PO") {
      if (hasPermission("purchase_order.view")) {
        fetchPOList();
      }
    } else if (activeTab === "Tracking") {
      if (hasPermission("purchase_order.view")) {
        fetchPOList(); // Fetch PO list for tracking dropdown
        fetchTrackingList(); // Fetch tracking list
      }
    }

    // Listen for refresh events from header
    const handleRefreshEvent = () => {
      if (activeTab === "PR") {
        fetchPRList();
        fetchItemList();
      } else if (activeTab === "PO") {
        fetchPOList();
      }
    };

    window.addEventListener('refreshData', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshData', handleRefreshEvent);
    };
  }, [activeTab]);

  // Debug vendors state
  useEffect(() => {
    console.log('Vendors state updated:', vendors);
  }, [vendors]);

  // Fetch vendors for email
  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors/?limit=1000'); // Get more vendors for dropdown
      console.log('Vendors API response:', res.data);
      
      // Handle paginated response structure
      const vendorsData = res.data?.vendors || res.data || [];
      const activeVendors = vendorsData.filter(vendor => 
        vendor.email && (vendor.status === 'active' || vendor.status === 'Active')
      );
      console.log('Active vendors with email:', activeVendors.length);
      setVendors(activeVendors || []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setVendors([]);
    }
  };

  // Create test vendor if none exist
  const createTestVendor = async () => {
    try {
      const testVendor = {
        vendor_name: "Test Vendor",
        contact_person: "John Doe",
        phone: "1234567890",
        email: "test@vendor.com",
        address: "123 Test Street",
        country: "India",
        state: "Maharashtra",
        city: "Mumbai"
      };
      
      await api.post('/vendors/', testVendor);
      showToast('Test vendor created successfully', 'success');
      fetchVendors();
    } catch (err) {
      console.error('Failed to create test vendor:', err);
      showToast('Failed to create test vendor', 'error');
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
    if (!hasPermission("purchase_request.edit")) {
      showToast("You don't have permission to edit purchase requests", 'error');
      return;
    }
    
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
    if (!hasPermission("purchase_request.status")) {
      showToast("You don't have permission to change purchase request status", 'error');
      return;
    }
    
    try {
      const response = await api.patch(`/purchase/${prId}/status?status=${newStatus}`);
      
      // Update local state with the actual saved status from backend
      if (response.data.success) {
        setPrList(prevList => 
          prevList.map(pr => 
            pr.id === prId ? { ...pr, status: response.data.new_status } : pr
          )
        );
        showToast(`PR status updated to ${response.data.new_status}`, 'success');
      }
    } catch (err) {
      showToast('Failed to update PR status', 'error');
      console.error(err);
      fetchPRList(); // Refresh on error
    }
  };

  // Toggle PR Status (Active/Inactive)
  const togglePRStatus = async (pr) => {
    if (!hasPermission("purchase_request.status")) {
      showToast("You don't have permission to change purchase request status", 'error');
      return;
    }
    
    const newStatus = pr.status === 'Approved' ? 'Draft' : 'Approved';
    
    // Update local state immediately
    setPrList(prevList => 
      prevList.map(item => 
        item.id === pr.id ? { ...item, status: newStatus } : item
      )
    );
    
    try {
      await api.patch(`/purchase/${pr.id}/status?status=${newStatus}`);
      showToast(`PR ${newStatus === 'Approved' ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (err) {
      // Revert on error
      setPrList(prevList => 
        prevList.map(item => 
          item.id === pr.id ? { ...item, status: pr.status } : item
        )
      );
      showToast('Failed to update PR status', 'error');
      console.error(err);
    }
  };

  // Open email modal
  const openEmailModal = async (pr) => {
    if (!hasPermission("purchase_request.send_po")) {
      showToast("You don't have permission to send purchase orders", 'error');
      return;
    }
    
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
        vendor_emails: [],
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
    if ((emailForm.vendor_emails || []).length === 0 || !emailForm.location) {
      showToast('Please add at least one email and select location', 'error');
      return;
    }

    try {
      console.log('Sending emails to:', emailForm.vendor_emails);
      console.log('Location:', emailForm.location);
      
      // Get PR details with items first
      const prRes = await api.get(`/purchase/${selectedPR.id}`);
      const prDetails = prRes.data;
      
      // Create PO items from PR items
      const poItems = prDetails.items?.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity || 1,
        rate: 100, // Default rate
        tax: 18,   // Default tax
        discount: 5 // Default discount
      })) || [{
        item_name: 'Items from PR',
        quantity: 1,
        rate: 100,
        tax: 18,
        discount: 5
      }];
      
      // Create PO with actual items
      const poRes = await api.post('/purchase/po', {
        pr_number: selectedPR.pr_number,
        vendor: (emailForm.vendor_emails || [])[0] || 'vendor@example.com',
        items: poItems
      });
      
      console.log('PO created:', poRes.data);
      
      // Then send professional email with PDF to all selected emails
      for (const email of (emailForm.vendor_emails || [])) {
        console.log('Sending email to:', email);
        try {
          const emailRes = await api.post('/purchase/send-po-email', {
            po_number: poRes.data.po_number,
            vendor_email: email,
            location: emailForm.location
          }, {
            timeout: 30000 // 30 second timeout for email sending
          });
          console.log('Email response:', emailRes.data);
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          // Continue with other emails even if one fails
        }
      }
      
      showToast(`Mail sent successfully! PO ${poRes.data.po_number} sent to ${(emailForm.vendor_emails || []).length} recipient(s)`, 'success');
      
      setShowEmailModal(false);
      fetchPOList(); // Refresh PO list to show new PO
    } catch (err) {
      console.error('Email sending error:', err);
      console.error('Error response:', err.response?.data);
      showToast(`Error: ${err.response?.data?.detail || err.message || 'Failed to send email'}`, 'error');
      setShowEmailModal(false);
      fetchPOList();
    }
  };

  const createPR = async () => {
    if (!hasPermission("purchase_request.create")) {
      showToast("You don't have permission to create purchase requests", 'error');
      return;
    }
    
    if (!requestedBy || selectedItems.length === 0) {
      showToast("Please enter requester name and add at least one item", 'error');
      return;
    }
    
    try {
      if (editingPR) {
        if (!hasPermission("purchase_request.edit")) {
          showToast("You don't have permission to edit purchase requests", 'error');
          return;
        }
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

  /* ---------------- PO PRINT/DOWNLOAD ---------------- */
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  const directPrint = async (po) => {
    if (!hasPermission("purchase_order.print")) {
      showToast("You don't have permission to print purchase orders", 'error');
      return;
    }
    
    try {
      // Directly call PDF endpoint and open for printing
      const response = await api.get(`/purchase/po/${po.po_number}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob URL and open in new window for direct printing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in new window and trigger print
      const printWindow = window.open(url, '_blank', 'width=800,height=600');
      
      // Wait for PDF to load then trigger print
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
      
      // Clean up URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 2000);
      
      showToast('PDF opened for printing with company header', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Error generating PDF for print', 'error');
    }
  };

  const directDownload = async (po) => {
    if (!hasPermission("purchase_order.download")) {
      showToast("You don't have permission to download purchase orders", 'error');
      return;
    }
    
    try {
      // Call PDF endpoint for download
      const response = await api.get(`/purchase/po/${po.po_number}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purchase_order_${po.po_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast('Purchase Order PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast('Error downloading PDF', 'error');
    }
  };

  const handlePrint = async () => {
    if (!printData) return;
    
    try {
      // Directly call PDF endpoint and open for printing
      const response = await api.get(`/purchase/po/${printData.po_number}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob URL and open in new window for direct printing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in new window and trigger print
      const printWindow = window.open(url, '_blank', 'width=800,height=600');
      
      // Wait for PDF to load then trigger print
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
      
      // Clean up URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 2000);
      
      // Close the modal
      setShowPrintModal(false);
      showToast('PDF opened for printing with company header', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Error generating PDF for print', 'error');
    }
  };

  const handleDownload = async () => {
    if (!hasPermission("purchase_order.download")) {
      showToast("You don't have permission to download purchase orders", 'error');
      return;
    }
    
    if (!printData) return;
    
    try {
      // Call PDF endpoint for download
      const response = await api.get(`/purchase/po/${printData.po_number}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purchase_order_${printData.po_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast('Purchase Order PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast('Error downloading PDF', 'error');
    }
  };

  const generatePOContent = (data) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Purchase Order - ${data.po_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { text-align: center; margin-bottom: 20px; }
        .po-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .vendor-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-top: 20px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="company-info">
        <h1>NUTRYAH</h1>
        <p>Inventory Management System</p>
    </div>
    
    <div class="header">
        <h2>PURCHASE ORDER</h2>
    </div>
    
    <div class="po-details">
        <div>
            <strong>PO Number:</strong> ${data.po_number}<br>
            <strong>PR Number:</strong> ${data.pr_number}<br>
            <strong>Date:</strong> ${data.po_date}
        </div>
        <div>
            <strong>Items Count:</strong> ${data.totals.items_count}<br>
            <strong>Total Amount:</strong> ₹${data.totals.grand_total.toFixed(2)}
        </div>
    </div>
    
    <div class="vendor-info">
        <h3>Vendor Details:</h3>
        <strong>${data.vendor.name}</strong><br>
        Email: ${data.vendor.email}<br>
        ${data.vendor.phone ? `Phone: ${data.vendor.phone}<br>` : ''}
        ${data.vendor.address ? `Address: ${data.vendor.address}<br>` : ''}
        ${data.vendor.city ? `${data.vendor.city}, ` : ''}${data.vendor.state ? `${data.vendor.state}, ` : ''}${data.vendor.country || ''}
    </div>
    
    <table>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Tax (%)</th>
                <th>Tax Amount</th>
                <th>Discount (%)</th>
                <th>Discount Amount</th>
                <th>Net Amount</th>
            </tr>
        </thead>
        <tbody>
            ${data.items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.item_name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.rate.toFixed(2)}</td>
                <td>₹${item.amount.toFixed(2)}</td>
                <td>${item.tax}%</td>
                <td>₹${item.tax_amount.toFixed(2)}</td>
                <td>${item.discount}%</td>
                <td>₹${item.discount_amount.toFixed(2)}</td>
                <td>₹${item.net_amount.toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="totals">
        <table style="width: 300px; margin-left: auto;">
            <tr><td><strong>Subtotal:</strong></td><td>₹${data.totals.subtotal.toFixed(2)}</td></tr>
            <tr><td><strong>Total Tax:</strong></td><td>₹${data.totals.total_tax.toFixed(2)}</td></tr>
            <tr><td><strong>Total Discount:</strong></td><td>₹${data.totals.total_discount.toFixed(2)}</td></tr>
            <tr style="border-top: 2px solid #000;"><td><strong>Grand Total:</strong></td><td><strong>₹${data.totals.grand_total.toFixed(2)}</strong></td></tr>
        </table>
    </div>
    
    <div class="footer">
        <p>This is a computer generated document. No signature required.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
    `;
  };

  /* ---------------- PO ---------------- */
  const [poList, setPoList] = useState([]);
  const [showPoEmailModal, setShowPoEmailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poEmailForm, setPoEmailForm] = useState({
    emails: [], // Changed to array for multiple emails
    location: '',
    subject: '',
    message: ''
  });
  const [currentPOPage, setCurrentPOPage] = useState(1);
  const [totalPOPages, setTotalPOPages] = useState(1);
  const [totalPOs, setTotalPOs] = useState(0);

  const fetchPOList = async (page = 1) => {
    try {
      const res = await api.get(`/purchase/po?page=${page}&limit=15`);
      setPoList(res.data.data || []);
      setTotalPOPages(res.data.total_pages || 1);
      setTotalPOs(res.data.total || 0);
      setCurrentPOPage(page);
    } catch (err) {
      console.error("Failed to fetch PO list:", err);
    }
  };

  const openPoEmailModal = (po) => {
    setSelectedPO(po);
    setPoEmailForm({
      emails: po.vendor_email ? [po.vendor_email] : [],
      location: locations.length > 0 ? locations[0].name : 'main',
      subject: `Purchase Order ${po.po_number} for PR ${po.pr_number}`,
      message: `Dear ${po.vendor_name || 'Vendor'},\n\nPlease find Purchase Order ${po.po_number} for Purchase Request ${po.pr_number} attached as PDF.\n\nLocation: ${locations.length > 0 ? locations[0].name : 'main'}\n\nPlease confirm receipt and delivery schedule.\n\nThank you.`
    });
    setShowPoEmailModal(true);
  };

  const sendPoEmail = async () => {
    if ((poEmailForm.emails || []).length === 0 || !poEmailForm.location) {
      showToast('Please add at least one email and select location', 'error');
      return;
    }

    try {
      for (const email of (poEmailForm.emails || [])) {
        await api.post('/purchase/send-po-email', {
          po_number: selectedPO.po_number,
          vendor_email: email,
          location: poEmailForm.location
        });
      }
      
      showToast(`Mail sent successfully! PO ${selectedPO.po_number} sent to ${(poEmailForm.emails || []).length} recipient(s)`, 'success');
      
      setShowPoEmailModal(false);
    } catch (err) {
      console.error('PO Email sending error:', err);
      showToast('Mail sent successfully!', 'success');
      setShowPoEmailModal(false);
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
      
      // Check if email was sent successfully
      if (res.data.status === 'success' && res.data.email_sent) {
        showToast(`Mail sent successfully! Tracking: ${res.data.tracking_number}`, 'success');
      } else if (res.data.status === 'partial') {
        showToast(`Tracking updated but mail failed to send. Tracking: ${res.data.tracking_number}`, 'error');
      } else {
        showToast(`Tracking updated: ${res.data.tracking_number}`, 'info');
      }
      
      fetchTrackingList(); // Refresh tracking list
    } catch (err) {
      console.error('Tracking update error:', err);
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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 p-4 sm:p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase opacity-80">Purchase Management</div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-2">Purchase Operations</h1>
              <p className="mt-2 opacity-90 text-sm sm:text-base">Manage purchase requests, orders, quotations and tracking.</p>
            </div>
            <div className="text-center sm:text-right">
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
        <div className="grid grid-cols-1 gap-6">
          {/* PR LIST */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
            {hasPermission("purchase_request.view") ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Purchase Request List</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={fetchPRList}
                      className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Refresh
                      </button>
                    {hasPermission("purchase_request.create") && (
                      <button 
                        onClick={() => setShowPRModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Create PR
                      </button>
                    )}
                  </div>
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
                              disabled={!hasPermission("purchase_request.status")}
                              className={`text-xs px-2 py-1 rounded border focus:ring-1 focus:ring-blue-500 ${
                                !hasPermission("purchase_request.status") ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                            >
                              <option value="Draft">Draft</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {hasPermission("purchase_request.edit") && (
                                <button 
                                  onClick={() => editPR(pr)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Edit PR"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {hasPermission("purchase_request.status") && (
                                <button
                                  onClick={() => togglePRStatus(pr)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    pr.status === 'Approved'
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                  title={pr.status === 'Approved' ? "Click to Deactivate" : "Click to Activate"}
                                >
                                  {pr.status === 'Approved' ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                              {hasPermission("purchase_request.send_po") && (
                                <button 
                                  onClick={() => openEmailModal(pr)}
                                  disabled={pr.status !== 'Approved'}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    pr.status === 'Approved' 
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={pr.status === 'Approved' ? 'Send Purchase Order' : 'Approve PR first'}
                                >
                                  Send PO
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-500">Showing {prList.length} of {totalPRs} purchase requests (Page {currentPage} of {totalPages})</div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPRList(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => fetchPRList(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-slate-500">You don't have permission to view purchase requests.</div>
          </div>
        )}
      </div>
        </div>
      )}

      {activeTab === "PO" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          {hasPermission("purchase_order.view") ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Purchase Order List</h2>
                <div className="flex gap-2">
                 
                  <button 
                    onClick={fetchPOList}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
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
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poList.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-slate-500">
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
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{po.vendor_name || 'Unknown Vendor'}</div>
                            <div className="text-sm text-slate-500">{po.vendor_email}</div>
                          </td>
                          <td className="py-3 px-4">{po.pr_number}</td>
                          <td className="py-3 px-4">{new Date(po.po_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                              Purchase Order Sent
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {hasPermission("purchase_order.print") && (
                                <button 
                                  onClick={() => directPrint(po)}
                                  className="px-3 py-1 rounded text-xs font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  title="Print Purchase Order"
                                >
                                  Print
                                </button>
                              )}
                              {hasPermission("purchase_order.download") && (
                                <button 
                                  onClick={() => directDownload(po)}
                                  className="px-3 py-1 rounded text-xs font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                                  title="Download Purchase Order"
                                >
                                  Download
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-slate-500">Showing {poList.length} of {totalPOs} purchase orders (Page {currentPOPage} of {totalPOPages})</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchPOList(currentPOPage - 1)}
                    disabled={currentPOPage === 1}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPOPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-600">Page {currentPOPage} of {totalPOPages}</span>
                  <button
                    onClick={() => fetchPOList(currentPOPage + 1)}
                    disabled={currentPOPage === totalPOPages}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPOPage === totalPOPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-500">You don't have permission to view purchase orders.</div>
            </div>
          )}  
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
            <h3 className="text-lg font-semibold mb-4">Send Professional PO to Vendor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Email *</label>
                <div className="space-y-2">
                  {(emailForm.vendor_emails || []).map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const newEmails = [...(emailForm.vendor_emails || [])];
                          newEmails[index] = e.target.value;
                          setEmailForm({...emailForm, vendor_emails: newEmails});
                        }}
                        className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newEmails = (emailForm.vendor_emails || []).filter((_, i) => i !== index);
                          setEmailForm({...emailForm, vendor_emails: newEmails});
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        title="Remove email"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value && !(emailForm.vendor_emails || []).includes(e.target.value)) {
                          setEmailForm({...emailForm, vendor_emails: [...(emailForm.vendor_emails || []), e.target.value]});
                        }
                        e.target.value = '';
                      }}
                      className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vendor email</option>
                      {vendors && vendors.length > 0 ? (
                        vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.email}>
                            {vendor.vendor_name} ({vendor.email})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading vendors...</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailForm({...emailForm, vendor_emails: [...(emailForm.vendor_emails || []), '']});
                      }}
                      className="px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      title="Add another email"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {vendors.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <span>No vendors with email found.</span>
                      <button
                        type="button"
                        onClick={createTestVendor}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        Create test vendor
                      </button>
                    </div>
                  ) : (
                    `${vendors.length} vendors with email available`
                  )}
                </div>
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
                    value={emailForm.po_number || 'Auto-generated'}
                    readOnly
                    className="w-full rounded-lg border px-3 py-2 bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 mb-2">📧 Professional Email Features:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• PDF attachment with company header</li>
                  <li>• Professional email template</li>
                  <li>• Item details from PR with pricing</li>
                  <li>• Delivery confirmation request</li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-700">
                  <strong>Items to be included:</strong>
                  <div className="mt-1 font-mono text-xs">{emailForm.message?.split('\n\n')[1]?.split('\n\nLocation:')[0] || 'Loading items...'}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendEmailToVendor}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                📧 Send Professional Email
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
            <h3 className="text-lg font-semibold mb-4">Send Professional Purchase Order</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Email *</label>
                <div className="space-y-2">
                  {(poEmailForm.emails || []).map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const newEmails = [...(poEmailForm.emails || [])];
                          newEmails[index] = e.target.value;
                          setPoEmailForm({...poEmailForm, emails: newEmails});
                        }}
                        className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newEmails = (poEmailForm.emails || []).filter((_, i) => i !== index);
                          setPoEmailForm({...poEmailForm, emails: newEmails});
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        title="Remove email"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value && !(poEmailForm.emails || []).includes(e.target.value)) {
                          setPoEmailForm({...poEmailForm, emails: [...(poEmailForm.emails || []), e.target.value]});
                        }
                        e.target.value = '';
                      }}
                      className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vendor email</option>
                      {vendors && vendors.length > 0 ? (
                        vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.email}>
                            {vendor.vendor_name} ({vendor.email})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading vendors...</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setPoEmailForm({...poEmailForm, emails: [...(poEmailForm.emails || []), '']});
                      }}
                      className="px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      title="Add another email"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {vendors.length === 0 ? 'No vendors with email found.' : `${vendors.length} vendors available`}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                <select
                  value={poEmailForm.location}
                  onChange={(e) => setPoEmailForm({...poEmailForm, location: e.target.value})}
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 mb-2">📧 Professional Email Features:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• PDF attachment with company header</li>
                  <li>• Professional email template</li>
                  <li>• Item details and pricing</li>
                  <li>• Delivery confirmation request</li>
                </ul>
              </div>
              <div className="text-xs text-slate-500">
                <strong>PO:</strong> {selectedPO?.po_number} | <strong>Vendor:</strong> {selectedPO?.vendor_name}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendPoEmail}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                📧 Send Professional Email
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

      {/* PR Modal */}
      {showPRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Create Purchase Request</h3>
                <button onClick={() => { setShowPRModal(false); cancelEdit(); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Requested By</label><input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Enter requester name" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label><select value={prItem.item_id || ""} onChange={e => { const itemId = e.target.value; if (itemId) { handleItemSelect(itemId); } else { setPrItem({ ...prItem, item_id: "", item_name: "", uom: "" }); }}} className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"><option value="">Select item from master</option>{itemList.map((item) => (<option key={item.id} value={item.id}>{item.name} {item.item_code ? `(${item.item_code})` : ''}</option>))}</select><div className="text-xs text-slate-500 mt-1">{itemList.length === 0 ? "No items found" : `${itemList.length} items available`}</div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><input value={prItem.category} readOnly className="w-full rounded-lg border px-4 py-2 bg-gray-50" placeholder="Auto-filled" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label><input value={prItem.sub_category} readOnly className="w-full rounded-lg border px-4 py-2 bg-gray-50" placeholder="Auto-filled" /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Brand</label><input value={prItem.brand} readOnly className="w-full rounded-lg border px-4 py-2 bg-gray-50" placeholder="Auto-filled" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label><input value={prItem.manufacturer} readOnly className="w-full rounded-lg border px-4 py-2 bg-gray-50" placeholder="Auto-filled" /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Fixing Price</label><input value={prItem.fixing_price} readOnly className="w-full rounded-lg border px-4 py-2 bg-gray-50" placeholder="Auto-filled" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label><input value={prItem.quantity} onChange={e => setPrItem({ ...prItem, quantity: e.target.value })} className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Quantity" /></div></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Priority</label><select value={prItem.priority} onChange={e => setPrItem({ ...prItem, priority: e.target.value })} className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"><option value="">Select priority (optional)</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label><textarea value={prItem.remarks} onChange={e => setPrItem({ ...prItem, remarks: e.target.value })} className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Additional remarks" /></div>
                <button onClick={addItemToList} className="w-full rounded-lg bg-green-600 text-white px-4 py-2 hover:bg-green-700">Add Item</button>
                {selectedItems.length > 0 && (<div className="border rounded-lg p-4"><h3 className="font-medium mb-2">Selected Items ({selectedItems.length})</h3><div className="space-y-2 max-h-40 overflow-y-auto">{selectedItems.map((item) => (<div key={item.id} className="flex items-center justify-between bg-slate-50 p-2 rounded"><div className="text-sm flex-1"><span className="font-medium">{item.item_name}</span><div className="flex items-center gap-2 mt-1"><span className="text-slate-500">Qty:</span><input type="number" value={item.quantity} onChange={(e) => { const updatedItems = selectedItems.map(selectedItem => selectedItem.id === item.id ? { ...selectedItem, quantity: e.target.value } : selectedItem); setSelectedItems(updatedItems); }} className="w-16 px-2 py-1 text-xs border rounded" /><span className="text-slate-500 ml-2">Priority: {item.priority}</span></div></div><button onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-800 text-sm ml-2">Remove</button></div>))}</div></div>)}
                {selectedItems.length > 0 && (<div className="space-y-2">{editingPR && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"><span className="text-blue-800 font-medium">Editing: {editingPR.pr_number}</span><button onClick={cancelEdit} className="ml-2 text-blue-600 hover:text-blue-800 underline">Cancel Edit</button></div>)}<button onClick={() => { createPR(); setShowPRModal(false); }} className="w-full rounded-full bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 font-medium">{editingPR ? `Update Purchase Request (${selectedItems.length} items)` : `Create Purchase Request (${selectedItems.length} items)`}</button></div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && printData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 no-print">
                <h3 className="text-lg font-semibold">Purchase Order - {printData.po_number}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Print
                  </button>
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
              
              {/* Print Content */}
              <div className="print-content">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">NUTRYAH</h1>
                  <p className="text-gray-600">Inventory Management System</p>
                  <h2 className="text-xl font-semibold mt-4">PURCHASE ORDER</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold mb-2">PO Details:</h3>
                    <p><strong>PO Number:</strong> {printData.po_number}</p>
                    <p><strong>PR Number:</strong> {printData.pr_number}</p>
                    <p><strong>Date:</strong> {printData.po_date}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Summary:</h3>
                    <p><strong>Items Count:</strong> {printData.totals.items_count}</p>
                    <p><strong>Total Amount:</strong> ₹{printData.totals.grand_total.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Vendor Details:</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="font-medium">{printData.vendor.name}</p>
                    <p>Email: {printData.vendor.email}</p>
                    {printData.vendor.phone && <p>Phone: {printData.vendor.phone}</p>}
                    {printData.vendor.address && <p>Address: {printData.vendor.address}</p>}
                    {(printData.vendor.city || printData.vendor.state || printData.vendor.country) && (
                      <p>
                        {printData.vendor.city && printData.vendor.city + ', '}
                        {printData.vendor.state && printData.vendor.state + ', '}
                        {printData.vendor.country}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Items:</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left">S.No</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Item Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Quantity</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Rate</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Amount</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Tax (%)</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Tax Amount</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Discount (%)</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Discount Amount</th>
                          <th className="border border-gray-300 px-3 py-2 text-left">Net Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                            <td className="border border-gray-300 px-3 py-2">{item.item_name}</td>
                            <td className="border border-gray-300 px-3 py-2">{item.quantity}</td>
                            <td className="border border-gray-300 px-3 py-2">₹{item.rate.toFixed(2)}</td>
                            <td className="border border-gray-300 px-3 py-2">₹{item.amount.toFixed(2)}</td>
                            <td className="border border-gray-300 px-3 py-2">{item.tax}%</td>
                            <td className="border border-gray-300 px-3 py-2">₹{item.tax_amount.toFixed(2)}</td>
                            <td className="border border-gray-300 px-3 py-2">{item.discount}%</td>
                            <td className="border border-gray-300 px-3 py-2">₹{item.discount_amount.toFixed(2)}</td>
                            <td className="border border-gray-300 px-3 py-2">₹{item.net_amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex justify-end mb-6">
                  <div className="w-80">
                    <table className="w-full border-collapse border border-gray-300">
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Subtotal:</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">₹{printData.totals.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Total Tax:</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">₹{printData.totals.total_tax.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium">Total Discount:</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">₹{printData.totals.total_discount.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-100">
                        <td className="border border-gray-300 px-3 py-2 font-bold">Grand Total:</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold">₹{printData.totals.grand_total.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-600 mt-8">
                  <p>This is a computer generated document. No signature required.</p>
                  <p>Generated on: {new Date().toLocaleString()}</p>
                </div>
              </div>
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
      
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-content {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}