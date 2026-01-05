import { useState, useEffect } from "react";
import api from "../../api";
import { getCountries, getStates, getCities } from "../../utils/locationData";

export default function Vendor() {
  // const [activeTab, setActiveTab] = useState("Registration");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // QUALIFICATION STATES - COMMENTED FOR FUTURE USE
  // const [qualificationForm, setQualificationForm] = useState({
  //   vendor_id: "",
  //   approval_status: "Pending",
  //   category: "",
  //   risk_category: "Low",
  //   audit_status: "Pending",
  //   notes: ""
  // });
  // const [editingQualification, setEditingQualification] = useState(null);
  // const [qualifications, setQualifications] = useState([]);
  
  // PERFORMANCE STATES - COMMENTED FOR FUTURE USE
  // const [performanceForm, setPerformanceForm] = useState({
  //   vendor_id: "",
  //   delivery_quality: 4,
  //   delivery_timeliness: 4,
  //   response_time: 4,
  //   pricing_competitiveness: 5,
  //   compliance: 4,
  //   comments: ""
  // });
  // const [editingPerformance, setEditingPerformance] = useState(null);
  // const [performances, setPerformances] = useState([]);
  
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // STAR RATING COMPONENT - COMMENTED FOR FUTURE USE
  // const StarRating = ({ rating, onRatingChange, label }) => {
  //   return (
  //     <div>
  //       <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
  //       <div className="flex gap-1">
  //         {[1, 2, 3, 4, 5].map((star) => (
  //           <button
  //             key={star}
  //             type="button"
  //             onClick={() => onRatingChange(star)}
  //             className={`text-2xl transition-colors hover:text-yellow-400 ${
  //               star <= rating ? "text-yellow-400" : "text-gray-300"
  //             }`}
  //           >
  //             ★
  //           </button>
  //         ))}
  //       </div>
  //     </div>
  //   );
  // };
  
  // TABS CONFIGURATION - COMMENTED FOR FUTURE USE
  // const tabs = [
  //   { id: "Registration", name: "Vendor Registration", icon: "👥" },
  //   { id: "Qualification", name: "Qualification (AVL)", icon: "✅" },
  //   { id: "Performance", name: "Performance Tracking", icon: "📊" }
  // ];

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
    gst_number: "",
    // Bank Details
    ifsc_code: "",
    account_number: "",
    account_holder_name: "",
    branch_name: ""
  });

  useEffect(() => {
    loadVendors();
    // loadQualifications(); // COMMENTED FOR FUTURE USE
    // loadPerformances(); // COMMENTED FOR FUTURE USE
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await api.get("/vendors/");
      console.log("Raw vendor data:", res.data[0]); // Debug first vendor
      setVendors(res.data || []);
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
      gst_number: "",
      // Bank Details
      ifsc_code: "",
      account_number: "",
      account_holder_name: "",
      branch_name: ""
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
      gst_number: vendor.gst_number || "",
      // Bank Details
      ifsc_code: vendor.ifsc_code || "",
      account_number: vendor.account_number || "",
      account_holder_name: vendor.account_holder_name || "",
      branch_name: vendor.branch_name || ""
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

  const updateVendorStatus = async (vendorId, newStatus) => {
    try {
      const statusValue = newStatus === "Active" ? "active" : "inactive";
      await api.patch(`/vendors/${vendorId}/status?status=${statusValue}`);
      setVendors(prevVendors => 
        prevVendors.map(vendor => 
          vendor.id === vendorId 
            ? { ...vendor, verification_status: statusValue }
            : vendor
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update vendor status");
      loadVendors();
    }
  };

  // QUALIFICATION FUNCTIONS - COMMENTED FOR FUTURE USE
  // const loadQualifications = async () => {
  //   try {
  //     const res = await api.get("/vendors/qualification");
  //     setQualifications(res.data || []);
  //   } catch (err) {
  //     console.error("Error loading qualifications:", err);
  //   }
  // };

  // const saveQualification = async () => {
  //   if (!qualificationForm.vendor_id) {
  //     return alert("Please select a vendor");
  //   }

  //   try {
  //     if (editingQualification) {
  //       await api.put(`/vendors/qualification/${editingQualification.id}`, qualificationForm);
  //     } else {
  //       await api.post("/vendors/qualification", qualificationForm);
  //     }
  //     setQualificationForm({
  //       vendor_id: "",
  //       approval_status: "Pending",
  //       category: "",
  //       risk_category: "Low",
  //       audit_status: "Pending",
  //       notes: ""
  //     });
  //     setEditingQualification(null);
  //     loadQualifications();
  //     alert("Vendor qualification saved successfully");
  //   } catch (err) {
  //     console.error(err);
  //     alert("Error saving qualification");
  //   }
  // };

  // const editQualification = (qual) => {
  //   setEditingQualification(qual);
  //   setQualificationForm({
  //     vendor_id: qual.vendor_id.toString(),
  //     approval_status: qual.approval_status,
  //     category: qual.category,
  //     risk_category: qual.risk_category,
  //     audit_status: qual.audit_status,
  //     notes: qual.notes || ""
  //   });
  // };

  // const deleteQualification = async (id) => {
  //   if (!window.confirm("Delete this qualification?")) return;
  //   try {
  //     await api.delete(`/vendors/qualification/${id}`);
  //     loadQualifications();
  //   } catch (err) {
  //     alert("Failed to delete qualification");
  //   }
  // };

  // PERFORMANCE FUNCTIONS - COMMENTED FOR FUTURE USE
  // const loadPerformances = async () => {
  //   try {
  //     const res = await api.get("/vendors/performance");
  //     setPerformances(res.data || []);
  //   } catch (err) {
  //     console.error("Error loading performances:", err);
  //   }
  // };

  // const savePerformance = async () => {
  //   if (!performanceForm.vendor_id) {
  //     return alert("Please select a vendor");
  //   }

  //   try {
  //     const overall_rating = (
  //       performanceForm.delivery_quality +
  //       performanceForm.delivery_timeliness +
  //       performanceForm.response_time +
  //       performanceForm.pricing_competitiveness +
  //       performanceForm.compliance
  //     ) / 5;

  //     const data = {
  //       ...performanceForm,
  //       vendor_id: parseInt(performanceForm.vendor_id),
  //       overall_rating: parseFloat(overall_rating.toFixed(1))
  //     };

  //     if (editingPerformance) {
  //       await api.put(`/vendors/performance/${editingPerformance.id}`, data);
  //     } else {
  //       await api.post("/vendors/performance", data);
  //     }

  //     setPerformanceForm({
  //       vendor_id: "",
  //       delivery_quality: 4,
  //       delivery_timeliness: 4,
  //       response_time: 4,
  //       pricing_competitiveness: 5,
  //       compliance: 4,
  //       comments: ""
  //     });
  //     setEditingPerformance(null);

  //     loadPerformances();
  //     alert("Performance rating saved successfully");
  //   } catch (err) {
  //     console.error(err);
  //     alert("Error saving performance rating");
  //   }
  // };

  // const editPerformance = (perf) => {
  //   setEditingPerformance(perf);
  //   setPerformanceForm({
  //     vendor_id: perf.vendor_id.toString(),
  //     delivery_quality: perf.delivery_quality,
  //     delivery_timeliness: perf.delivery_timeliness,
  //     response_time: perf.response_time,
  //     pricing_competitiveness: perf.pricing_competitiveness,
  //     compliance: perf.compliance,
  //     comments: perf.comments || ""
  //   });
  // };

  // const deletePerformance = async (id) => {
  //   if (!window.confirm("Delete this performance rating?")) return;
  //   try {
  //     await api.delete(`/vendors/performance/${id}`);
  //     loadPerformances();
  //   } catch (err) {
  //     alert("Failed to delete performance rating");
  //   }
  // };

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

      {/* TABS - COMMENTED FOR FUTURE USE */}
      {/* <div className="mb-6">
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
      </div> */}

      {/* VENDOR REGISTRATION CONTENT */}
      <div className="grid grid-cols-12 gap-6">
        {/* VENDORS LIST */}
        <div className="col-span-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Registered Vendors</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowVendorModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  New Vendor
                </button>
              </div>
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
                    <th className="border border-gray-300 px-4 py-2 text-left">Bank Details</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="border border-gray-300 px-4 py-6 text-center">Loading...</td></tr>
                  ) : vendors.length === 0 ? (
                    <tr><td colSpan={7} className="border border-gray-300 px-4 py-6 text-center text-slate-500">No vendors found</td></tr>
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
                          <div className="text-xs">
                            {vendor.account_holder_name && (
                              <div className="font-medium">{vendor.account_holder_name}</div>
                            )}
                            {vendor.account_number && (
                              <div>A/c: {vendor.account_number}</div>
                            )}
                            {vendor.ifsc_code && (
                              <div>IFSC: {vendor.ifsc_code}</div>
                            )}
                            {vendor.branch_name && (
                              <div className="text-slate-500">{vendor.branch_name}</div>
                            )}
                            {!vendor.account_number && !vendor.ifsc_code && (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <select 
                            value={vendor.verification_status === "active" || vendor.verification_status === "verified" ? "Active" : "Inactive"}
                            onChange={(e) => updateVendorStatus(vendor.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-full border-0 bg-green-100 text-green-800 focus:ring-2 focus:ring-green-500"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowViewModal(true);
                              }} 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
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

      {/* VENDOR REGISTRATION MODAL */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Register New Vendor</h2>
              <button 
                onClick={() => {
                  setShowVendorModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
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
              
              {/* Bank Details Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium text-slate-700 mb-3">Bank Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                    <input 
                      value={vendorForm.ifsc_code}
                      onChange={(e)=>setVendorForm({...vendorForm,ifsc_code:e.target.value})} 
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="IFSC Code"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                    <input 
                      value={vendorForm.account_number}
                      onChange={(e)=>setVendorForm({...vendorForm,account_number:e.target.value})} 
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Account Number"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                    <input 
                      value={vendorForm.account_holder_name}
                      onChange={(e)=>setVendorForm({...vendorForm,account_holder_name:e.target.value})} 
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Account Holder Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                    <input 
                      value={vendorForm.branch_name}
                      onChange={(e)=>setVendorForm({...vendorForm,branch_name:e.target.value})} 
                      className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Branch Name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button 
                onClick={async () => {
                  await registerVendor();
                  setShowVendorModal(false);
                }} 
                className="flex-1 rounded-full bg-green-600 text-white px-6 py-2 hover:bg-green-700 transition-colors"
              >
                Register Vendor
              </button>
              <button 
                onClick={() => {
                  setShowVendorModal(false);
                  resetForm();
                }} 
                className="rounded-full border border-gray-300 px-6 py-2 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR VIEW MODAL */}
      {showViewModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Vendor Details</h2>
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedVendor(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Vendor Code</label>
                  <p className="text-gray-900 font-mono">{selectedVendor.vendor_code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Vendor Name</label>
                  <p className="text-gray-900">{selectedVendor.vendor_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Contact Person</label>
                  <p className="text-gray-900">{selectedVendor.contact_person || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{selectedVendor.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{selectedVendor.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <span className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {selectedVendor.verification_status === "active" || selectedVendor.verification_status === "verified" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Address & Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Address & Location</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{selectedVendor.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">City</label>
                  <p className="text-gray-900">{selectedVendor.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">State</label>
                  <p className="text-gray-900">{selectedVendor.state || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Country</label>
                  <p className="text-gray-900">{selectedVendor.country || 'Not provided'}</p>
                </div>
              </div>

              {/* Tax Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Tax Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600">PAN Number</label>
                  <p className="text-gray-900 font-mono">{selectedVendor.pan_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">GST Number</label>
                  <p className="text-gray-900 font-mono">{selectedVendor.gst_number || 'Not provided'}</p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Bank Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Account Holder Name</label>
                  <p className="text-gray-900">{selectedVendor.account_holder_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Account Number</label>
                  <p className="text-gray-900 font-mono">{selectedVendor.account_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">IFSC Code</label>
                  <p className="text-gray-900 font-mono">{selectedVendor.ifsc_code || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Branch Name</label>
                  <p className="text-gray-900">{selectedVendor.branch_name || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedVendor(null);
                }} 
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUALIFICATION TAB - COMMENTED FOR FUTURE USE */}
      {/* {activeTab === "Qualification" && (
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
      )} */}

      {/* PERFORMANCE TAB - COMMENTED FOR FUTURE USE */}
      {/* {activeTab === "Performance" && (
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
      )} */}
    </div>
  );
}