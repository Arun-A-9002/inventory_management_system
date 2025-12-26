import { useState, useEffect } from 'react';
import api from '../../api';

export default function CustomerRegistration() {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Customer Management</h1>
            <p className="text-gray-600">Manage customer registrations and information.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
          >
            + New Customer
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">Customer</th>
                <th className="text-left p-4 font-medium text-gray-700">Type</th>
                <th className="text-left p-4 font-medium text-gray-700">Contact</th>
                <th className="text-left p-4 font-medium text-gray-700">Reference</th>
                <th className="text-left p-4 font-medium text-gray-700">Created</th>
                <th className="text-left p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No customers found. Click "New Customer" to add one.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">
                        {customer.customer_type === 'organization' ? customer.org_name : customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.customer_type === 'organization' ? customer.org_type : customer.type}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm capitalize">
                        {customer.customer_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>{customer.customer_type === 'organization' ? customer.org_mobile : customer.mobile}</div>
                      <div className="text-sm text-gray-500">{customer.email || '—'}</div>
                    </td>
                    <td className="p-4">
                      <div>{customer.reference_source || '—'}</div>
                      <div className="text-sm text-gray-500">{customer.reference_details || '—'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={customer.status || 'pending'}
                        onChange={(e) => updateCustomerStatus(customer.id, e.target.value)}
                        className={`text-sm border rounded px-2 py-1 ${
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}