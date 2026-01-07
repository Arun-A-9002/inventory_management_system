import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    user_name: ''
  });

  useEffect(() => {
    fetchAuditLogs();
    fetchCompanyInfo();
  }, [pagination.page, filters]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await api.get('/company/');
      if (response.data && response.data.length > 0) {
        setCompanyInfo(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.module && { module: filters.module }),
        ...(filters.action && { action: filters.action }),
        ...(filters.user_name && { user_name: filters.user_name })
      });

      const response = await api.get(`/audit-logs/?${params}`);
      setLogs(response.data.logs);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.total_pages
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePrint = () => {
    const printContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        ${companyInfo?.logo ? `<img src="${companyInfo.logo}" alt="Logo" style="max-height: 80px; margin-bottom: 10px;">` : ''}
        <h1 style="font-size: 24px; margin: 10px 0;">${companyInfo?.name || 'NUTRYAH'}</h1>
        ${companyInfo?.address ? `<p>${companyInfo.address}</p>` : ''}
        ${companyInfo?.phone ? `<p>Phone: ${companyInfo.phone}</p>` : ''}
        ${companyInfo?.email ? `<p>Email: ${companyInfo.email}</p>` : ''}
        <hr style="margin: 20px 0;">
        <h2 style="font-size: 20px; margin: 20px 0;">Audit Log Report</h2>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      ${document.querySelector('.audit-table').outerHTML}
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Audit Log Report</title>
          <style>
            body { margin: 20px; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-50';
      case 'UPDATE': return 'text-blue-600 bg-blue-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      case 'APPROVE': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Log</h1>
            <p className="text-gray-600">System activity and change tracking</p>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <input
              type="text"
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              placeholder="Filter by module..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="Filter by action..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <input
              type="text"
              value={filters.user_name}
              onChange={(e) => handleFilterChange('user_name', e.target.value)}
              placeholder="Filter by user..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 audit-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-center">
                    <div className="animate-pulse">Loading...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.user_name || 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.module || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.description || `${log.action} on ${log.table_name}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}