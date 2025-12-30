import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
    totalVendors: 0,
    totalCustomers: 0,
    activeLocations: 0,
    pendingOrders: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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
      
      if (stockRes.status === 'fulfilled' && stockRes.value.data) {
        stockRes.value.data.forEach(item => {
          const qty = item.available_qty || 0;
          const minStock = item.min_stock || 10;
          totalStockValue += qty * 50;
          if (qty < minStock) {
            lowStockCount++;
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
        totalVendors: vendorsRes.status === 'fulfilled' ? (vendorsRes.value.data?.length || 0) : 0,
        totalCustomers: customersRes.status === 'fulfilled' ? (customersRes.value.data?.length || 0) : 0,
        activeLocations: locationsRes.status === 'fulfilled' ? (locationsRes.value.data?.length || 0) : 0,
        pendingOrders: pendingCount,
        recentTransactions: []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, link, trend }) => (
    <div className={`group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border-l-4 ${color} transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline mt-2">
            <p className="text-3xl font-bold text-gray-900">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                typeof value === 'number' && value > 999 ? value.toLocaleString() : value
              )}
            </p>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        <div className={`text-4xl opacity-80 group-hover:scale-110 transition-transform duration-300 ${color.replace('border-l-', 'text-')}`}>
          {icon}
        </div>
      </div>
      {link && (
        <Link to={link} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mt-4 group-hover:translate-x-1 transition-transform duration-300">
          View Details 
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );

  const QuickActionCard = ({ title, description, link, icon, color }) => (
    <Link to={link} className={`group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border-l-4 ${color} transform hover:-translate-y-1`}>
      <div className="flex items-center">
        <div className={`text-3xl mr-4 group-hover:scale-110 transition-transform duration-300 ${color.replace('border-l-', 'text-')}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );

  const AlertCard = ({ type, message, count }) => {
    const alertStyles = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      danger: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    
    return (
      <div className={`rounded-lg border p-4 ${alertStyles[type]}`}>
        <div className="flex items-center">
          <div className="text-xl mr-3">
            {type === 'warning' && '⚠️'}
            {type === 'danger' && '🚨'}
            {type === 'info' && 'ℹ️'}
          </div>
          <div>
            <p className="font-medium">{message}</p>
            {count && <p className="text-sm opacity-75">{count} items require attention</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">Dashboard</h1>
              <p className="text-gray-600 text-lg">Welcome to NUTRYAH Inventory Management System</p>
            </div>
            {/* Low Stock Alert */}
            {stats.lowStockItems > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-xl mr-3">⚠️</div>
                  <div>
                    <p className="font-medium">Low Stock Alert</p>
                    <p className="text-sm opacity-75">{stats.lowStockItems} items require attention</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Primary Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Items"
              value={stats.totalItems}
              icon="📦"
              color="border-l-blue-500"
              link="/app/items"
              trend={5.2}
            />
            <StatCard
              title="Stock Value"
              value={`₹${stats.totalStock.toLocaleString()}`}
              icon="💰"
              color="border-l-green-500"
              link="/app/stocks"
              trend={2.1}
            />
            <StatCard
              title="Low Stock Items"
              value={stats.lowStockItems}
              icon="⚠️"
              color="border-l-red-500"
              link="/app/stocks"
              trend={-1.5}
            />
            <StatCard
              title="Active Vendors"
              value={stats.totalVendors}
              icon="🏢"
              color="border-l-purple-500"
              link="/app/vendor"
              trend={3.8}
            />
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon="👥"
              color="border-l-indigo-500"
              link="/app/customers"
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingOrders}
              icon="📋"
              color="border-l-yellow-500"
              link="/app/purchase-management"
            />
            <StatCard
              title="Active Locations"
              value={stats.activeLocations}
              icon="📍"
              color="border-l-teal-500"
              link="/app/inventory/locations"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickActionCard
              title="Add New Item"
              description="Create a new inventory item"
              link="/app/items"
              icon="➕"
              color="border-l-blue-500"
            />
            <QuickActionCard
              title="Create Purchase Order"
              description="Generate new purchase order"
              link="/app/purchase-management"
              icon="🛒"
              color="border-l-green-500"
            />
            <QuickActionCard
              title="Goods Receipt"
              description="Process incoming goods"
              link="/app/grn"
              icon="📥"
              color="border-l-orange-500"
            />
            <QuickActionCard
              title="Stock Overview"
              description="Review current stock levels"
              link="/app/stocks"
              icon="📊"
              color="border-l-purple-500"
            />
            <QuickActionCard
              title="Generate Invoice"
              description="Create customer invoice"
              link="/app/billing"
              icon="🧾"
              color="border-l-red-500"
            />
            <QuickActionCard
              title="Vendor Payments"
              description="Manage supplier payments"
              link="/app/supplier-ledger"
              icon="💳"
              color="border-l-indigo-500"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
            <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
              View All
            </button>
          </div>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <p className="text-gray-500 text-lg mb-2">No recent activity</p>
            <p className="text-sm text-gray-400">Recent transactions and activities will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}