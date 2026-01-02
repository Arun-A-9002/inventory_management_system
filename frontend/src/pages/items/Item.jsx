import { useState, useEffect } from "react";
import api from "../../api";
import QRCode from "react-qr-code";
import JsBarcode from "jsbarcode";
import { useToast } from "../../utils/useToast";

export default function Item() {
  const [items, setItems] = useState([]);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [generatedBarcode, setGeneratedBarcode] = useState("");
  const [generatedQR, setGeneratedQR] = useState("");

  const [form, setForm] = useState({
    name: "",
    item_code: "",
    description: "",
    category: "",
    sub_category: "",
    brand: "",
    manufacturer: "",
    min_stock: 0,
    max_stock: 0,
    safety_stock: 0,
    fixing_price: 0,
    mrp: 0,
    tax: 0,
    item_type: "",
    has_expiry: false,
    expiry_date: "",
    manufacture_date: "",
    has_warranty: false,
    warranty_period: 0,
    warranty_period_type: "years",
    barcode: "",
    qr_code: "",
    is_active: true
  });

  const [editingId, setEditingId] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [originalQuantity, setOriginalQuantity] = useState(0);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadItems();
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [categoriesRes, brandsRes, subCategoriesRes] = await Promise.all([
        api.get("/category/"),
        api.get("/brand/"),
        api.get("/subcategory/")
      ]);
      
      console.log("Categories loaded:", categoriesRes.data);
      console.log("Brands loaded:", brandsRes.data);
      console.log("Subcategories loaded:", subCategoriesRes.data);
      
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
      setAllSubCategories(subCategoriesRes.data || []);
      
      // Set initial subcategories (empty until category is selected)
      setSubCategories([]);
    } catch (err) {
      console.error("Failed to load master data:", err);
    }
  };

  const loadSubCategories = async (categoryId) => {
    if (!categoryId) {
      setSubCategories([]);
      return;
    }
    try {
      const res = await api.get(`/subcategory/by-category/${categoryId}`);
      console.log("Subcategories for category", categoryId, ":", res.data);
      setSubCategories(res.data || []);
    } catch (err) {
      console.error("Failed to load subcategories:", err);
      setSubCategories([]);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/items");
      setItems(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load items", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    
    setForm({
      ...form,
      [name]: newValue
    });

    // Load subcategories when category changes
    if (name === "category") {
      if (value) {
        // Use the category ID directly from the select value
        const categoryId = parseInt(value);
        console.log('Selected category ID:', categoryId);
        loadSubCategories(categoryId);
      } else {
        setSubCategories([]);
        setForm(prev => ({ ...prev, sub_category: "" }));
      }
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      item_code: "",
      description: "",
      category: "",
      sub_category: "",
      brand: "",
      manufacturer: "",
      min_stock: 0,
      max_stock: 0,
      safety_stock: 0,
      fixing_price: 0,
      mrp: 0,
      tax: 0,
      item_type: "",
      has_expiry: false,
      expiry_date: "",
      manufacture_date: "",
      has_warranty: false,
      warranty_period: 0,
      warranty_period_type: "years",
      barcode: "",
      qr_code: "",
      is_active: true
    });
    setEditingId(null);
    setSubCategories([]);
    setShowCreateModal(false);
    setGeneratedBarcode("");
    setGeneratedQR("");
  };

  const handleSubmit = async () => {
    if (!form.name || !form.item_code || !form.item_type) {
      showToast("Item name, code, and type are required", 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        category: form.category ? String(form.category) : null,
        sub_category: form.sub_category ? String(form.sub_category) : null,
        expiry_date: form.expiry_date || null,
        manufacture_date: form.manufacture_date || null,
        item_type: form.item_type || null,
        warranty_period: form.warranty_period || 0,
        barcode: form.barcode || null,
        qr_code: form.qr_code || null
      };
      
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
      } else {
        await api.post("/items", payload);
      }
      showToast(editingId ? "Item updated successfully" : "Item created successfully", 'success');
      resetForm();
      loadItems();
    } catch (err) {
      console.error(err);
      let errorMessage = "Failed to save item";
      if (err?.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg || e).join(", ");
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      item_code: item.item_code,
      description: item.description || "",
      category: item.category_id || "",
      sub_category: item.sub_category_id || "",
      brand: item.brand || "",
      manufacturer: item.manufacturer || "",
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      safety_stock: item.safety_stock || 0,
      fixing_price: item.fixing_price || 0,
      mrp: item.mrp || 0,
      tax: item.tax || 0,
      item_type: item.item_type || "",
      has_expiry: item.has_expiry,
      expiry_date: item.expiry_date || "",
      manufacture_date: item.manufacture_date || "",
      has_warranty: item.has_warranty || false,
      warranty_period: item.warranty_period || 0,
      warranty_period_type: item.warranty_period_type || "years",
      barcode: item.barcode || "",
      qr_code: item.qr_code || "",
      is_active: item.is_active !== undefined ? item.is_active : true
    });
    
    // Load subcategories for selected category
    if (item.category_id) {
      loadSubCategories(item.category_id);
    }
    
    setShowCreateModal(true);
  };

  const handleEditQuantity = async (item) => {
    setEditingItem(item);
    setShowEditDialog(true);
    
    // Get current stock for this item
    try {
      const stockRes = await api.get(`/stocks/`);
      const itemStock = stockRes.data.find(stock => stock.item_name === item.name);
      
      if (itemStock) {
        setOriginalQuantity(itemStock.available_qty);
        setEditQuantity(itemStock.available_qty);
        setAvailableBatches(itemStock.batches || []);
      } else {
        setOriginalQuantity(0);
        setEditQuantity(0);
        setAvailableBatches([]);
      }
    } catch (err) {
      console.error('Failed to load stock:', err);
      showToast('Failed to load stock information', 'error');
    }
  };

  const handleTakeQuantity = async () => {
    const extraQuantity = editQuantity - originalQuantity;
    
    if (extraQuantity <= 0) {
      showToast('No extra quantity to take', 'error');
      return;
    }

    // Check if we have enough stock in selected batch
    if (selectedBatch) {
      const batch = availableBatches.find(b => b.batch_no === selectedBatch);
      if (!batch || batch.qty < extraQuantity) {
        showToast(`Insufficient stock in batch ${selectedBatch}. Available: ${batch?.qty || 0}`, 'error');
        return;
      }
    } else if (availableBatches.length > 0) {
      // Show batch selector if no batch selected
      setShowBatchSelector(true);
      return;
    }

    try {
      // Process the quantity extraction
      await api.post('/stocks/add-batch-stock', {
        item_name: editingItem.name,
        batch_no: selectedBatch,
        quantity: extraQuantity
      });
      
      showToast(`Successfully took ${extraQuantity} units`, 'success');
      setShowEditDialog(false);
      setShowBatchSelector(false);
      loadItems(); // Refresh the items list
    } catch (err) {
      console.error('Failed to take quantity:', err);
      showToast('Failed to take quantity', 'error');
    }
  };

  const handleReturnQuantity = async () => {
    const returnQuantity = originalQuantity - editQuantity;
    
    if (returnQuantity <= 0) {
      showToast('No quantity to return', 'error');
      return;
    }

    // Check if batch is selected for return
    if (availableBatches.length > 0 && !selectedBatch) {
      setShowBatchSelector(true);
      return;
    }

    try {
      // Return quantity to stock using the new return endpoint
      await api.post(`/stock-overview/return-stock?item_name=${encodeURIComponent(editingItem.name)}&batch_no=${selectedBatch || 'default'}&quantity=${returnQuantity}`);
      
      showToast(`Successfully returned ${returnQuantity} units to stock`, 'success');
      setShowEditDialog(false);
      setShowBatchSelector(false);
      loadItems(); // Refresh the items list
    } catch (err) {
      console.error('Failed to return quantity:', err);
      showToast('Failed to return quantity', 'error');
    }
  };

  const handleBatchSelection = (batchNo) => {
    setSelectedBatch(batchNo);
    setShowBatchSelector(false);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this item?")) return;
    try {
      await api.delete(`/items/${id}`);
      showToast("Item deactivated successfully", 'success');
      loadItems();
    } catch (err) {
      console.error(err);
      showToast("Failed to deactivate item", 'error');
    }
  };

  // Helper functions to get names from IDs
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "-";
    const category = categories.find(cat => cat.id === parseInt(categoryId));
    return category ? category.name : "-";
  };

  const getSubCategoryName = (subCategoryId) => {
    if (!subCategoryId) return "";
    const subCategory = allSubCategories.find(sub => sub.id === parseInt(subCategoryId));
    return subCategory ? subCategory.name : "";
  };

  // Generate Barcode
