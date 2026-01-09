import { useEffect, useState } from "react";
import api from "../../api";
import Toast from "../../components/Toast";
import { useToast } from "../../utils/useToast";
import { hasPermission } from "../../utils/permissions";

export default function InventoryLocations() {
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [viewingLocation, setViewingLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    location_type: "internal"
  });

  useEffect(() => {
    if (hasPermission('locations.view')) {
      loadLocations();
    }
  }, []);

  const loadLocations = async () => {
    if (!hasPermission('locations.view')) {
      showToast('You do not have permission to view locations', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/inventory/locations/");
      const locationData = res.data || [];
      setLocations(locationData);
      filterLocations(locationData, activeFilter);
    } catch (error) {
      showToast('Failed to load locations: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterLocations = (locationData, filter) => {
    let filtered = locationData;
    if (filter === 'external') {
      filtered = locationData.filter(loc => loc.location_type === 'external');
    } else if (filter === 'location') {
      filtered = locationData.filter(loc => loc.location_type === 'internal');
    }
    setFilteredLocations(filtered);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterLocations(locations, filter);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredPermission = formData.location_type === 'external' ? 'locations.create_external' : 'locations.create_internal';
    if (!editingLocation && !hasPermission(requiredPermission)) {
      showToast(`You do not have permission to create ${formData.location_type} locations`, 'error');
      return;
    }

    if (editingLocation && !hasPermission('locations.edit')) {
      showToast('You do not have permission to edit locations', 'error');
      return;
    }

    if (!formData.code || !formData.name) {
      showToast("Code and Name are required", 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingLocation) {
        await api.put(`/inventory/locations/${editingLocation.id}`, formData);
        showToast('Location updated successfully', 'success');
      } else {
        await api.post("/inventory/locations/", formData);
        showToast('Location created successfully', 'success');
      }
      handleCancel();
      await loadLocations();
    } catch (error) {
      showToast(error.response?.data?.detail || "Error saving location", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (location) => {
    if (!hasPermission('locations.edit')) {
      showToast('You do not have permission to edit locations', 'error');
      return;
    }

    setEditingLocation(location);
    setFormData({
      code: location.code,
      name: location.name,
      description: location.description || "",
      location_type: location.location_type || "internal"
    });
    setShowModal(true);
  };

  const handleView = (location) => {
    setViewingLocation(location);
  };

  const handleStatusToggle = async (location) => {
    if (!hasPermission('locations.edit')) {
      showToast('You do not have permission to change location status', 'error');
      return;
    }

    const newStatus = !location.is_active;
    
    // Update local state immediately
    setLocations(prevLocations => 
      prevLocations.map(loc => 
        loc.id === location.id ? { ...loc, is_active: newStatus } : loc
      )
    );
    setFilteredLocations(prevFiltered => 
      prevFiltered.map(loc => 
        loc.id === location.id ? { ...loc, is_active: newStatus } : loc
      )
    );

    try {
      await api.put(`/inventory/locations/${location.id}`, {
        ...location,
        is_active: newStatus
      });
      showToast(`Location ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
      // Revert local state on error
      setLocations(prevLocations => 
        prevLocations.map(loc => 
          loc.id === location.id ? { ...loc, is_active: !newStatus } : loc
        )
      );
      setFilteredLocations(prevFiltered => 
        prevFiltered.map(loc => 
          loc.id === location.id ? { ...loc, is_active: !newStatus } : loc
        )
      );
      showToast(error.response?.data?.detail || "Error updating location status", 'error');
    }
  };

  const handleExternalLocation = () => {
    if (!hasPermission('locations.create_external')) {
      showToast('You do not have permission to create external locations', 'error');
      return;
    }

    setFormData({
      code: "EXT",
      name: "External Location",
      description: "External location for stock segregation outside main premises",
      location_type: "external"
    });
    setShowModal(true);
  };

  const handleInternalLocation = () => {
    if (!hasPermission('locations.create_internal')) {
      showToast('You do not have permission to create internal locations', 'error');
      return;
    }

    setFormData({ code: "", name: "", description: "", location_type: "internal" });
    setShowModal(true);
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingLocation(null);
    setViewingLocation(null);
    setFormData({ code: "", name: "", description: "", location_type: "internal" });
  };

  if (!hasPermission('locations.view')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view location management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Inventory Locations</h1>
                  <p className="text-sm text-gray-600 mt-1">Define pharmacy and store locations for stock segregation</p>
                </div>
              </div>
              <div className="flex space-x-3">
                {hasPermission('locations.create_internal') && (
                  <button
                    onClick={handleInternalLocation}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Internal Location
                  </button>
                )}
                {hasPermission('locations.create_external') && (
                  <button
                    onClick={handleExternalLocation}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    External Location
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleFilterChange('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeFilter === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Locations ({locations.length})
              </button>
              <button
                onClick={() => handleFilterChange('location')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeFilter === 'location'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Internal Location ({locations.filter(loc => loc.location_type === 'internal').length})
              </button>
              <button
                onClick={() => handleFilterChange('external')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeFilter === 'external'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                External Location ({locations.filter(loc => loc.location_type === 'external').length})
              </button>
            </nav>
          </div>
        </div>

        {loading && locations.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === 'external' ? 'No external locations' : 
               activeFilter === 'location' ? 'No internal locations' : 'No locations defined'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {activeFilter === 'external' ? 'Create external locations for stock outside main premises.' :
               activeFilter === 'location' ? 'Create internal locations for internal stock organization.' :
               'Get started by creating your first inventory location to organize your stock effectively.'}
            </p>
            <div className="flex space-x-3 justify-center">
              {hasPermission('locations.create_internal') && (
                <button
                  onClick={handleInternalLocation}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Internal Location
                </button>
              )}
              {hasPermission('locations.create_external') && (
                <button
                  onClick={handleExternalLocation}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  External Location
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeFilter === 'external' ? `External Locations (${filteredLocations.length})` :
                   activeFilter === 'location' ? `Internal Locations (${filteredLocations.length})` :
                   `All Locations (${filteredLocations.length})`}
                </h2>
                <div className="text-sm text-gray-500">
                  {filteredLocations.filter(l => l.is_active).length} active locations
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">{location.code.charAt(0).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            <div className="text-sm text-gray-500">Code: {location.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{location.description || "—"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(location.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          location.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {location.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {hasPermission('locations.view') && (
                            <button
                              onClick={() => handleView(location)}
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded transition-colors duration-150"
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission('locations.edit') && (
                            <button
                              onClick={() => handleEdit(location)}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-150"
                              title="Edit Location"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission('locations.edit') && (
                            <button
                              onClick={() => handleStatusToggle(location)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                location.is_active
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                              title={location.is_active ? "Click to Deactivate" : "Click to Activate"}
                            >
                              {location.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLocation ? 'Edit Location' : `Create ${formData.location_type === 'external' ? 'External' : 'Internal'} Location`}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., MAIN, PHARM1, STORE2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Main Pharmacy, Storage Room"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Optional description of the location..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Saving...' : (editingLocation ? 'Update Location' : 'Create Location')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingLocation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">{viewingLocation.code.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{viewingLocation.name}</h4>
                    <p className="text-sm text-gray-500">Code: {viewingLocation.code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingLocation.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {viewingLocation.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingLocation.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {viewingLocation.description && (
                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-900">{viewingLocation.description}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Close
                </button>
                {hasPermission('locations.edit') && (
                  <button
                    onClick={() => {
                      handleCancel();
                      handleEdit(viewingLocation);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Edit Location
                  </button>
                )}
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