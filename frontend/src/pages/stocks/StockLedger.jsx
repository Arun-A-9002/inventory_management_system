import React, { useState, useEffect } from "react";
import api from "../../api";
import { hasPermission } from "../../utils/permissions";

export default function StockLedger() {
  const [ledgerData, setLedgerData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [filters, setFilters] = useState({
    item: '',
    batch: '',
    transaction: '',
    dateFrom: '',
    dateTo: '',
    reference: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    items: [],
    batches: [],
    transaction_types: []
  });

  useEffect(() => {
    if (hasPermission("stock_ledger.view")) {
      fetchLedgerData();
      fetchFilterOptions();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get("/stocks/filter-options");
      setFilterOptions(response.data);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  // Check if user has permission to view stock ledger
  if (!hasPermission("stock_ledger.view")) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view the Stock Ledger.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      console.log('Fetching stock ledger data...');
      const response = await api.get("/stocks/ledger");
      console.log('Stock ledger response:', response.data);
      setLedgerData(response.data || []);
      setFilteredData(response.data || []);
    } catch (error) {
      console.error("Error fetching ledger:", error);
      console.error("Error details:", error.response?.data || error.message);
      // Show user-friendly error message
      alert("Failed to load stock data. Please check if you have created any GRN records first.");
      setLedgerData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...ledgerData];

    if (filters.item) {
      filtered = filtered.filter(entry => 
        entry.item_name === filters.item
      );
    }

    if (filters.batch) {
      filtered = filtered.filter(entry => 
        entry.batch_no === filters.batch
      );
    }

    if (filters.transaction) {
      filtered = filtered.filter(entry => 
        entry.txn_type === filters.transaction
      );
    }

    if (filters.reference) {
      filtered = filtered.filter(entry => 
        entry.ref_no && entry.ref_no.toLowerCase().includes(filters.reference.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date.split('/').reverse().join('-'));
        const fromDate = new Date(filters.dateFrom);
        return entryDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date.split('/').reverse().join('-'));
        const toDate = new Date(filters.dateTo);
        return entryDate <= toDate;
      });
    }

    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setFilters({
      item: '',
      batch: '',
      transaction: '',
      dateFrom: '',
      dateTo: '',
      reference: ''
    });
    setFilteredData(ledgerData);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Item Name', 'Batch No', 'Transaction Type', 'Qty In', 'Qty Out', 'Balance', 'Reference'];
    const csvData = filteredData.map(entry => [
      entry.date,
      entry.item_name,
      entry.batch_no || '—',
      entry.txn_type,
      entry.qty_in || '—',
      entry.qty_out || '—',
      entry.balance,
      entry.ref_no
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, ledgerData]);

  const handleDispense = async (entry) => {
    if (!hasPermission("stock_ledger.dispense")) {
      alert("Permission denied");
      return;
    }
    
    if (window.confirm(`Are you sure you want to dispense ${entry.item_name} (Batch: ${entry.batch_no})?`)) {
      try {
        await api.post("/stocks/dispense", {
          item_name: entry.item_name,
          batch_no: entry.batch_no,
          reason: "Manual dispense from stock ledger"
        });
        alert("Item dispensed successfully");
        fetchLedgerData();
      } catch (error) {
        console.error("Error dispensing item:", error);
        alert("Failed to dispense item");
      }
    }
  };

  const handleViewAudit = async (entry) => {
    try {
      const response = await api.get(`/stocks/audit-logs/${entry.item_name}`);
      setAuditLogs(response.data);
      setSelectedItem(entry);
      setShowAuditModal(true);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      alert("Failed to fetch audit logs");
    }
  };

  const closeAuditModal = () => {
    setShowAuditModal(false);
    setSelectedItem(null);
    setAuditLogs([]);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Stock Ledger</h1>
      
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.transaction}
              onChange={(e) => handleFilterChange('transaction', e.target.value)}
            >
              <option value="">All Transactions</option>
              {filterOptions.transaction_types.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input
              type="text"
              placeholder="Search by reference number"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.reference}
              onChange={(e) => handleFilterChange('reference', e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredData.length} of {ledgerData.length} records
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Item</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Batch No</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Transaction</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Qty In</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Qty Out</th>
              {hasPermission("stock_ledger.available_qty") && (
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Balance</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Reference</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 border-b">{entry.date}</td>
                <td className="px-4 py-3 border-b">{entry.item_name}</td>
                <td className="px-4 py-3 border-b">{entry.batch_no || "—"}</td>
                <td className="px-4 py-3 border-b">{entry.txn_type}</td>
                <td className="px-4 py-3 border-b text-green-600">{entry.qty_in || "—"}</td>
                <td className="px-4 py-3 border-b text-red-600">{entry.qty_out || "—"}</td>
                {hasPermission("stock_ledger.available_qty") && (
                <td className="px-4 py-3 border-b font-medium">{entry.balance}</td>
                )}
                <td className="px-4 py-3 border-b">{entry.ref_no}</td>
                <td className="px-4 py-3 border-b">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleViewAudit(entry)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      title="View Audit Log"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {hasPermission("stock_ledger.dispense") && (
                    <button 
                      onClick={() => handleDispense(entry)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Dispense
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Audit Log - {selectedItem?.item_name}</h2>
              <button 
                onClick={closeAuditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No audit logs found for this item.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Timestamp</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">User</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Action</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Description</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-sm">{log.timestamp}</td>
                        <td className="px-4 py-2 border-b text-sm">{log.user_name}</td>
                        <td className="px-4 py-2 border-b">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'DISPENSE' ? 'bg-red-100 text-red-800' :
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-b text-sm">{log.description}</td>
                        <td className="px-4 py-2 border-b text-sm">
                          {log.new_values && (
                            <div className="text-xs text-gray-600">
                              {log.new_values.batch_no && <div>Batch: {log.new_values.batch_no}</div>}
                              {log.new_values.reason && <div>Reason: {log.new_values.reason}</div>}
                              {log.new_values.disposal_method && <div>Method: {log.new_values.disposal_method}</div>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}