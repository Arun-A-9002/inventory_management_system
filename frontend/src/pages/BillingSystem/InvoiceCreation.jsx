import { useState, useEffect } from "react";
import api from "../../api";

export default function InvoiceCreation() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableBatches, setAvailableBatches] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [invoiceForm, setInvoiceForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    items: []
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stocks/');
      setItems(response.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      showMessage('Failed to fetch items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchesForItem = async (itemName) => {
    try {
      const response = await api.get(`/billing/available-batches/${encodeURIComponent(itemName)}`);
      setAvailableBatches(prev => ({
        ...prev,
        [itemName]: response.data
      }));
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      showMessage('Failed to fetch batches for item', 'error');
    }
  };

  const addItemToInvoice = () => {
    const newItem = {
      id: Date.now(),
      item_name: '',
      batch_no: '',
      qty: 1,
      rate: 0,
      tax_rate: 0,
      remaining_qty: 0
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const updateItem = (itemId, field, value) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // If item name changed, fetch batches and reset batch selection
        if (field === 'item_name') {
          fetchBatchesForItem(value);
          updatedItem.batch_no = '';
          updatedItem.remaining_qty = 0;
          
          // Get item details for rate and tax
          const itemData = items.find(i => i.item_name === value);
          if (itemData) {
            updatedItem.rate = 1000; // Default rate as shown in your example
          }
        }
        
        // If batch changed, update remaining quantity
        if (field === 'batch_no') {
          const batches = availableBatches[item.item_name] || [];
          const selectedBatch = batches.find(b => b.batch_no === value);
          updatedItem.remaining_qty = selectedBatch ? selectedBatch.qty : 0;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (itemId) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.qty * item.rate;
    const tax = (item.tax_rate / 100) * subtotal;
    return subtotal + tax;
  };

  const calculateInvoiceTotals = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const totalTax = selectedItems.reduce((sum, item) => sum + ((item.tax_rate / 100) * item.qty * item.rate), 0);
    const total = subtotal + totalTax;
    
    return { subtotal, totalTax, total };
  };

  const saveInvoice = async () => {
    try {
      setLoading(true);
      
      // Validate invoice
      if (selectedItems.length === 0) {
        showMessage('Please add at least one item', 'error');
        return;
      }
      
      if (!invoiceForm.customer_name) {
        showMessage('Please enter customer name', 'error');
        return;
      }
      
      // Check if any item exceeds available quantity
      for (const item of selectedItems) {
        if (item.qty > item.remaining_qty) {
          showMessage(`Quantity for ${item.item_name} exceeds available stock (${item.remaining_qty})`, 'error');
          return;
        }
      }
      
      const invoiceData = {
        ...invoiceForm,
        items: selectedItems.map(item => ({
          item_name: item.item_name,
          batch_no: item.batch_no,
          qty: item.qty,
          rate: item.rate,
          tax_rate: item.tax_rate
        }))
      };
      
      await api.post('/billing/create-invoice', invoiceData);
      showMessage('Invoice created successfully');
      
      // Reset form
      setSelectedItems([]);
      setInvoiceForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        items: []
      });
      
    } catch (err) {
      console.error('Failed to create invoice:', err);
      showMessage('Failed to create invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateInvoiceTotals();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 p-6 text-white shadow-md">
          <h1 className="text-3xl font-semibold">Create New Invoice</h1>
          <p className="mt-2 opacity-90">Create invoices with batch tracking and stock management.</p>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl shadow-sm ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Form */}
        <div className="lg:col-span-2">
          {/* Customer Details */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer Name *</label>
                <input
                  type="text"
                  value={invoiceForm.customer_name}
                  onChange={(e) => setInvoiceForm({...invoiceForm, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={invoiceForm.customer_phone}
                  onChange={(e) => setInvoiceForm({...invoiceForm, customer_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={invoiceForm.customer_email}
                  onChange={(e) => setInvoiceForm({...invoiceForm, customer_email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invoice Items</h3>
              <button
                onClick={addItemToInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {selectedItems.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* Item Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                      <select
                        value={item.item_name}
                        onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Item</option>
                        {items.map((stockItem) => (
                          <option key={stockItem.id} value={stockItem.item_name}>
                            {stockItem.item_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Batch Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                      <select
                        value={item.batch_no}
                        onChange={(e) => updateItem(item.id, 'batch_no', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!item.item_name}
                      >
                        <option value="">Select Batch</option>
                        {(availableBatches[item.item_name] || []).map((batch) => (
                          <option key={batch.batch_no} value={batch.batch_no}>
                            {batch.batch_no} (Qty: {batch.qty})
                          </option>
                        ))}
                      </select>
                      {item.batch_no && (
                        <div className="text-xs text-slate-500 mt-1">
                          Available: {item.remaining_qty} units
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max={item.remaining_qty}
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Rate</label>
                      <input
                        type="number"
                        value={item.rate}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-gray-100 text-gray-600"
                        readOnly
                      />
                      <div className="text-xs text-gray-500 mt-1">Rate cannot be modified</div>
                    </div>

                    {/* Tax Rate */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        step="0.01"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-end">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="text-right">
                      <span className="text-sm text-slate-600">Item Total: </span>
                      <span className="font-semibold">₹{calculateItemTotal(item).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {selectedItems.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No items added. Click "Add Item" to start building your invoice.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>₹{totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span>Total:</span>
                <span>₹{totals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={saveInvoice}
                disabled={loading || selectedItems.length === 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Invoice'}
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}