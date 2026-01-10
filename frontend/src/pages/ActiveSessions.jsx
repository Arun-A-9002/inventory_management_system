// src/pages/ActiveSessions.jsx
import { useEffect, useState } from "react";
import api from "../api";
import Toast from "../components/Toast";
import { useToast } from "../utils/useToast";
import { hasPermission } from "../utils/permissions";

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadActiveSessions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadActiveSessions() {
    setLoading(true);
    try {
      const response = await api.get("/auth/active-sessions");
      setSessions(response.data.active_sessions || []);
    } catch (e) {
      console.error("Load error:", e);
      if (e.response?.status === 403) {
        showToast("Access denied. Admin privileges required.", 'error');
      } else {
        showToast("Failed to load active sessions", 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function forceLogout(sessionId, userEmail) {
    if (!window.confirm(`Force logout user: ${userEmail}?`)) return;
    
    try {
      await api.post(`/auth/force-logout/${sessionId}`);
      showToast("User session terminated successfully", 'success');
      await loadActiveSessions();
    } catch (e) {
      console.error("Force logout error:", e);
      showToast(e?.response?.data?.detail || "Failed to terminate session", 'error');
    }
  }

  function formatDateTime(dateString) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  }

  function getTimeSince(dateString) {
    if (!dateString) return "—";
    const now = new Date();
    const loginTime = new Date(dateString);
    const diffMs = now - loginTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h ago`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m ago`;
    return `${diffMins}m ago`;
  }

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => 
    !searchQuery || 
    session.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.login_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Active Sessions
              </h1>
              <p className="text-gray-600 mt-1">Monitor and manage user login sessions</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Active Sessions</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{sessions.length}</span>
              </div>
              <button 
                onClick={loadActiveSessions}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by user name, email, or login code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-gray-600">Loading sessions...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active sessions found</h3>
            <p className="text-gray-600">
              {sessions.length === 0 ? "No users are currently logged in" : "Try adjusting your search criteria"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Multi-Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <tr key={session.session_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {session.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{session.user_name}</div>
                            <div className="text-sm text-gray-500">{session.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">Code: {session.login_code}</div>
                          <div className="text-gray-500">ID: {session.user_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Login: {getTimeSince(session.login_time)}</div>
                          <div className="text-gray-500">Last: {getTimeSince(session.last_activity)}</div>
                          {session.ip_address && (
                            <div className="text-xs text-gray-400">IP: {session.ip_address}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.multi_login_enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {session.multi_login_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => forceLogout(session.session_id, session.user_email)}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors duration-200"
                        >
                          Force Logout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}