import { useState, useEffect } from "react";
import api from "../../api";
import { getCountries, getStates, getCities } from "../../utils/locationData";

export default function Vendor() {
  const [activeTab, setActiveTab] = useState("Registration");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [qualificationForm, setQualificationForm] = useState({
    vendor_id: "",
    approval_status: "Pending",
    category: "",
    risk_category: "Low",
    audit_status: "Pending",
    notes: ""
  });
  const [editingQualification, setEditingQualification] = useState(null);
  const [qualifications, setQualifications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [items, setItems] = useState([]);
  const [contractItemForm, setContractItemForm] = useState({
    vendor_id: "",
    contract_type: "Annual",
    start_date: "",
    end_date: "",
    item_id: "",
    contract_price: 0,
    moq: 0
  });
  const [performanceForm, setPerformanceForm] = useState({
    vendor_id: "",
    delivery_quality: 4,
    delivery_timeliness: 4,
    response_time: 4,
    pricing_competitiveness: 5,
    compliance: 4,
    comments: ""
  });
  const [editingPerformance, setEditingPerformance] = useState(null);
  const [performances, setPerformances] = useState([]);

  const StarRating = ({ rating, onRatingChange, label }) => {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className={`text-2xl transition-colors hover:text-yellow-400 ${
                star <= rating ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  const tabs = [
    { id: "Registration", name: "Vendor Registration", icon: "👥" },
    { id: "Qualification", name: "Qualification (AVL)", icon: "✅" },
    { id: "Contract", name: "Contract Management", icon: "📋" },
    { id: "Performance", name: "Performance Tracking", icon: "📊" }
  ];

  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    country: "",
    state: "",
    city: "",
    pan_number: "",
    gst_number: ""
  });
  


  useEffect(() => {
    loadVendors();
    loadQualifications();
    loadContracts();
    loadItems();
    loadPerformances();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      console.log("Loading vendors...");
      const res = await api.get("/vendors/");
      console.log("API Response:", res);
      console.log("Vendor data:", res.data);
      setVendors(res.data || []);
      console.log("Vendors state updated:", res.data?.length || 0, "vendors");
    } catch (err) {
      console.error("Error loading vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  
  const resetForm = () => {
    setVendorForm({
      vendor_name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      country: "",
      state: "",
      city: "",
      pan_number: "",
      gst_number: ""
    });
    setAvailableStates([]);
    setAvailableCities([]);
    setEditingId(null);
  };
  
  const handleCountryChange = (country) => {
    const states = getStates(country);
    setVendorForm({
      ...vendorForm,
      country,
      state: "",
      city: ""
    });
    setAvailableStates(states);
    setAvailableCities([]);
  };
  
  const handleStateChange = (state) => {
    const cities = getCities(vendorForm.country, state);
    setVendorForm({
      ...vendorForm,
      state,
      city: ""
    });
    setAvailableCities(cities);
  };

  const registerVendor = async () => {
    if (!vendorForm.vendor_name || !vendorForm.phone || !vendorForm.email) {
      return alert("Vendor name, phone, and email are required");
    }

    try {
      if (editingId) {
        await api.put(`/vendors/${editingId}`, vendorForm);
      } else {
        await api.post("/vendors/", vendorForm);
      }
      resetForm();
      loadVendors();
      alert("Vendor saved successfully");
    } catch (err) {
      console.error(err);
      alert("Error saving vendor");
    }
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor.id);
    const country = vendor.country || "";
    const state = vendor.state || "";
    
    setVendorForm({
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || "",
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address || "",
      country,
      state,
      city: vendor.city || "",
      pan_number: vendor.pan_number || "",
      gst_number: vendor.gst_number || ""
    });
    
    if (country) {
      const states = getStates(country);
      setAvailableStates(states);
      if (state) {
        const cities = getCities(country, state);
        setAvailableCities(cities);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await api.delete(`/vendors/${id}`);
      loadVendors();
    } catch (err) {
      console.error(err);
      alert("Failed to delete vendor");
    }
  };

  const loadQualifications = async () => {
    try {
      const res = await api.get("/vendors/qualification");
      setQualifications(res.data || []);
    } catch (err) {
      console.error("Error loading qualifications:", err);
    }
  };

  const loadContracts = async () => {
    try {
      const res = await api.get("/vendors/contract");
      setContracts(res.data || []);
    } catch (err) {
      console.error("Error loading contracts:", err);
    }
  };

  const loadItems = async () => {
    try {
      const res = await api.get("/items");
      setItems(res.data || []);
    } catch (err) {
      console.error("Error loading items:", err);
    }
  };

  const saveQualification = async () => {
    if (!qualificationForm.vendor_id) {
      return alert("Please select a vendor");
    }

    try {
      if (editingQualification) {
        await api.put(`/vendors/qualification/${editingQualification.id}`, qualificationForm);
      } else {
        await api.post("/vendors/qualification", qualificationForm);
      }
      setQualificationForm({
        vendor_id: "",
        approval_status: "Pending",
        category: "",
        risk_category: "Low",
        audit_status: "Pending",
        notes: ""
      });
      setEditingQualification(null);
      loadQualifications();
      alert("Vendor qualification saved successfully");
    } catch (err) {
      console.error(err);
      alert("Error saving qualification");
    }
  };

  const editQualification = (qual) => {
    setEditingQualification(qual);
    setQualificationForm({
      vendor_id: qual.vendor_id.toString(),
      approval_status: qual.approval_status,
      category: qual.category,
      risk_category: qual.risk_category,
      audit_status: qual.audit_status,
      notes: qual.notes || ""
    });
  };

  const deleteQualification = async (id) => {
    if (!window.confirm("Delete this qualification?")) return;
    try {
      await api.delete(`/vendors/qualification/${id}`);
      loadQualifications();
    } catch (err) {
      alert("Failed to delete qualification");
    }
  };

  const saveContractWithItem = async () => {
    if (!contractItemForm.vendor_id || !contractItemForm.item_id || !contractItemForm.start_date || !contractItemForm.end_date) {
      return alert("Please fill all required fields");
    }

    try {
      // First create contract
      const contractRes = await api.post("/vendors/contract", {
        vendor_id: parseInt(contractItemForm.vendor_id),
        contract_type: contractItemForm.contract_type,
        start_date: contractItemForm.start_date,
        end_date: contractItemForm.end_date
      });
      
      console.log("Contract created:", contractRes.data);
      
      // Get contract ID from response
      const contractId = contractRes.data.id;
      
      if (contractId) {
        // Get item name from items array
        const selectedItem = items.find(item => item.id === parseInt(contractItemForm.item_id));
        
        // Then add item to contract
        await api.post("/vendors/contract/item", {
          contract_id: contractId,
          item_name: selectedItem?.name || "Unknown Item",
          contract_price: contractItemForm.contract_price,
          currency: "INR",
          moq: contractItemForm.moq
        });
      }
      
      setContractItemForm({
        vendor_id: "",
        contract_type: "Annual",
        start_date: "",
        end_date: "",
        item_id: "",
        contract_price: 0,
        moq: 0
      });
      
      loadContracts();
      alert("Contract with item created successfully");
    } catch (err) {
      console.error("Error details:", err.response?.data || err.message);
      alert("Error creating contract with item: " + (err.response?.data?.detail || err.message));
    }
  };

  const loadPerformances = async () => {
    try {
      const res = await api.get("/vendors/performance");
      setPerformances(res.data || []);
    } catch (err) {
      console.error("Error loading performances:", err);
    }
  };

  const savePerformance = async () => {
    if (!performanceForm.vendor_id) {
      return alert("Please select a vendor");
    }

    try {
      const overall_rating = (
        performanceForm.delivery_quality +
        performanceForm.delivery_timeliness +
        performanceForm.response_time +
        performanceForm.pricing_competitiveness +
        performanceForm.compliance
      ) / 5;

      const data = {
        ...performanceForm,
        vendor_id: parseInt(performanceForm.vendor_id),
        overall_rating: parseFloat(overall_rating.toFixed(1))
      };

      if (editingPerformance) {
        await api.put(`/vendors/performance/${editingPerformance.id}`, data);
      } else {
        await api.post("/vendors/performance", data);
      }

      setPerformanceForm({
        vendor_id: "",
        delivery_quality: 4,
        delivery_timeliness: 4,
        response_time: 4,
        pricing_competitiveness: 5,
        compliance: 4,
        comments: ""
      });
      setEditingPerformance(null);

      loadPerformances();
      alert("Performance rating saved successfully");
    } catch (err) {
      console.error(err);
      alert("Error saving performance rating");
    }
  };

  const editPerformance = (perf) => {
    setEditingPerformance(perf);
    setPerformanceForm({
      vendor_id: perf.vendor_id.toString(),
      delivery_quality: perf.delivery_quality,
      delivery_timeliness: perf.delivery_timeliness,
      response_time: perf.response_time,
      pricing_competitiveness: perf.pricing_competitiveness,
      compliance: perf.compliance,
      comments: perf.comments || ""
    });
  };

  const deletePerformance = async (id) => {
    if (!window.confirm("Delete this performance rating?")) return;
    try {
      await api.delete(`/vendors/performance/${id}`);
      loadPerformances();
    } catch (err) {
      alert("Failed to delete performance rating");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">Vendor Management</div>
              <h1 className="text-3xl font-semibold mt-2">Vendor Registration</h1>
              <p className="mt-2 opacity-90">Register and manage your vendors and suppliers.</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">Vendors</span>
                <div className="ml-4 bg-white/20 px-3 py-1 rounded-full text-sm">{vendors.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "Registration" && (
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT — CREATE / EDIT FORM */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">{editingId ? "Edit Vendor" : "Register New Vendor"}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name *</label>
                <input 
                  value={vendorForm.vendor_name}
                  onChange={(e)=>setVendorForm({...vendorForm,vendor_name:e.target.value})} 
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter vendor name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input 
                  value={vendorForm.contact_person}
                  onChange={(e)=>setVendorForm({...vendorForm,contact_person:e.target.value})} 
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contact person name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <input 
                    value={vendorForm.phone}
                    onChange={(e)=>setVendorForm({...vendorForm,phone:e.target.value})} 
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input 
                    type="email"
                    value={vendorForm.email}
                    onChange={(e)=>setVendorForm({...vendorForm,email:e.target.value})} 
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Email address"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea 
                  value={vendorForm.address}
                  onChange={(e)=>setVendorForm({...vendorForm,address:e.target.value})} 
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Complete address"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <select 
                    value={vendorForm.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Country</option>
                    {getCountries().map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <select 
                    value={vendorForm.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    disabled={!vendorForm.country}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select State</option>
                    {availableStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <select 
                    value={vendorForm.city}
                    onChange={(e) => setVendorForm({...vendorForm, city: e.target.value})}
                    disabled={!vendorForm.state}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select City</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                  <input 
                    value={vendorForm.pan_number}
                    onChange={(e)=>setVendorForm({...vendorForm,pan_number:e.target.value})} 
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="PAN Number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                  <input 
                    value={vendorForm.gst_number}
                    onChange={(e)=>setVendorForm({...vendorForm,gst_number:e.target.value})} 
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="GST Number"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button 
                onClick={registerVendor} 
                className="flex-1 rounded-full bg-green-600 text-white px-6 py-2 hover:bg-green-700 transition-colors"
              >
                {editingId ? "Update Vendor" : "Register Vendor"}
              </button>
              {editingId && (
                <button 
                  onClick={resetForm} 
                  className="rounded-full border border-gray-300 px-6 py-2 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — VENDORS LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Registered Vendors</h3>
              <button 
                onClick={loadVendors}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            <div className="mb-2 text-sm text-slate-600">
              Debug: vendors.length = {vendors.length}, loading = {loading.toString()}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">#</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Vendor Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Contact</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="border border-gray-300 px-4 py-6 text-center">Loading...</td></tr>
                  ) : vendors.length === 0 ? (
                    <tr><td colSpan={6} className="border border-gray-300 px-4 py-6 text-center text-slate-500">No vendors found</td></tr>
                  ) : (
                    vendors.map((vendor, idx) => (
                      <tr key={vendor.id} className="hover:bg-slate-50">
                        <td className="border border-gray-300 px-4 py-2">{idx + 1}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="font-medium">{vendor.vendor_name}</div>
                          <div className="text-sm text-slate-500">{vendor.vendor_code}</div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="text-sm">{vendor.contact_person}</div>
                          <div className="text-xs text-slate-500">{vendor.phone}</div>
                          <div className="text-xs text-slate-500">{vendor.email}</div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="text-sm">{vendor.city}, {vendor.state}</div>
                          <div className="text-xs text-slate-500">{vendor.country}</div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            {vendor.verification_status || "Pending"}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => handleEdit(vendor)} 
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit Vendor"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDelete(vendor.id)} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Vendor"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-slate-500">Showing {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}.</div>
          </div>
        </div>
      </div>
      )}

      {/* QUALIFICATION TAB */}
      {activeTab === "Qualification" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Vendor Qualification</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Vendor *</label>
                  <select 
                    value={qualificationForm.vendor_id}
                    onChange={(e) => setQualificationForm({...qualificationForm, vendor_id: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose vendor to qualify</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Approval Status</label>
                  <select 
                    value={qualificationForm.approval_status}
                    onChange={(e) => setQualificationForm({...qualificationForm, approval_status: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input 
                    value={qualificationForm.category}
                    onChange={(e) => setQualificationForm({...qualificationForm, category: e.target.value})}
                    placeholder="Vendor category" 
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Risk Category</label>
                  <select 
                    value={qualificationForm.risk_category}
                    onChange={(e) => setQualificationForm({...qualificationForm, risk_category: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Audit Status</label>
                  <select 
                    value={qualificationForm.audit_status}
                    onChange={(e) => setQualificationForm({...qualificationForm, audit_status: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea 
                    value={qualificationForm.notes}
                    onChange={(e) => setQualificationForm({...qualificationForm, notes: e.target.value})}
                    placeholder="Qualification notes and remarks" 
                    rows={4}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={saveQualification}
                    className="flex-1 rounded-full bg-green-600 text-white px-6 py-2 hover:bg-green-700"
                  >
                    {editingQualification ? 'Update' : 'Save'} Qualification
                  </button>
                  {editingQualification && (
                    <button 
                      onClick={() => {
                        setEditingQualification(null);
                        setQualificationForm({
                          vendor_id: "",
                          approval_status: "Pending",
                          category: "",
                          risk_category: "Low",
                          audit_status: "Pending",
                          notes: ""
                        });
                      }}
                      className="rounded-full border border-gray-300 px-6 py-2 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Qualified Vendors</h3>
              <div className="space-y-3">
                {qualifications.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">No qualifications found</div>
                ) : (
                  qualifications.map((qual) => {
                    const vendor = vendors.find(v => v.id === qual.vendor_id);
                    return (
                      <div key={qual.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{vendor?.vendor_name || 'Unknown Vendor'}</div>
                            <div className="text-sm text-slate-500">{qual.category}</div>
                            <div className="text-xs text-slate-400">Risk: {qual.risk_category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              qual.approval_status === 'Approved' ? 'bg-green-100 text-green-800' :
                              qual.approval_status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {qual.approval_status}
                            </span>
                            <button
                              onClick={() => editQualification(qual)}
                              className="text-xs px-2 py-1 rounded border hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteQualification(qual.id)}
                              className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTRACT TAB */}
      {activeTab === "Contract" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Create Contract with Item</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Vendor *</label>
                  <select 
                    value={contractItemForm.vendor_id}
                    onChange={(e) => setContractItemForm({...contractItemForm, vendor_id: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type</label>
                  <select 
                    value={contractItemForm.contract_type}
                    onChange={(e) => setContractItemForm({...contractItemForm, contract_type: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Annual">Annual Contract</option>
                    <option value="Project">Project Based</option>
                    <option value="Monthly">Monthly Contract</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                    <input 
                      type="date" 
                      value={contractItemForm.start_date}
                      onChange={(e) => setContractItemForm({...contractItemForm, start_date: e.target.value})}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                    <input 
                      type="date" 
                      value={contractItemForm.end_date}
                      onChange={(e) => setContractItemForm({...contractItemForm, end_date: e.target.value})}
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Item *</label>
                  <select 
                    value={contractItemForm.item_id}
                    onChange={(e) => setContractItemForm({...contractItemForm, item_id: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose item from Item Master</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.item_code})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contract Price</label>
                    <input 
                      type="number" 
                      value={contractItemForm.contract_price}
                      onChange={(e) => setContractItemForm({...contractItemForm, contract_price: parseFloat(e.target.value) || 0})}
                      placeholder="0.00" 
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">MOQ</label>
                    <input 
                      type="number" 
                      value={contractItemForm.moq}
                      onChange={(e) => setContractItemForm({...contractItemForm, moq: parseInt(e.target.value) || 0})}
                      placeholder="Minimum order quantity" 
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={saveContractWithItem}
                  className="w-full rounded-full bg-green-600 text-white px-6 py-2 hover:bg-green-700"
                >
                  Create Contract with Item
                </button>
              </div>
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Active Contracts</h3>
              <div className="space-y-3">
                {contracts.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">No contracts found</div>
                ) : (
                  contracts.map((contract) => {
                    const vendor = vendors.find(v => v.id === contract.vendor_id);
                    return (
                      <div key={contract.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{vendor?.vendor_name || 'Unknown Vendor'}</div>
                            <div className="text-sm text-slate-500">{contract.contract_type} Contract</div>
                            <div className="text-xs text-slate-400">{contract.start_date} - {contract.end_date}</div>
                          </div>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === "Performance" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Rate Vendor Performance</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Vendor *</label>
                  <select 
                    value={performanceForm.vendor_id}
                    onChange={(e) => setPerformanceForm({...performanceForm, vendor_id: e.target.value})}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose vendor to rate</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                    ))}
                  </select>
                </div>
                
                <StarRating 
                  rating={performanceForm.delivery_quality}
                  onRatingChange={(rating) => setPerformanceForm({...performanceForm, delivery_quality: rating})}
                  label="Delivery Quality"
                />
                
                <StarRating 
                  rating={performanceForm.delivery_timeliness}
                  onRatingChange={(rating) => setPerformanceForm({...performanceForm, delivery_timeliness: rating})}
                  label="Delivery Timeliness"
                />
                
                <StarRating 
                  rating={performanceForm.response_time}
                  onRatingChange={(rating) => setPerformanceForm({...performanceForm, response_time: rating})}
                  label="Response Time"
                />
                
                <StarRating 
                  rating={performanceForm.pricing_competitiveness}
                  onRatingChange={(rating) => setPerformanceForm({...performanceForm, pricing_competitiveness: rating})}
                  label="Pricing Competitiveness"
                />
                
                <StarRating 
                  rating={performanceForm.compliance}
                  onRatingChange={(rating) => setPerformanceForm({...performanceForm, compliance: rating})}
                  label="Compliance"
                />
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
                  <textarea 
                    value={performanceForm.comments}
                    onChange={(e) => setPerformanceForm({...performanceForm, comments: e.target.value})}
                    placeholder="Performance feedback and comments" 
                    rows={4}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={savePerformance}
                    className="flex-1 rounded-full bg-green-600 text-white px-6 py-2 hover:bg-green-700"
                  >
                    {editingPerformance ? 'Update' : 'Save'} Performance Rating
                  </button>
                  {editingPerformance && (
                    <button 
                      onClick={() => {
                        setEditingPerformance(null);
                        setPerformanceForm({
                          vendor_id: "",
                          delivery_quality: 4,
                          delivery_timeliness: 4,
                          response_time: 4,
                          pricing_competitiveness: 5,
                          compliance: 4,
                          comments: ""
                        });
                      }}
                      className="rounded-full border border-gray-300 px-6 py-2 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
              <div className="space-y-4">
                {performances.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">No performance ratings found</div>
                ) : (
                  performances.map((perf) => {
                    const vendor = vendors.find(v => v.id === perf.vendor_id);
                    return (
                      <div key={perf.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{vendor?.vendor_name || 'Unknown Vendor'}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => editPerformance(perf)}
                              className="text-xs px-2 py-1 rounded border hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deletePerformance(perf.id)}
                              className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Quality: <span className="font-medium">{perf.delivery_quality}/5</span></div>
                          <div>Timeliness: <span className="font-medium">{perf.delivery_timeliness}/5</span></div>
                          <div>Response: <span className="font-medium">{perf.response_time}/5</span></div>
                          <div>Pricing: <span className="font-medium">{perf.pricing_competitiveness}/5</span></div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm text-slate-600">Overall Rating: <span className="font-medium text-green-600">{perf.overall_rating}/5</span></div>
                          {perf.comments && (
                            <div className="text-xs text-slate-500 mt-1">{perf.comments}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}