const generateBarcode = () => {
  if (!form.item_code) {
    showToast("Item code is required to generate barcode", 'error');
    return;
  }
  const value = `BAR-${form.item_code}`;
  setGeneratedBarcode(value);

  setTimeout(() => {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.border = '1px solid #ccc';
    
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12,
      background: "#ffffff",
      lineColor: "#000000"
    });
    
    const container = document.getElementById("barcodeCanvas");
    if (container) {
      container.innerHTML = '';
      container.appendChild(canvas);
    }
  }, 100);
};

// Generate QR
const generateQR = () => {
  if (!form.item_code) {
    showToast("Item code is required to generate QR", 'error');
    return;
  }
  const value = `QR-${form.item_code}`;
  setGeneratedQR(value);
};

// Print
const printCode = (type) => {
  const content = document.getElementById(type).innerHTML;
  const win = window.open("", "", "width=600,height=400");
  win.document.write(`<html><body>${content}</body></html>`);
  win.document.close();
  win.print();
};

// Download Barcode
const downloadBarcode = () => {
  const container = document.getElementById("barcodeCanvas");
  const canvas = container?.querySelector('canvas');
  
  if (!canvas) {
    showToast("Please generate barcode first", 'error');
    return;
  }
  
  try {
    const link = document.createElement("a");
    link.download = `${form.item_code}-barcode.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error("Download failed:", err);
    showToast("Failed to download barcode", 'error');
  }
};

// Download QR Code
const downloadQR = () => {
  const qrElement = document.querySelector('#qr svg');
  
  if (!qrElement) {
    showToast("Please generate QR code first", 'error');
    return;
  }
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(qrElement);
    const img = new Image();
    
    canvas.width = 120;
    canvas.height = 120;
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement("a");
      link.download = `${form.item_code}-qrcode.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  } catch (err) {
    console.error("QR Download failed:", err);
    showToast("Failed to download QR code", 'error');
  }
};

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="space-y-6">
      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Items List</h2>
              <p className="text-sm text-gray-500 mt-1">All inventory items with their specifications and stock details.</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/app/organization/master-data'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <span>⚙️</span>
                <span>Master Data Setup</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <span>+</span>
                <span>Create Item</span>
              </button>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Levels</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No items found</td></tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500 font-mono">{item.item_code}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getCategoryName(item.category_id)}
                      </span>
                      {getSubCategoryName(item.sub_category_id) && (
                        <div className="text-xs text-gray-500 mt-1">{getSubCategoryName(item.sub_category_id)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.brand || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>Min: {item.min_stock}</div>
                      <div>Max: {item.max_stock}</div>
                      <div className="text-orange-600">Safety: {item.safety_stock || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-green-600 font-medium">₹{item.fixing_price || 0}</div>
                      <div className="text-blue-600">MRP: ₹{item.mrp || 0}</div>
                      <div className="text-orange-600">Tax: {item.tax || 0}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                        <div className="text-xs text-gray-500">{item.item_type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(item.id)}
                          className="text-red-600 hover:text-red-900"
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
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{editingId ? "Edit Item" : "Create New Item"}</h2>
                <button 
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                    <input 
                      name="name" 
                      placeholder="Enter item name" 
                      value={form.name} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Code / SKU *</label>
                    <input 
                      name="item_code" 
                      placeholder="Enter unique item code" 
                      value={form.item_code} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea 
                    name="description" 
                    placeholder="Item description" 
                    value={form.description} 
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Classification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select 
                      name="category" 
                      value={form.category} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                      Loaded: {categories.length} categories
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label>
                    <select 
                      name="sub_category" 
                      value={form.sub_category} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!form.category}
                    >
                      <option value="">Select Sub Category</option>
                      {subCategories.map(subCat => (
                        <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                      Available: {subCategories.length} subcategories
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                    <select 
                      name="brand" 
                      value={form.brand} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Brand</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.brand_name}>{brand.brand_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                    <input 
                      name="manufacturer" 
                      placeholder="Manufacturer name" 
                      value={form.manufacturer} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Inventory Settings */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Inventory Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Type *</label>
                    <select 
                      name="item_type" 
                      value={form.item_type} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Item Type</option>
                      <option value="consumable">Consumable</option>
                      <option value="non_consumable">Non-Consumable</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock</label>
                    <input 
                      type="number" 
                      name="min_stock" 
                      placeholder="0" 
                      value={form.min_stock} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock</label>
                    <input 
                      type="number" 
                      name="max_stock" 
                      placeholder="0" 
                      value={form.max_stock} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Safety Stock</label>
                    <input 
                      type="number" 
                      name="safety_stock" 
                      placeholder="0" 
                      value={form.safety_stock} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fixing Price</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="fixing_price" 
                      placeholder="0" 
                      value={form.fixing_price} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">MRP</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="mrp" 
                      placeholder="0" 
                      value={form.mrp} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="tax" 
                      placeholder="0" 
                      value={form.tax} 
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Additional Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name="has_expiry" 
                      checked={form.has_expiry} 
                      onChange={handleChange}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Has Expiry Date</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name="has_warranty" 
                      checked={form.has_warranty} 
                      onChange={handleChange}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Has Warranty</span>
                  </label>
                </div>
                
                {form.has_expiry && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Manufacture Date</label>
                      <input 
                        type="date" 
                        name="manufacture_date" 
                        value={form.manufacture_date} 
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                      <input 
                        type="date" 
                        name="expiry_date" 
                        value={form.expiry_date} 
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
                
                {form.has_warranty && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Period</label>
                      <input 
                        type="number" 
                        name="warranty_period" 
                        placeholder="0"
                        min="0"
                        value={form.warranty_period} 
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Period Type</label>
                      <select 
                        name="warranty_period_type" 
                        value={form.warranty_period_type} 
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Identification */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Identification</h3>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={generateBarcode}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Create Barcode
                  </button>

                  <button
                    onClick={generateQR}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Create QR Code
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {generatedBarcode && (
                    <div className="border rounded-xl p-4 text-center bg-slate-50">
                      <div id="barcodeCanvas" style={{minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      </div>
                      <div className="flex justify-center gap-4 mt-3">
                        <button
                          onClick={() => printCode("barcodeCanvas")}
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          🖨 Print
                        </button>
                        <button
                          onClick={downloadBarcode}
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          ⬇ Download
                        </button>
                      </div>
                    </div>
                  )}

                  {generatedQR && (
                    <div className="border rounded-xl p-4 text-center bg-slate-50">
                      <div id="qr">
                        <QRCode value={generatedQR} size={120} />
                        <div className="text-xs mt-2 text-slate-500">{generatedQR}</div>
                      </div>
                      <div className="flex justify-center gap-4 mt-3">
                        <button
                          onClick={() => printCode("qr")}
                          className="text-sm text-purple-600 hover:underline"
                        >
                          🖨 Print
                        </button>
                        <button
                          onClick={downloadQR}
                          className="text-sm text-purple-600 hover:underline"
                        >
                          ⬇ Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 justify-end">
                <button 
                  onClick={resetForm} 
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingId ? "Update Item" : "Create Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Quantity Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name</label>
                <input 
                  type="text" 
                  value={editingItem?.name || ''} 
                  disabled 
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              {availableBatches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Number</label>
                  <select 
                    value={selectedBatch} 
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select Batch</option>
                    {availableBatches.map((batch, idx) => (
                      <option key={idx} value={batch.batch_no}>
                        {batch.batch_no} (Available: {batch.qty})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Batch number cannot be modified</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input 
                  type="number" 
                  value={editQuantity} 
                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editQuantity - originalQuantity > 0 ? 
                    `+${editQuantity - originalQuantity} from original (${originalQuantity})` :
                    editQuantity - originalQuantity < 0 ?
                    `${editQuantity - originalQuantity} from original (${originalQuantity})` :
                    `No change from original (${originalQuantity})`
                  }
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select disabled className="w-full p-2 border rounded bg-gray-100">
                  <option>Approved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Rate</label>
                <input 
                  type="number" 
                  value={editingItem?.fixing_price || 0} 
                  disabled 
                  className="w-full p-2 border rounded bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Rate cannot be modified</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={editingItem?.tax || 0} 
                  disabled 
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm">
                  <div>Subtotal: ₹{((editingItem?.fixing_price || 0) * editQuantity).toFixed(2)}</div>
                  <div>Tax ({(editingItem?.tax || 0)}/unit × {editQuantity}): ₹{((editingItem?.tax || 0) * editQuantity / 100).toFixed(2)}</div>
                  <div className="font-semibold">Total: ₹{((editingItem?.fixing_price || 0) * editQuantity + (editingItem?.tax || 0) * editQuantity / 100).toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button 
                onClick={handleTakeQuantity}
                disabled={editQuantity <= originalQuantity}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                Take
              </button>
              
              <button 
                onClick={handleReturnQuantity}
                disabled={editQuantity >= originalQuantity}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                Return {originalQuantity - editQuantity > 0 ? originalQuantity - editQuantity : ''}
              </button>
              
              <button 
                onClick={() => {
                  // Save without taking or returning
                  setShowEditDialog(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Selector Dialog */}
      {showBatchSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Select Batch</h3>
            <div className="space-y-2">
              {availableBatches.map((batch, idx) => (
                <button
                  key={idx}
                  onClick={() => handleBatchSelection(batch.batch_no)}
                  className="w-full p-3 text-left border rounded hover:bg-gray-50"
                >
                  <div className="font-medium">{batch.batch_no}</div>
                  <div className="text-sm text-gray-500">Available: {batch.qty}</div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowBatchSelector(false)}
              className="w-full mt-4 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      </div>
    </>
  );
}
