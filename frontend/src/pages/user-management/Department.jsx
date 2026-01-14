// src/pages/user-management/Department.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function Department() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (hasPermission("departments.view")) loadDepartments();
  }, []);

  async function loadDepartments() {
    setLoading(true);
    try {
      const res = await api.get("/departments");
      setDepartments(res.data || []);
    } catch (e) {
      console.error("Load error:", e);
      showToast("Failed to load departments", 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingId && !hasPermission("departments.create")) {
      showToast("Permission denied", 'error');
      return;
    }
    if (editingId && !hasPermission("departments.update")) {
      showToast("Permission denied", 'error');
      return;
    }

    if (!name) {
      showToast("Department name is required", 'error');
      return;
    }

    try {
      const payload = { name, description, is_active: isActive };

      if (!editingId) {
        const response = await api.post("/departments", payload);
        setDepartments(prev => [...prev, response.data]);
        showToast("Department created successfully", 'success');
      } else {
        const response = await api.put(`/departments/${editingId}`, payload);
        setDepartments(prev => prev.map(d => d.id === editingId ? response.data : d));
        showToast("Department updated successfully", 'success');
      }

      closeModal();
    } catch (e) {
      console.error("Save error:", e);
      const errorMessage = e?.response?.data?.detail || e?.message || "Save failed";
      showToast(errorMessage, 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setIsActive(true);
  }

  function startEdit(dept) {
    if (!hasPermission("departments.update")) {
      showToast("Permission denied", 'error');
      return;
    }
    setEditingId(dept.id);
    setName(dept.name);
    setDescription(dept.description || "");
    setIsActive(!!dept.is_active);
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!hasPermission("departments.delete")) {
      showToast("Permission denied", 'error');
      return;
    }
    if (!window.confirm("Delete department?")) return;
    try {
      await api.delete(`/departments/${id}`);
      showToast("Department deleted successfully", 'success');
      await loadDepartments();
    } catch (e) {
      console.error(e);
      showToast("Delete failed", 'error');
    }
  }

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = !searchQuery || 
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && dept.is_active) ||
      (filterStatus === "inactive" && !dept.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (!hasPermission("departments.view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view departments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Department Management</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage organizational departments</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
                <span className="text-sm font-medium text-gray-600">Total Departments</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{departments.length}</span>
              </div>
              {hasPermission("departments.create") && (
                <button 
                  type="button"
                  onClick={() => { setSearchQuery(""); setShowModal(true); }} 
                  className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200 text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Department
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full sm:w-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  />
                </div>
              </form>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <div className="text-sm text-gray-500 text-center sm:text-right">
              Showing {filteredDepartments.length} of {departments.length} departments
            </div>
          </div>
        </div>

        {/* Departments Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-gray-600">Loading departments...</span>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No departments found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDepartments.map((dept, i) => (
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{dept.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{dept.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${dept.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {hasPermission("departments.update") && (
                            <button onClick={() => startEdit(dept)} className="text-cyan-600 hover:text-cyan-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {hasPermission("departments.delete") && (
                            <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingId ? 'Edit Department' : 'Add New Department'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Name *</label>
                  <input 
                    type="text"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                    placeholder="Enter department name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" 
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={e => setIsActive(e.target.checked)} 
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Active Department</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors duration-200"
                >
                  {editingId ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
