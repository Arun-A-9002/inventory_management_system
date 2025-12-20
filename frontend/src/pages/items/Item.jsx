import { useEffect, useState } from "react";
import api from "../../api";
import QRCode from "react-qr-code";
import JsBarcode from "jsbarcode";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";

export default function Item() {
  const [items, setItems] = useState([]);
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [uoms, setUoms] = useState([]);
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
    uom: "",
    min_stock: 0,
    max_stock: 0,
    fixing_price: 0,
    mrp: 0,
    tax: 0,
    is_batch_managed: false,
    has_expiry: false,
    expiry_date: "",
    has_warranty: false,
    warranty_start_date: "",
    warranty_end_date: "",
    barcode: "",
    qr_code: "",
    is_active: true
  });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadItems();
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [categoriesRes, brandsRes, uomsRes, subCategoriesRes] = await Promise.all([
        api.get("/category/"),
        api.get("/brand/"),
        api.get("/uom/"),
        api.get("/subcategory/")
      ]);
      
      console.log("Categories loaded:", categoriesRes.data);
      console.log("Brands loaded:", brandsRes.data);
      console.log("UOMs loaded:", uomsRes.data);
      console.log("Subcategories loaded:", subCategoriesRes.data);
      
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
      setUoms(uomsRes.data || []);
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
      uom: "",
      min_stock: 0,
      max_stock: 0,
      fixing_price: 0,
      mrp: 0,
      tax: 0,
      is_batch_managed: false,
      has_expiry: false,
      expiry_date: "",
      has_warranty: false,
      warranty_start_date: "",
      warranty_end_date: "",
      barcode: "",
      qr_code: "",
      is_active: true
    });
    setEditingId(null);
    setSubCategories([]);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.item_code) {
      showToast("Item name and code are required", 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        category: form.category ? String(form.category) : null,
        sub_category: form.sub_category ? String(form.sub_category) : null,
        expiry_date: form.expiry_date || null,
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
      uom: item.uom || "",
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      fixing_price: item.fixing_price || 0,
      mrp: item.mrp || 0,
      tax: item.tax || 0,
      is_batch_managed: item.is_batch_managed,
      has_expiry: item.has_expiry,
      expiry_date: item.expiry_date || "",
      has_warranty: item.has_warranty || false,
      warranty_start_date: item.warranty_start_date || "",
      warranty_end_date: item.warranty_end_date || "",
      barcode: item.barcode || "",
      qr_code: item.qr_code || "",
      is_active: item.is_active !== undefined ? item.is_active : true
    });
    
    // Load subcategories for selected category
    if (item.category_id) {
      loadSubCategories(item.category_id);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 p-6 text-white shadow-md">
          <div className="text-sm uppercase opacity-80">Inventory Management</div>
          <h1 className="text-3xl font-semibold mt-2">Item Master</h1>
          <p className="mt-2 opacity-90">Manage your inventory items and their details.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT — CREATE / EDIT FORM */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">{editingId ? "Edit Item" : "Create New Item"}</h2>
            
            {/* Basic Information */}
            <div className="space-y-4">
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
                  {/* Debug info */}
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
                  {/* Debug info */}
                  <div className="text-xs text-gray-500 mt-1">
                    Available: {subCategories.length} subcategories
                    {form.category && ` for category ${form.category}`}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
                  <select 
                    name="uom" 
                    value={form.uom} 
                    onChange={handleChange}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select UOM</option>
                    {uoms.map(uom => (
                      <option key={uom.id} value={uom.name}>{uom.name}</option>
                    ))}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fixing Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="fixing_price" 
                    placeholder="0.00" 
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
                    placeholder="0.00" 
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
                    placeholder="0.00" 
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
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="is_batch_managed" 
                    checked={form.is_batch_managed} 
                    onChange={handleChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Batch Managed</span>
                </label>
                
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
                
                {form.has_expiry && (
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
                )}
                
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
                
                {form.has_warranty && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Start Date</label>
                      <input 
                        type="date" 
                        name="warranty_start_date" 
                        value={form.warranty_start_date} 
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Warranty End Date</label>
                      <input 
                        type="date" 
                        name="warranty_end_date" 
                        value={form.warranty_end_date} 
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

           {/* Identification */}
<div className="mt-6">
  <h3 className="text-lg font-medium mb-3">Identification</h3>

  {/* ACTION BUTTONS */}
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

  {/* DISPLAY AREA */}
  <div className="grid grid-cols-2 gap-6">
    
    {/* BARCODE */}
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

    {/* QR CODE */}
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
            <div className="mt-6 flex gap-3">
              <button 
                onClick={handleSubmit} 
                className="flex-1 rounded-full bg-purple-600 text-white px-6 py-2 hover:bg-purple-700 transition-colors"
              >
                {editingId ? "Update Item" : "Create Item"}
              </button>
              {editingId && (
                <button 
                  onClick={resetForm} 
                  className="rounded-full border border-gray-300 px-6 py-2 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — ITEMS LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Items List</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">#</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Brand</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">UOM</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Fixing Price</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">MRP</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Tax (%)</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} className="border border-gray-300 px-4 py-6 text-center">Loading...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={11} className="border border-gray-300 px-4 py-6 text-center text-slate-500">No items found</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="border border-gray-300 px-4 py-2">{idx + 1}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-slate-500">{item.description}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{item.item_code}</span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="text-sm">{item.category || "-"}</div>
                          {item.sub_category && (
                            <div className="text-xs text-slate-500">{item.sub_category}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">{item.brand || "-"}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.uom || "-"}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="text-sm font-medium text-green-600">
                            ₹{item.fixing_price || 0}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="text-sm font-medium text-blue-600">
                            ₹{item.mrp || 0}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="text-sm font-medium text-orange-600">
                            {item.tax || 0}%
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEdit(item)} 
                              className="text-sm px-3 py-1 rounded border hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeactivate(item.id)} 
                              className="text-sm px-3 py-1 rounded border text-red-600 hover:bg-red-50"
                            >
                              Deactivate
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
      
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
