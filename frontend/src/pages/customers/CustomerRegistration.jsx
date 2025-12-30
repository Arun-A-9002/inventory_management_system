import { useState, useEffect } from 'react';
import api from '../../api';

export default function CustomerRegistration() {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    customer_type: '',
    // Organization fields
    org_name: '',
    org_address: '',
    org_pan: '',
    org_gst: '',
    org_mobile: '',
    org_type: '',
    // Self fields
    name: '',
    address: '',
    pan: '',
    gst: '',
    mobile: '',
    type: '',
    // Optional fields
    email: '',
    reference_source: '',
    reference_details: '',
    staff_reference: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const res = await api.get('/customers/');
      console.log('Customers response:', res.data);
      setCustomers(res.data || []);
      
      // If no customers found, show helpful message
      if (!res.data || res.data.length === 0) {
        console.log('No customers found in database');
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      console.error('Error details:', err.response?.data);
      
      // Check if it's a 404 or table doesn't exist error
      if (err.response?.status === 404 || err.response?.data?.detail?.includes('table')) {
        showMessage('Customer table not found. Please run database migrations.', 'error');
      } else if (err.message === 'Network Error') {
        showMessage('Backend server is not running. Please start the server.', 'error');
      } else {
        showMessage('Failed to load customers: ' + (err.response?.data?.detail || err.message), 'error');
      }
      
      // Set empty array so UI still works
      setCustomers([]);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const updateCustomerStatus = async (customerId, status) => {
    console.log('Updating customer status:', customerId, status);
    try {
      const response = await api.put(`/customers/${customerId}/status`, { status });
      console.log('API response:', response.data);
      console.log('API status:', response.status);
      
      // Only update local state if API call was successful
      if (response.status === 200) {
        setCustomers(customers.map(customer => 
          customer.id === customerId ? { ...customer, status: status } : customer
        ));
        
        if (status === 'approved') {
          showMessage('Customer approved and email sent successfully');
        } else {
          showMessage(`Customer status updated to ${status}`);
        }
      } else {
        throw new Error('API call failed with status: ' + response.status);
      }
      
    } catch (err) {
      console.error('API call failed:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      showMessage('Failed to update customer status: ' + (err.response?.data?.detail || err.message), 'error');
      
      // Revert to database state on error
      fetchCustomers();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerForm.customer_type) {
      showMessage('Please select customer type', 'error');
      return;
    }

    // Validate based on customer type
    if (customerForm.customer_type === 'organization') {
      if (!customerForm.org_name || !customerForm.org_mobile) {
        showMessage('Organization name and mobile are required', 'error');
        return;
      }
    } else if (customerForm.customer_type === 'self') {
      if (!customerForm.name || !customerForm.mobile) {
        showMessage('Name and mobile are required', 'error');
        return;
      }
    }

    try {
      setLoading(true);
      await api.post('/customers/', customerForm);
      showMessage('Customer registered successfully');
      
      // Reset form and refresh list
      setCustomerForm({
        customer_type: '',
        org_name: '', org_address: '', org_pan: '', org_gst: '', org_mobile: '', org_type: '',
        name: '', address: '', pan: '', gst: '', mobile: '', type: '',
        email: '', reference_source: '', reference_details: '', staff_reference: ''
      });
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to register customer:', err);
      showMessage('Failed to register customer: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerFields = () => {
    if (customerForm.customer_type === 'organization') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organization Name *</label>
              <input
                type="text"
                value={customerForm.org_name}
                onChange={(e) => setCustomerForm({...customerForm, org_name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization Type</label>
              <select
                value={customerForm.org_type}
                onChange={(e) => setCustomerForm({...customerForm, org_type: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="distributor">Distributor</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Organization Address</label>
            <textarea
              value={customerForm.org_address}
              onChange={(e) => setCustomerForm({...customerForm, org_address: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter organization address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mobile *</label>
              <input
                type="tel"
                value={customerForm.org_mobile}
                onChange={(e) => setCustomerForm({...customerForm, org_mobile: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="10 digit mobile"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">PAN Number</label>
              <input
                type="text"
                value={customerForm.org_pan}
                onChange={(e) => setCustomerForm({...customerForm, org_pan: e.target.value.toUpperCase()})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">GST Number</label>
              <input
                type="text"
                value={customerForm.org_gst}
                onChange={(e) => setCustomerForm({...customerForm, org_gst: e.target.value.toUpperCase()})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
          </div>
        </>
      );
    } else if (customerForm.customer_type === 'self') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={customerForm.type}
                onChange={(e) => setCustomerForm({...customerForm, type: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="individual">Individual</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              value={customerForm.address}
              onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mobile *</label>
              <input
                type="tel"
                value={customerForm.mobile}
                onChange={(e) => setCustomerForm({...customerForm, mobile: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="10 digit mobile"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">PAN Number</label>
              <input
                type="text"
                value={customerForm.pan}
                onChange={(e) => setCustomerForm({...customerForm, pan: e.target.value.toUpperCase()})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">GST Number</label>
              <input
                type="text"
                value={customerForm.gst}
                onChange={(e) => setCustomerForm({...customerForm, gst: e.target.value.toUpperCase()})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
          </div>
        </>
      );
    } else if (customerForm.customer_type === 'optional') {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Manual entry fields can be customized based on requirements</p>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Enter customer details manually"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    }
    return null;
  };

  const handleView = (customer) => {
    setViewingCustomer(customer);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      customer_type: customer.customer_type,
      org_name: customer.org_name || '',
      org_address: customer.org_address || '',
      org_pan: customer.org_pan || '',
      org_gst: customer.org_gst || '',
      org_mobile: customer.org_mobile || '',
      org_type: customer.org_type || '',
      name: customer.name || '',
      address: customer.address || '',
      pan: customer.pan || '',
      gst: customer.gst || '',
      mobile: customer.mobile || '',
      type: customer.type || '',
      email: customer.email || '',
      reference_source: customer.reference_source || '',
      reference_details: customer.reference_details || '',
      staff_reference: customer.staff_reference || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Are you sure you want to delete customer "${customer.customer_type === 'organization' ? customer.org_name : customer.name}"?`)) {
      try {
        await api.delete(`/customers/${customer.id}`);
        showMessage('Customer deleted successfully');
        fetchCustomers();
      } catch (error) {
        showMessage('Failed to delete customer: ' + (error.response?.data?.detail || error.message), 'error');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setViewingCustomer(null);
    setEditingCustomer(null);
    setCustomerForm({
      customer_type: '',
      org_name: '', org_address: '', org_pan: '', org_gst: '', org_mobile: '', org_type: '',
      name: '', address: '', pan: '', gst: '', mobile: '', type: '',
      email: '', reference_source: '', reference_details: '', staff_reference: ''
    });
  };

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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage customer registrations and information</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

        {/* Customer List */}
        {loading && customers.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Get started by registering your first customer to manage their information effectively.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Register First Customer
            </button>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">All Customers ({customers.length})</h2>
                <div className="text-sm text-gray-500">
                  {customers.filter(c => c.status === 'approved').length} approved customers
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {(customer.customer_type === 'organization' ? customer.org_name : customer.name)?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.customer_type === 'organization' ? customer.org_name : customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                {customer.customer_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.customer_type === 'organization' ? customer.org_mobile : customer.mobile}</div>
                        <div className="text-sm text-gray-500">{customer.email || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.reference_source || '—'}</div>
                        <div className="text-sm text-gray-500">{customer.reference_details || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={customer.status || 'pending'}
                          onChange={(e) => updateCustomerStatus(customer.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${
                            customer.status === 'approved' ? 'bg-green-100 text-green-800' :
                            customer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="draft">Draft</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleView(customer)}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded transition-colors duration-150"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-150"
                            title="Edit Customer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(customer)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition-colors duration-150"
                            title="Delete Customer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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

      {/* Registration Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Customer Registration</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Start with mandatory fields. Optional sections can be completed later.</p>
            <form onSubmit={handleSubmit}>
              {/* Mandatory Fields Section */}
              <div className="border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Mandatory fields</h3>
                <p className="text-sm text-gray-600 mb-6">Keep it clean. Mandatory first.</p>

            {/* Customer Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Customer Type *</label>
              <select
                value={customerForm.customer_type}
                onChange={(e) => setCustomerForm({...customerForm, customer_type: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select customer type</option>
                <option value="organization">Organization</option>
                <option value="self">Self</option>
                <option value="optional">Optional (Enter manually)</option>
              </select>
            </div>

            {/* Dynamic Fields Based on Customer Type */}
            <div className="space-y-4">
              {renderCustomerFields()}
            </div>

            {/* Common Optional Fields */}
            {customerForm.customer_type && customerForm.customer_type !== 'optional' && (
              <>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Reference Source</label>
                    <select
                      value={customerForm.reference_source}
                      onChange={(e) => setCustomerForm({...customerForm, reference_source: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="social-media">Social media</option>
                      <option value="advertisement">Advertisement</option>
                      <option value="google">Google</option>
                      <option value="other">Other</option>
                      <option value="reference">Reference</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Reference Details</label>
                  <textarea
                    value={customerForm.reference_details}
                    onChange={(e) => setCustomerForm({...customerForm, reference_details: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Walk-in / Google / Camp / Insurance desk / Doctor referral..."
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Staff Reference *</label>
                  <select
                    value={customerForm.staff_reference || ''}
                    onChange={(e) => setCustomerForm({...customerForm, staff_reference: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select staff member</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} - {user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (editingCustomer ? 'Updating...' : 'Creating...') : (editingCustomer ? 'Update Customer' : 'Create Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
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
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xl font-medium text-blue-600">
                      {(viewingCustomer.customer_type === 'organization' ? viewingCustomer.org_name : viewingCustomer.name)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-medium text-gray-900">
                    {viewingCustomer.customer_type === 'organization' ? viewingCustomer.org_name : viewingCustomer.name}
                  </h4>
                  <p className="text-sm text-gray-500 capitalize">{viewingCustomer.customer_type} Customer</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.customer_type === 'organization' ? viewingCustomer.org_mobile : viewingCustomer.mobile}</p>
                  {viewingCustomer.email && <p className="text-sm text-gray-600">{viewingCustomer.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    viewingCustomer.status === 'approved' ? 'bg-green-100 text-green-800' :
                    viewingCustomer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {viewingCustomer.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Reference Source</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.reference_source || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingCustomer.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {viewingCustomer.reference_details && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Reference Details</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.reference_details}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleCancel();
                    handleEdit(viewingCustomer);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Edit Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}