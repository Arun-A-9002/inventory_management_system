import React, { useState, useEffect } from 'react';
import api from '../../api';
import { hasPermission } from '../../utils/permissions';

export default function DamagedReturns() {
  const [damagedItems, setDamagedItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [filters, setFilters] = useState({
    search: '',
    timePeriod: ''
  });

  useEffect(() => {
    if (hasPermission("damaged_returns.view")) {
      loadDamagedReturns();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [damagedItems, filters]);

  const loadDamagedReturns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/external-transfers/damaged-returns');
      setDamagedItems(response.data || []);
    } catch (err) {
      console.error('Failed to load damaged returns:', err);
      showMessage('Failed to load damaged returns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...damagedItems];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.staff_name.toLowerCase().includes(searchLower) ||
        item.item_name.toLowerCase().includes(searchLower) ||
        item.transfer_no.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.timePeriod) {
      const now = new Date();
      let startDate;
      
      switch (filters.timePeriod) {
        case '1day':
          startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          break;
        case '1week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filtered = filtered.filter(item => 
          item.returned_at && new Date(item.returned_at) >= startDate
        );
      }
    }
    
    setFilteredItems(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      timePeriod: ''
    });
  };

  const handlePrint = () => {
    if (!hasPermission("damaged_returns.print")) {
      showMessage("Permission denied", "error");
      return;
    }
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintContent = () => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Damaged Returns Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { color: #dc2626; margin: 0; }
            .header p { margin: 5px 0; color: #666; }
            .summary { background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .filters { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .filters h3 { margin-top: 0; color: #374151; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .damaged-qty { background: #fecaca; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⚠️ Damaged Returns Report</h1>
            <p>Track all damaged items returned from external transfers</p>
            <p>Generated on: ${currentDate} at ${currentTime}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Damaged Items:</strong> ${filteredItems.length}</p>
            <p><strong>Total Damaged Quantity:</strong> ${filteredItems.reduce((sum, item) => sum + item.damaged_quantity, 0)}</p>
          </div>
          
          ${Object.values(filters).some(f => f) ? `
            <div class="filters">
              <h3>Applied Filters</h3>
              ${filters.search ? `<p><strong>Search:</strong> ${filters.search}</p>` : ''}
              ${filters.timePeriod ? `<p><strong>Time Period:</strong> ${filters.timePeriod === '1day' ? 'Last 1 Day' : filters.timePeriod === '1week' ? 'Last 1 Week' : filters.timePeriod === '1month' ? 'Last 1 Month' : 'Last 1 Year'}</p>` : ''}
            </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th>Transfer No</th>
                <th>Item Details</th>
                <th>Staff Details</th>
                <th>Damaged Qty</th>
                <th>Damage Reason</th>
                <th>Return Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map(item => `
                <tr>
                  <td>
                    <strong>${item.transfer_no}</strong><br>
                    <small>ID: ${item.transfer_id}</small>
                  </td>
                  <td>
                    <strong>${item.item_name}</strong><br>
                    <small>Batch: ${item.batch_no}</small><br>
                    <small>Location: ${item.location}</small>
                  </td>
                  <td>
                    <strong>${item.staff_name}</strong><br>
                    <small>ID: ${item.staff_id}</small><br>
                    <small>${item.staff_location}</small>
                  </td>
                  <td>
                    <span class="damaged-qty">${item.damaged_quantity}</span>
                  </td>
                  <td>${item.damage_reason || 'No reason provided'}</td>
                  <td>${item.returned_at ? new Date(item.returned_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This report was generated automatically by the Inventory Management System</p>
          </div>
        </body>
      </html>
    `;
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Check if user has permission to view damaged returns */}
      {!hasPermission("damaged_returns.view") ? (
        <div className="p-6">
          <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view Damaged Returns.</p>
            <p className="text-sm text-gray-500 mt-2">Please contact your administrator to request access.</p>
          </div>
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Damaged Returns</h1>
                <p className="text-xs text-gray-600">Track damaged items from external transfers</p>
              </div>
              <div className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
                <span className="text-xs font-semibold text-red-700">⚠️ {filteredItems.length}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-3 py-1 text-xs bg-white/80 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 w-40"
              />
              <select
                value={filters.timePeriod}
                onChange={(e) => handleFilterChange('timePeriod', e.target.value)}
                className="px-3 py-1 text-xs bg-white/80 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Time</option>
                <option value="1day">1 Day</option>
                <option value="1week">1 Week</option>
                <option value="1month">1 Month</option>
                <option value="1year">1 Year</option>
              </select>
              {(filters.search || filters.timePeriod) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  Clear
                </button>
              )}
              {hasPermission("damaged_returns.print") && (
              <button
                onClick={handlePrint}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mx-8 mt-6 p-4 rounded-2xl ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.text}
        </div>
      )}



      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8 pt-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading damaged returns...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No damaged returns found</h3>
              <p className="text-gray-600">
                {Object.values(filters).some(f => f) ? 'Try adjusting your filters' : 'All returned items are in good condition'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-8">
              {filteredItems.map((item, index) => (
                <div key={index} className="bg-white/80 rounded-2xl border border-gray-200/50 p-6 hover:shadow-md transition-all duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-center">
                    <div className="lg:col-span-1">
                      <div className="font-semibold text-gray-900 text-lg">{item.transfer_no}</div>
                      <div className="text-sm text-gray-500">ID: {item.transfer_id}</div>
                    </div>
                    <div className="lg:col-span-2">
                      <div className="font-medium text-gray-900 mb-1">{item.item_name}</div>
                      <div className="text-sm text-gray-600">Batch: {item.batch_no}</div>
                      <div className="text-xs text-gray-500">Location: {item.location}</div>
                    </div>
                    <div className="lg:col-span-1">
                      <div className="font-medium text-gray-900 mb-1">{item.staff_name}</div>
                      <div className="text-sm text-gray-600">ID: {item.staff_id}</div>
                      <div className="text-xs text-gray-500">{item.staff_location}</div>
                    </div>
                    <div className="lg:col-span-1 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 text-red-700 rounded-full font-bold text-lg">
                        {item.damaged_quantity}
                      </div>
                    </div>
                    <div className="lg:col-span-1">
                      <div className="text-sm text-gray-600 mb-2">{item.damage_reason || 'No reason provided'}</div>
                      <div className="text-xs text-gray-500">
                        {item.returned_at ? new Date(item.returned_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}