import React, { useState, useEffect } from "react";
import api from "../../api";

export default function StockOverview() {
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState({});
  const [dispenseQuantities, setDispenseQuantities] = useState({});
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [filters, setFilters] = useState({
    item: '',
    location: '',
    status: '',
    batch: '',
    expiry: '',
    stockLevel: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    items: [],
    locations: [],
    batches: [],
    status_options: [],
    expiry_options: [],
    stock_level_options: []
  });

  useEffect(() => {
    fetchStockData();
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get("/stocks/filter-options");
      setFilterOptions(response.data);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  useEffect(() => {
    // Check for expired items after data is loaded
    if (filteredData.length > 0) {
      const expiredItems = filteredData.filter(item => getExpiredBatches(item.batches).length > 0);
      if (expiredItems.length > 0) {
        setShowExpiredModal(true);
      }
    }
  }, [filteredData]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stock-overview/');
      console.log('Stock data received:', response.data);
      setStockData(response.data);
      setFilteredData(response.data);
    } catch (err) {
      setError("Failed to fetch stock data");
      console.error("Error fetching stock data:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...stockData];

    if (filters.item) {
      filtered = filtered.filter(item => 
        item.item_name === filters.item
      );
    }

    if (filters.location) {
      filtered = filtered.filter(item => 
        item.location === filters.location
      );
    }

    if (filters.status) {
      filtered = filtered.filter(item => {
        const hasExpiredBatches = getExpiredBatches(item.batches).length > 0;
        const isLowStock = item.available_qty <= item.min_stock;
        
        switch (filters.status) {
          case 'expired':
            return hasExpiredBatches;
          case 'low_stock':
            return isLowStock && !hasExpiredBatches;
          case 'good':
            return !hasExpiredBatches && !isLowStock;
          default:
            return true;
        }
      });
    }

    if (filters.batch) {
      filtered = filtered.filter(item => 
        item.batches && item.batches.some(batch => 
          batch.batch_no === filters.batch
        )
      );
    }

    if (filters.expiry) {
      const today = new Date();
      filtered = filtered.filter(item => {
        if (!item.batches) return false;
        
        return item.batches.some(batch => {
          if (!batch.expiry_date || batch.expiry_date === "—") return false;
          
          const parts = batch.expiry_date.split('/');
          if (parts.length !== 3) return false;
          
          const expiry = new Date(parts[2], parts[1] - 1, parts[0]);
          const daysDiff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          
          switch (filters.expiry) {
            case 'expired':
              return daysDiff < 0;
            case 'expiring_soon':
              return daysDiff >= 0 && daysDiff <= 30;
            case 'expiring_3months':
              return daysDiff > 30 && daysDiff <= 90;
            default:
              return true;
          }
        });
      });
    }

    if (filters.stockLevel) {
      filtered = filtered.filter(item => {
        switch (filters.stockLevel) {
          case 'zero':
            return item.available_qty === 0;
          case 'low':
            return item.available_qty > 0 && item.available_qty <= item.min_stock;
          case 'normal':
            return item.available_qty > item.min_stock;
          default:
            return true;
        }
      });
    }

    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setFilters({
      item: '',
      location: '',
      status: '',
      batch: '',
      expiry: '',
      stockLevel: ''
    });
    setFilteredData(stockData);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const exportToCSV = () => {
    const headers = ['Item Name', 'Item Code', 'Location', 'Available Qty', 'Min Stock', 'Status', 'Batch No', 'Expiry Date'];
    const csvData = filteredData.map(item => {
      const hasExpiredBatches = getExpiredBatches(item.batches).length > 0;
      const isLowStock = item.available_qty <= item.min_stock;
      const status = hasExpiredBatches ? 'Has Expired Batches' : (isLowStock ? 'Low Stock' : 'Good');
      
      return [
        item.item_name,
        item.item_code,
        item.location,
        item.available_qty,
        item.min_stock,
        status,
        item.batches && item.batches.length > 0 ? item.batches[0].batch_no : '—',
        item.batches && item.batches.length > 0 ? item.batches[0].expiry_date || '—' : '—'
      ];
    });
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_overview_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, stockData]);

  const handleBatchChange = (itemId, batchIndex) => {
    setSelectedBatches(prev => ({
      ...prev,
      [itemId]: batchIndex === "" ? null : batchIndex
    }));
  };

  const getSelectedBatch = (item) => {
    const selectedIndex = selectedBatches[item.id];
    if (selectedIndex === null || selectedIndex === undefined) return null;
    return item.batches && item.batches.length > 0 ? item.batches[selectedIndex] : null;
  };

  const getDisplayQuantity = (item) => {
    const selectedBatch = getSelectedBatch(item);
    return selectedBatch ? selectedBatch.qty : item.available_qty;
  };

  const getStatusColor = (qty, minStock) => {
    if (qty <= minStock) {
      return "text-red-600 bg-red-100";
    }
    return "text-green-600 bg-green-100";
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate || expiryDate === "—") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    // Handle DD/MM/YYYY format
    const parts = expiryDate.split('/');
    if (parts.length === 3) {
      const expiry = new Date(parts[2], parts[1] - 1, parts[0]); // Year, Month (0-indexed), Day
      return expiry < today;
    }
    return false;
  };

  const getExpiredBatches = (batches) => {
    if (!batches) return [];
    return batches.filter(batch => isExpired(batch.expiry_date));
  };

  const getTotalExpiredQty = (batches) => {
    return getExpiredBatches(batches).reduce((total, batch) => total + batch.qty, 0);
  };

  const handleDispenseQuantityChange = (itemId, quantity) => {
    setDispenseQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleDispense = async (item) => {
    const selectedBatchIndex = selectedBatches[item.id];
    const quantity = parseInt(dispenseQuantities[item.id] || 0);
    
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    if (selectedBatchIndex === null || selectedBatchIndex === undefined) {
      alert('Please select a batch');
      return;
    }
    
    const selectedBatch = item.batches[selectedBatchIndex];
    
    try {
      // Call dispense-batch endpoint to completely remove the batch
      const response = await api.post('/consumption/dispense-batch', {
        item_name: item.item_name,
        quantity: selectedBatch.qty, // Dispense entire batch
        batch_no: selectedBatch.batch_no,
        location: selectedBatch.location || item.location,
        status: 'dispensed'
      });
      
      setDispenseQuantities(prev => ({ ...prev, [item.id]: '' }));
      setSelectedBatches(prev => ({ ...prev, [item.id]: null }));
      
      fetchStockData();
      
      alert(`Successfully dispensed entire batch ${selectedBatch.batch_no} (${selectedBatch.qty} units)`);
    } catch (err) {
      console.error('Dispense error:', err);
      alert('Failed to dispense stock: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDispenseExpired = async (item) => {
    const expiredBatches = getExpiredBatches(item.batches);
    if (expiredBatches.length === 0) {
      alert('No expired batches to dispense');
      return;
    }
    
    const quantity = parseInt(dispenseQuantities[item.id] || 0);
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    // Find the first expired batch with sufficient quantity
    let targetBatchIndex = -1;
    for (let i = 0; i < item.batches.length; i++) {
      if (isExpired(item.batches[i].expiry_date) && item.batches[i].qty >= quantity) {
        targetBatchIndex = i;
        break;
      }
    }
    
    if (targetBatchIndex === -1) {
      alert('No expired batch has sufficient quantity');
      return;
    }
    
    try {
      const response = await api.post(`/stock-overview/dispense/${item.id}?batch_index=${targetBatchIndex}&quantity=${quantity}`);
      
      setDispenseQuantities(prev => ({ ...prev, [item.id]: '' }));
      fetchStockData();
      
      alert(`Successfully dispensed ${quantity} units from expired batch`);
    } catch (err) {
      console.error('Dispense expired error:', err);
      alert('Failed to dispense expired stock: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Stock Overview</h1>
        
        {/* Dashboard Cards - Loading State */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Stock Overview</h1>
        
        {/* Dashboard Cards - Error State */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center text-gray-500">—</div>
            </div>
          ))}
        </div>
        
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Expired Items Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg sm:text-xl font-bold text-red-800">Expired Items Alert!</h2>
            </div>
            <p className="text-gray-700 mb-4 text-sm sm:text-base">
              You have {filteredData.filter(item => getExpiredBatches(item.batches).length > 0).length} items with expired batches. 
              Please dispense expired items first before continuing other work.
            </p>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowExpiredModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
              >
                Later
              </button>
              <button
                onClick={() => setShowExpiredModal(false)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Dispense Now
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Stock Overview</h1>
      
      {/* Filter Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.item}
              onChange={(e) => handleFilterChange('item', e.target.value)}
            >
              <option value="">All Items</option>
              {filterOptions.items.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="">All Locations</option>
              {filterOptions.locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {filterOptions.status_options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.batch}
              onChange={(e) => handleFilterChange('batch', e.target.value)}
            >
              <option value="">All Batches</option>
              {filterOptions.batches.map(batch => (
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Status</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.expiry}
              onChange={(e) => handleFilterChange('expiry', e.target.value)}
            >
              <option value="">All Expiry Status</option>
              {filterOptions.expiry_options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Level</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.stockLevel}
              onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
            >
              <option value="">All Stock Levels</option>
              {filterOptions.stock_level_options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
          <button
            onClick={() => handleFilterChange('status', 'expired')}
            className={`px-3 py-1 rounded text-xs font-medium ${
              filters.status === 'expired' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Expired Items
          </button>
          <button
            onClick={() => handleFilterChange('status', 'low_stock')}
            className={`px-3 py-1 rounded text-xs font-medium ${
              filters.status === 'low_stock' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => handleFilterChange('expiry', 'expiring_soon')}
            className={`px-3 py-1 rounded text-xs font-medium ${
              filters.expiry === 'expiring_soon' 
                ? 'bg-orange-600 text-white' 
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            Expiring Soon
          </button>
          <button
            onClick={() => handleFilterChange('stockLevel', 'zero')}
            className={`px-3 py-1 rounded text-xs font-medium ${
              filters.stockLevel === 'zero' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Zero Stock
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredData.length} of {stockData.length} items
        </div>
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-blue-600 truncate">Total Items</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-800">{filteredData.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-green-600 truncate">Good Stock</p>
              <p className="text-lg sm:text-2xl font-bold text-green-800">{filteredData.filter(item => item.available_qty > item.min_stock).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-yellow-600 truncate">Low Stock</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-800">{filteredData.filter(item => item.available_qty <= item.min_stock).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-red-600 truncate">Expired</p>
              <p className="text-lg sm:text-2xl font-bold text-red-800">{filteredData.filter(item => getExpiredBatches(item.batches).length > 0).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-purple-600 truncate">Add New</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-800">+</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Item</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Available Qty</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Min Stock</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Expired Batches</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Batch Number</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Expiry</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => {
              console.log(`Rendering item: ${item.item_name}, batches:`, item.batches);
              const selectedBatch = getSelectedBatch(item);
              const displayQty = getDisplayQuantity(item);
              const expiredBatches = getExpiredBatches(item.batches);
              const expiredQty = getTotalExpiredQty(item.batches);
              const hasExpiredBatches = expiredBatches.length > 0;
              const stockStatus = displayQty <= item.min_stock ? "Low Stock" : "Good";
              const status = hasExpiredBatches ? "Expired" : stockStatus;
              const batchStatus = selectedBatch && isExpired(selectedBatch.expiry_date) ? "Expired" : status;
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b">
                    <div>
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-500">{item.item_code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">{item.location}</td>
                  <td className="px-4 py-3 border-b text-gray-700">{displayQty}</td>
                  <td className="px-4 py-3 border-b text-gray-700">{item.min_stock}</td>
                  <td className="px-4 py-3 border-b">
                    {hasExpiredBatches ? (
                      <div className="text-red-600">
                        <div className="font-medium">{expiredBatches.length} batch(es)</div>
                        <div className="text-xs">{expiredQty} units expired</div>
                        <div className="text-xs mt-1">
                          {expiredBatches.map((batch, idx) => (
                            <div key={idx} className="text-red-500">
                              {batch.batch_no}: {batch.qty} units
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-green-600">No expired batches</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b">
                    {(() => {
                      console.log(`Item ${item.item_name} batches:`, item.batches);
                      return item.batches && item.batches.length > 0 ? (
                        <select 
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={selectedBatches[item.id] ?? ""}
                          onChange={(e) => handleBatchChange(item.id, e.target.value)}
                        >
                          <option value="">
                            {item.batches.length > 1 ? `All Batches - ${item.location}` : `${item.batches[0]?.batch_no} - ${item.batches[0]?.location || item.location}`}
                          </option>
                          {item.batches.length > 1 && item.batches.map((batch, index) => (
                            <option key={index} value={index}>
                              {batch.batch_no} - {batch.location || item.location}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-500">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="text-gray-700">
                      {selectedBatch && selectedBatch.expiry_date ? (
                        <>
                          <div>Expiry: {selectedBatch.expiry_date}</div>
                          {selectedBatch.mfg_date && (
                            <div className="text-xs text-gray-500">Mfg: {selectedBatch.mfg_date}</div>
                          )}
                        </>
                      ) : item.batches && item.batches.length > 0 && item.batches[0]?.expiry_date ? (
                        <>
                          <div>Expiry: {item.batches[0].expiry_date}</div>
                          {item.batches[0].mfg_date && (
                            <div className="text-xs text-gray-500">Mfg: {item.batches[0].mfg_date}</div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === "Expired" || batchStatus === "Expired"
                          ? "text-red-600 bg-red-100" 
                          : getStatusColor(displayQty, item.min_stock)
                      }`}>
                        {status === "Expired" ? "Has Expired Batches" : batchStatus}
                      </span>
                      {hasExpiredBatches && (
                        <div className="text-xs text-red-500 font-medium">
                          ⚠️ {expiredBatches.length} expired batch(es)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="number"
                        placeholder="Qty"
                        className="border rounded px-2 py-1 text-sm w-16"
                        value={dispenseQuantities[item.id] || ''}
                        onChange={(e) => handleDispenseQuantityChange(item.id, e.target.value)}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDispense(item)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          disabled={(!selectedBatches[item.id] && selectedBatches[item.id] !== 0)}
                        >
                          Dispense Batch
                        </button>
                        {hasExpiredBatches && (
                          <button
                            onClick={() => handleDispenseExpired(item)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-medium"
                            disabled={!dispenseQuantities[item.id]}
                            title={`Dispense from ${expiredBatches.length} expired batch(es)`}
                          >
                            ⚠️ Expired
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredData.map((item) => {
          const selectedBatch = getSelectedBatch(item);
          const displayQty = getDisplayQuantity(item);
          const expiredBatches = getExpiredBatches(item.batches);
          const expiredQty = getTotalExpiredQty(item.batches);
          const hasExpiredBatches = expiredBatches.length > 0;
          const stockStatus = displayQty <= item.min_stock ? "Low Stock" : "Good";
          const status = hasExpiredBatches ? "Expired" : stockStatus;
          const batchStatus = selectedBatch && isExpired(selectedBatch.expiry_date) ? "Expired" : status;
          
          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{item.item_name}</h3>
                  <p className="text-sm text-gray-500">{item.item_code}</p>
                </div>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  status === "Expired" || batchStatus === "Expired"
                    ? "text-red-600 bg-red-100" 
                    : getStatusColor(displayQty, item.min_stock)
                }`}>
                  {status === "Expired" ? "Expired" : batchStatus}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <span className="text-gray-500">Location:</span>
                  <div className="font-medium">{item.location}</div>
                </div>
                <div>
                  <span className="text-gray-500">Available:</span>
                  <div className="font-medium">{displayQty} / {item.min_stock}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Expired Batches:</span>
                  {hasExpiredBatches ? (
                    <div className="text-red-600 text-xs mt-1">
                      <div className="font-medium">{expiredBatches.length} batch(es) - {expiredQty} units</div>
                      {expiredBatches.map((batch, idx) => (
                        <div key={idx}>{batch.batch_no}: {batch.qty} units</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-green-600 text-xs">No expired batches</div>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Batch:</span>
                  {item.batches && item.batches.length > 0 ? (
                    <select 
                      className="w-full mt-1 border rounded px-2 py-1 text-sm"
                      value={selectedBatches[item.id] ?? ""}
                      onChange={(e) => handleBatchChange(item.id, e.target.value)}
                    >
                      <option value="">
                        {item.batches.length > 1 ? `All Batches - ${item.location}` : `${item.batches[0]?.batch_no} - ${item.batches[0]?.location || item.location}`}
                      </option>
                      {item.batches.length > 1 && item.batches.map((batch, index) => (
                        <option key={index} value={index}>
                          {batch.batch_no} - {batch.location || item.location}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-gray-500 text-xs">—</div>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Expiry:</span>
                  <div className="text-xs mt-1">
                    {selectedBatch && selectedBatch.expiry_date ? (
                      <>
                        <div>Expiry: {selectedBatch.expiry_date}</div>
                        {selectedBatch.mfg_date && (
                          <div className="text-gray-500">Mfg: {selectedBatch.mfg_date}</div>
                        )}
                      </>
                    ) : item.batches && item.batches.length > 0 && item.batches[0]?.expiry_date ? (
                      <>
                        <div>Expiry: {item.batches[0].expiry_date}</div>
                        {item.batches[0].mfg_date && (
                          <div className="text-gray-500">Mfg: {item.batches[0].mfg_date}</div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100">
                <input
                  type="number"
                  placeholder="Quantity"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  value={dispenseQuantities[item.id] || ''}
                  onChange={(e) => handleDispenseQuantityChange(item.id, e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDispense(item)}
                    className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                    disabled={(!selectedBatches[item.id] && selectedBatches[item.id] !== 0)}
                  >
                    Dispense
                  </button>
                  {hasExpiredBatches && (
                    <button
                      onClick={() => handleDispenseExpired(item)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-xs font-medium"
                      disabled={!dispenseQuantities[item.id]}
                      title={`Dispense from ${expiredBatches.length} expired batch(es)`}
                    >
                      ⚠️ Expired
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}