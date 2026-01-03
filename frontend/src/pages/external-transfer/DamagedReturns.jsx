import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function DamagedReturns() {
  const [damagedItems, setDamagedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadDamagedReturns();
  }, []);

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

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Damaged Returns</h1>
                <p className="text-sm text-slate-600">Track all damaged items returned from external transfers</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-red-50 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-red-700">⚠️ Damaged Items: {damagedItems.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Damaged Returns Bulletin
                </h2>
                <p className="text-sm text-slate-600 mt-1">All damaged items returned from external transfers</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Loading damaged returns...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Transfer No</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Item Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Staff Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Damaged Qty</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Damage Reason</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Return Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {damagedItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-16">
                        <div className="text-slate-400">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <p className="text-lg font-medium text-slate-500">No damaged returns found</p>
                          <p className="text-sm text-slate-400 mt-1">All returned items are in good condition</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    damagedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-red-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900">{item.transfer_no}</div>
                          <div className="text-xs text-slate-400">ID: {item.transfer_id}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{item.item_name}</div>
                          <div className="text-sm text-slate-500">Batch: {item.batch_no}</div>
                          <div className="text-xs text-slate-400">Location: {item.location}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{item.staff_name}</div>
                          <div className="text-sm text-slate-500">ID: {item.staff_id}</div>
                          <div className="text-xs text-slate-400">{item.staff_location}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                            {item.damaged_quantity}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-slate-600">{item.damage_reason || 'No reason provided'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-slate-500">
                            {item.returned_at ? new Date(item.returned_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}