import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
    expiredItems: 0,
    totalVendors: 0,
    totalCustomers: 0,
    activeLocations: 0,
    pendingOrders: 0,
    recentTransactions: [],
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [companyName, setCompanyName] = useState('NUTRYAH');

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check if user is logged in
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        window.location.href = '/login';
        return;
      }
      
      console.log('Fetching dashboard data...');
      
      // Use individual API calls that we know work
      const [itemsRes, stockRes, vendorsRes, customersRes, locationsRes, purchaseRes, companyRes, grnRes, issueRes] = await Promise.allSettled([
        api.get('/items/'),
        api.get('/stock-overview/'),
        api.get('/vendors/'),
        api.get('/customers/'),
        api.get('/inventory/locations/'),
        api.get('/purchase/pr'),
        api.get('/company/'),
        api.get('/grn/'),
        api.get('/consumption/issues/')
      ]);

      console.log('API Results:', {
        items: itemsRes.status === 'fulfilled' ? itemsRes.value.data?.length : itemsRes.reason,
        stock: stockRes.status === 'fulfilled' ? stockRes.value.data?.length : stockRes.reason,
        vendors: vendorsRes.status === 'fulfilled' ? vendorsRes.value.data?.length : vendorsRes.reason,
        customers: customersRes.status === 'fulfilled' ? customersRes.value.data?.length : customersRes.reason,
        locations: locationsRes.status === 'fulfilled' ? locationsRes.value.data?.length : locationsRes.reason,
        purchase: purchaseRes.status === 'fulfilled' ? purchaseRes.value.data?.length : purchaseRes.reason
      });

      // Set company name if available
      if (companyRes.status === 'fulfilled' && companyRes.value.data && companyRes.value.data.length > 0) {
        setCompanyName(companyRes.value.data[0].name);
      }

      let totalStockValue = 0;
      let lowStockCount = 0;
      let expiredCount = 0;
      
      if (stockRes.status === 'fulfilled' && stockRes.value.data) {
        console.log('Processing stock data:', stockRes.value.data.length, 'items');
        stockRes.value.data.forEach(item => {
          const qty = item.available_qty || 0;
          const minStock = item.min_stock || 10;
          totalStockValue += qty * 50;
          if (qty < minStock) {
            lowStockCount++;
          }
          
          // Check for expired batches
          if (item.batches && item.batches.length > 0) {
            const hasExpiredBatch = item.batches.some(batch => {
              if (!batch.expiry_date || batch.expiry_date === "—") return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const parts = batch.expiry_date.split('/');
              if (parts.length === 3) {
                const expiry = new Date(parts[2], parts[1] - 1, parts[0]);
                return expiry < today;
              }
              return false;
            });
            if (hasExpiredBatch) {
              expiredCount++;
            }
          }
        });
      }

      let pendingCount = 0;
      if (purchaseRes.status === 'fulfilled' && purchaseRes.value.data && Array.isArray(purchaseRes.value.data)) {
        pendingCount = purchaseRes.value.data.filter(pr => 
          !pr.status || pr.status === 'draft' || pr.status === 'submitted'
        ).length;
      }

      const finalStats = {
        totalItems: itemsRes.status === 'fulfilled' ? (itemsRes.value.data?.length || 0) : 0,
        totalStock: totalStockValue,
        lowStockItems: lowStockCount,
        expiredItems: expiredCount,
        totalVendors: vendorsRes.status === 'fulfilled' ? (vendorsRes.value.data?.length || 0) : 0,
        totalCustomers: customersRes.status === 'fulfilled' ? (customersRes.value.data?.length || 0) : 0,
        activeLocations: locationsRes.status === 'fulfilled' ? (locationsRes.value.data?.length || 0) : 0,
        pendingOrders: pendingCount,
        recentTransactions: [],
        recentActivities: getRecentActivities(grnRes, issueRes, stockRes)
      };
      
      console.log('Final stats:', finalStats);
      setStats(finalStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const getRecentActivities = (grnRes, issueRes, stockRes) => {
    const activities = [];
    
    // Add recent GRNs
    if (grnRes.status === 'fulfilled' && grnRes.value.data && Array.isArray(grnRes.value.data)) {
      grnRes.value.data.slice(0, 3).forEach(grn => {
        activities.push({
          type: 'grn',
          title: 'Stock received',
          description: `GRN ${grn.grn_number || 'N/A'} from ${grn.vendor_name || 'Unknown'}`,
          details: `₹${grn.total_amount || 0} • ${grn.status || 'Pending'}`,
          time: grn.grn_date,
          icon: 'check',
          color: 'green'
        });
      });
    }
    
    // Add recent issues
    if (issueRes.status === 'fulfilled' && issueRes.value.data && Array.isArray(issueRes.value.data)) {
      issueRes.value.data.slice(0, 2).forEach(issue => {
        activities.push({
          type: 'issue',
          title: 'Stock dispensed',
          description: `Issue ${issue.issue_no || 'N/A'} to ${issue.department || 'Unknown'}`,
          details: `${issue.total_quantity || 0} items • ${issue.status || 'Completed'}`,
          time: issue.created_at,
          icon: 'arrow-right',
          color: 'blue'
        });
      });
    }
    
    // Add low stock alerts
    if (stockRes.status === 'fulfilled' && stockRes.value.data && Array.isArray(stockRes.value.data)) {
      const lowStockItems = stockRes.value.data.filter(item => 
        item.available_qty <= item.min_stock
      ).slice(0, 2);
      
      lowStockItems.forEach(item => {
        activities.push({
          type: 'alert',
          title: 'Low stock alert',
          description: `${item.item_name || 'Unknown item'} below minimum threshold`,
          details: `${item.available_qty || 0} left • Min: ${item.min_stock || 0}`,
          time: new Date().toISOString(),
          icon: 'warning',
          color: 'yellow'
        });
      });
    }
    
    return activities.slice(0, 5);
  };

  const fetchFallbackData = async () => {
    try {
      const [itemsRes, stockRes, vendorsRes, customersRes, locationsRes, purchaseRes] = await Promise.allSettled([
        api.get('/items/'),
        api.get('/stock-overview/'),
        api.get('/vendors/'),
        api.get('/customers/'),
        api.get('/inventory/locations/'),
        api.get('/purchase/pr')
      ]);

      let totalStockValue = 0;
      let lowStockCount = 0;
      let expiredCount = 0;
      
      if (stockRes.status === 'fulfilled' && stockRes.value.data) {
        stockRes.value.data.forEach(item => {
          const qty = item.available_qty || 0;
          const minStock = item.min_stock || 10;
          totalStockValue += qty * 50;
          if (qty < minStock) {
            lowStockCount++;
          }
          
          // Check for expired batches
          if (item.batches && item.batches.length > 0) {
            const hasExpiredBatch = item.batches.some(batch => {
              if (!batch.expiry_date || batch.expiry_date === "—") return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const parts = batch.expiry_date.split('/');
              if (parts.length === 3) {
                const expiry = new Date(parts[2], parts[1] - 1, parts[0]);
                return expiry < today;
              }
              return false;
            });
            if (hasExpiredBatch) {
              expiredCount++;
            }
          }
        });
      }

      let pendingCount = 0;
      if (purchaseRes.status === 'fulfilled' && purchaseRes.value.data) {
        pendingCount = purchaseRes.value.data.filter(pr => 
          !pr.status || pr.status === 'draft' || pr.status === 'submitted'
        ).length;
      }

      setStats({
        totalItems: itemsRes.status === 'fulfilled' ? (itemsRes.value.data?.length || 0) : 0,
        totalStock: totalStockValue,
        lowStockItems: lowStockCount,
        expiredItems: expiredCount,
        totalVendors: vendorsRes.status === 'fulfilled' ? (vendorsRes.value.data?.length || 0) : 0,
        totalCustomers: customersRes.status === 'fulfilled' ? (customersRes.value.data?.length || 0) : 0,
        activeLocations: locationsRes.status === 'fulfilled' ? (locationsRes.value.data?.length || 0) : 0,
        pendingOrders: pendingCount,
        recentTransactions: []
      });
    } catch (error) {
      console.error('Fallback data fetch failed:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return;
      }
      
      // Set default values if all fails
      setStats({
        totalItems: 0,
        totalStock: 0,
        lowStockItems: 0,
        expiredItems: 0,
        totalVendors: 0,
        totalCustomers: 0,
        activeLocations: 0,
        pendingOrders: 0,
        recentTransactions: []
      });
    }
  };

  const StatCard = ({ title, value, icon, color, link, trend }) => (
    <div className="group bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border border-gray-200/50 transform hover:-translate-y-1 hover:bg-white/80">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">{title}</p>
          <div className="flex items-baseline">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {loading ? (
                <div className="animate-pulse bg-gray-200/50 h-6 sm:h-8 w-12 sm:w-16 rounded-lg"></div>
              ) : (
                typeof value === 'number' && value > 999 ? value.toLocaleString() : value
              )}
            </p>
            {trend && (
              <span className={`ml-2 sm:ml-3 px-1.5 sm:px-2 py-1 text-xs font-semibold rounded-full ${
                trend > 0 
                  ? 'bg-green-100/80 text-green-700' 
                  : 'bg-red-100/80 text-red-700'
              }`}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
          {icon}
        </div>
      </div>
      {link && (
        <Link to={link} className="inline-flex items-center text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 mt-3 sm:mt-4 group-hover:translate-x-1 transition-all duration-300">
          View Details 
          <svg className="ml-2 w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );

  const QuickActionCard = ({ title, description, link, icon, color }) => (
    <Link to={link} className="group block bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border border-gray-200/50 transform hover:-translate-y-1 hover:bg-white/80">
      <div className="flex items-center">
        <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors mb-1 truncate">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{description}</p>
        </div>
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );

  const AlertCard = ({ type, message, count }) => {
    const alertStyles = {
      warning: 'bg-yellow-50/80 backdrop-blur-sm border-yellow-200/50 text-yellow-800',
      danger: 'bg-red-50/80 backdrop-blur-sm border-red-200/50 text-red-800',
      info: 'bg-blue-50/80 backdrop-blur-sm border-blue-200/50 text-blue-800'
    };
    
    return (
      <div className={`rounded-2xl border p-4 shadow-lg ${alertStyles[type]}`}>
        <div className="flex items-center">
          <div className="mr-3">
            {type === 'warning' && (
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            {type === 'danger' && (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold">{message}</p>
            {count && <p className="text-sm opacity-75">{count} items require attention</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 overflow-y-scroll-invisible">
      {/* Header Section */}
      <div className="bg-white/70 backdrop-blur-xl shadow-lg border-b border-gray-200/50">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Dashboard</h1>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg font-medium">Welcome to {companyName} Inventory Management System</p>
            </div>
            {/* Alerts Section */}
            {(stats.lowStockItems > 0 || stats.expiredItems > 0) && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {stats.lowStockItems > 0 && (
                  <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 text-yellow-800 rounded-lg p-2 shadow-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-600 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-xs">Low Stock Alert</p>
                        <p className="text-xs opacity-75">{stats.lowStockItems} items require attention</p>
                      </div>
                    </div>
                  </div>
                )}
                {stats.expiredItems > 0 && (
                  <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-800 rounded-lg p-2 shadow-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-600 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-xs">Expired Stock Alert</p>
                        <p className="text-xs opacity-75">{stats.expiredItems} items have expired batches</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-y-scroll-invisible">
        {/* Primary Metrics */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 sm:mb-6">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Total Items"
              value={stats.totalItems}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              color="from-blue-500 to-blue-600"
              link="/app/items"
              trend={5.2}
            />
            <StatCard
              title="Stock Value"
              value={`₹${stats.totalStock.toLocaleString()}`}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
              color="from-green-500 to-green-600"
              link="/app/stocks"
              trend={2.1}
            />
            <StatCard
              title="Expired Items"
              value={stats.expiredItems}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              color="from-red-500 to-red-600"
              link="/app/stocks"
            />
            <StatCard
              title="Active Vendors"
              value={stats.totalVendors}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              color="from-purple-500 to-purple-600"
              link="/app/vendor"
              trend={3.8}
            />
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="mb-8 sm:mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              color="from-indigo-500 to-indigo-600"
              link="/app/customers"
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingOrders}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              color="from-yellow-500 to-yellow-600"
              link="/app/purchase-management"
            />
            <StatCard
              title="Active Locations"
              value={stats.activeLocations}
              icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              color="from-teal-500 to-teal-600"
              link="/app/inventory/locations"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <QuickActionCard
              title="Add New Item"
              description="Create a new inventory item"
              link="/app/items"
              icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
              color="from-blue-500 to-blue-600"
            />
            <QuickActionCard
              title="Create Purchase Order"
              description="Generate new purchase order"
              link="/app/purchase-management"
              icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /></svg>}
              color="from-green-500 to-green-600"
            />
            <QuickActionCard
              title="Goods Receipt"
              description="Process incoming goods"
              link="/app/grn"
              icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
              color="from-orange-500 to-orange-600"
            />
            <QuickActionCard
              title="Stock Overview"
              description="Review current stock levels"
              link="/app/stocks"
              icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              color="from-purple-500 to-purple-600"
            />
            <QuickActionCard
              title="Vendor Payments"
              description="Manage supplier payments"
              link="/app/supplier-ledger"
              icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
              color="from-indigo-500 to-indigo-600"
            />
            <QuickActionCard
              title="Audit Log"
              description="View system activity logs"
              link="/app/audit-log"
              icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              color="from-gray-500 to-gray-600"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Recent Activity</h2>
            <button className="px-4 py-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-semibold text-sm rounded-xl transition-colors duration-200 self-start sm:self-auto">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity, index) => (
                <div key={index} className={`flex items-center p-3 bg-${activity.color}-50 rounded-lg border border-${activity.color}-200`}>
                  <div className={`w-8 h-8 bg-${activity.color}-500 rounded-full flex items-center justify-center mr-3`}>
                    {activity.icon === 'check' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {activity.icon === 'arrow-right' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    )}
                    {activity.icon === 'warning' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                    {activity.details && (
                      <p className="text-xs text-gray-400 mt-1">{activity.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {activity.time ? new Date(activity.time).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-600 mb-2 font-medium">No recent activity</p>
                <p className="text-xs text-gray-500">Recent transactions will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}