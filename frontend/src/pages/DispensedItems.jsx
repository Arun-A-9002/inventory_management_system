import React, { useState, useEffect } from 'react';
import api from '../api';

export default function DispensedItems() {
  const [dispensedItems, setDispensedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDispensedItems();
  }, []);

  const fetchDispensedItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/consumption/dispensed-items');
      setDispensedItems(response.data);
    } catch (error) {
      console.error('Error fetching dispensed items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = dispensedItems.filter(item => {
    return item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.issue_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (item.department && item.department.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'DEPARTMENT': return 'bg-blue-100 text-blue-800';
      case 'PROJECT': return 'bg-green-100 text-green-800';
      case 'EXTERNAL': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemTypeColor = (type) => {
    return type === 'CONSUMABLE' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispensed Items</h1>
          <p className="text-gray-600 mt-1">Track all items that have been issued from inventory</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <input
          type="text"
          placeholder="Search by item name, issue number, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dispensed items found</h3>
            <p className="text-gray-500">No items match your current search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispensed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.issue_no}</div>
                        <div className="text-sm text-gray-500">
                          {item.requested_by && `By: ${item.requested_by}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.batch_no && (
                            <span className="text-xs text-gray-500">Batch: {item.batch_no}</span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getItemTypeColor(item.item_type)}`}>
                            {item.item_type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.qty} {item.uom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.issue_type)}`}>
                        {item.issue_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {item.issue_type === 'DEPARTMENT' && item.department}
                        {item.issue_type === 'PROJECT' && item.project_code}
                        {item.issue_type === 'EXTERNAL' && item.external_ref}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.user_name || 'System'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.issue_date}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {!loading && filteredItems.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Showing {filteredItems.length} dispensed items</span>
            <span>Total quantity: {filteredItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}