import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../utils/useToast';

export default function ExternalTransfer() {
  const [transfers, setTransfers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    external_location: '',
    return_date: ''
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadTransfers();
    loadItems();
  }, []);

  const loadTransfers = async () => {
    try {
      const response = await api.get('/external-transfers');
      setTransfers(response.data);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  };

  const loadItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.external_location || !form.return_date || selectedItems.length === 0) {
      showToast('All fields and at least one item are required', 'error');
      return;
    }

    try {
      await api.post('/external-transfers', {
        ...form,
        items: selectedItems
      });
      showToast('External transfer created successfully', 'success');
      resetForm();
      loadTransfers();
    } catch (err) {
      console.error(err);
      showToast('Failed to create transfer', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', external_location: '', return_date: '' });
    setSelectedItems([]);
    setShowCreateModal(false);
  };

  const handleItemSelect = (item) => {
    const exists = selectedItems.find(selected => selected.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId ? { ...item, quantity: parseInt(quantity) || 1 } : item
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">External Transfer</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          New Transfer
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">External Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transfers.map((transfer) => (
              <tr key={transfer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.external_location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.return_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.items?.length || 0} items</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New External Transfer</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External Location</label>
                <input
                  type="text"
                  value={form.external_location}
                  onChange={(e) => setForm({...form, external_location: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                <input
                  type="date"
                  value={form.return_date}
                  onChange={(e) => setForm({...form, return_date: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Select Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Available Items</h4>
                  <div className="border rounded max-h-60 overflow-y-auto">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedItems.find(selected => selected.id === item.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">Code: {item.item_code}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Selected Items</h4>
                  <div className="border rounded max-h-60 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="p-3 border-b">
                        <div className="font-medium">{item.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <label className="text-sm">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => handleItemSelect(item)}
                            className="text-red-500 text-sm hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}