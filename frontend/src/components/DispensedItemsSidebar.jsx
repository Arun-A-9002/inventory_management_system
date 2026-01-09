import React, { useState, useEffect } from 'react';
import api from '../api';

export default function DispensedItemsSidebar({ isOpen, onClose }) {
  const [dispensedSummary, setDispensedSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchDispensedSummary();
    }
  }, [isOpen]);

  const fetchDispensedSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/consumption/dispensed-summary');
      setDispensedSummary(response.data);
    } catch (error) {
      console.error('Error fetching dispensed summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="relative ml-auto w-96 h-full bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Dispensed Items</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Dispensed</p>
                      <p className="text-2xl font-bold text-blue-900">{dispensedSummary?.total_dispensed || 0}</p>
                    </div>
                  </div>
                </div>

                {/* By Type Breakdown */}
                {dispensedSummary?.by_type && dispensedSummary.by_type.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">By Issue Type</h3>
                    <div className="space-y-2">
                      {dispensedSummary.by_type.map((type, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 capitalize">{type.type.toLowerCase()}</span>
                          <span className="text-sm font-medium text-gray-900">{type.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Dispensed Items</h3>
                <div className="space-y-3">
                  {dispensedSummary?.recent_items && dispensedSummary.recent_items.length > 0 ? (
                    dispensedSummary.recent_items.map((item, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.item_name}</h4>
                          <span className="text-xs text-gray-500 ml-2">{item.issue_date}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>Qty: {item.qty}</span>
                          <span className="truncate ml-2">{item.department || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">{item.issue_no}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-sm">No dispensed items found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-200">
                <button 
                  onClick={() => window.location.href = '/app/dispensed-items'}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View All Dispensed Items
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}