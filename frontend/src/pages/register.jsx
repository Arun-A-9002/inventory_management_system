import React, { useEffect, useState } from "react";
import { CheckCircle, Building, MapPin, User, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";

/* ---------- Popup component ---------- */
const Popup = ({ type = "error", message = "", onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
      <div className="flex items-center justify-center mb-4">
        {type === "success" ? (
          <CheckCircle className="w-12 h-12 text-green-500" />
        ) : (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
        )}
      </div>
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${
          type === "success" ? "text-green-800" : "text-red-800"
        }`}>
          {type === "success" ? "Success!" : "Error"}
        </h3>
        <p className="text-gray-600 whitespace-pre-wrap">{String(message)}</p>
      </div>
      <button
        onClick={onClose}
        className={`w-full py-3 rounded-xl font-medium transition-colors ${
          type === "success" 
            ? "bg-green-500 hover:bg-green-600 text-white" 
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        Close
      </button>
    </div>
  </div>
);

/* ---------- Helper validators ---------- */
const validators = {
  required: (v) => v?.trim() !== "",
  pincode: (v) => /^\d{6}$/.test(v),
  phone: (v) => /^\d{10}$/.test(v),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.endsWith(".com"),
  password: (v) =>
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /\d/.test(v) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(v),
  city: (v) => v?.trim() !== "",
  state: (v) => v?.trim() !== "",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Puducherry", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
  "Andaman and Nicobar Islands"
];

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad",
  "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot",
  "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
  "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada",
  "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubballi-Dharwad",
  "Tiruchirappalli", "Bareilly", "Mysore", "Tiruppur", "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar",
  "Salem", "Warangal", "Guntur", "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati",
  "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar",
  "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola",
  "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar", "Jammu",
  "Sangli-Miraj & Kupwad", "Mangalore", "Erode", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon",
  "Gaya", "Jalgaon", "Udaipur", "Maheshtala"
];

export default function Register() {

  /* ---------- SECRET KEY PROTECTION ---------- */
  const SECRET_KEY = "9002";
  const [keyInput, setKeyInput] = useState("");
  const [verified, setVerified] = useState(false);

  const verifyKey = () => {
    if (keyInput === SECRET_KEY) {
      setVerified(true);
    } else {
      setPopup({
        show: true,
        type: "error",
        message: "Invalid secret key. Access denied."
      });
    }
  };

  /* ---------- FORM DATA ---------- */
  const initial = {
    organization_name: "",
    organization_type: "",
    organization_license_number: "",
    organization_address: "",
    city: "",
    state: "",
    pincode: "",
    contact_phone: "",
    contact_email: "",
    tenant_code: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_secondary_phone: "",
    designation: "",
    status: "Active",
    password: "",
  };

  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem("org_register_form");
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [popup, setPopup] = useState({ show: false, type: "error", message: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("org_register_form", JSON.stringify(form));
    } catch {}
  }, [form]);

  const getPasswordStrength = (pw = form.password) => {
    if (!pw) return "";
    let score = 0;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;
    if (score >= 4 && pw.length >= 8) return "Strong";
    if (score >= 2 && pw.length >= 6) return "Medium";
    return "Weak";
  };

  /* ---------- INPUT HANDLING ---------- */
  const handleChange = (e) => {
    const name = e.target.name;
    let value = e.target.value;

    if (["contact_phone", "admin_phone", "admin_secondary_phone"].includes(name)) {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "pincode") value = value.replace(/\D/g, "").slice(0, 6);

    if (name === "contact_email" || name === "admin_email")
      value = value.toLowerCase().trim();

    setForm((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let msg = "";

    if (!validators.required(value)) msg = "Field required";
    else {
      if (name === "pincode" && !validators.pincode(value))
        msg = "Pincode must be 6 digits.";

      if (
        ["contact_phone", "admin_phone", "admin_secondary_phone"].includes(name) &&
        !validators.phone(value)
      )
        msg = "Phone must be 10 digits.";

      if (["contact_email", "admin_email"].includes(name) && !validators.email(value))
        msg = "Invalid email format.";

      if (name === "password" && !validators.password(value))
        msg = "Password must include A-Z, a-z, number, special char.";

      if (name === "city" && !validators.city(value)) msg = "Choose valid city.";

      if (name === "state" && !validators.state(value)) msg = "Choose valid state.";
    }

    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg === "";
  };

  const validateStep = (current) => {
    const fields = [
      ["organization_name", "organization_type", "organization_license_number", "contact_phone", "contact_email"],
      ["organization_address", "city", "state", "pincode"],
      ["admin_name", "admin_email", "admin_phone", "admin_secondary_phone", "designation", "status", "password", "tenant_code"],
    ][current];

    let ok = true;
    fields.forEach((f) => {
      if (!validateField(f, form[f])) ok = false;
    });

    return ok;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      setPopup({
        show: true,
        type: "error",
        message: "Fix the errors before continuing.",
      });
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  /* ---------- SUBMIT ---------- */
  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // eslint-disable-next-line no-unused-vars
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPopup({
          show: true,
          type: "error",
          message: "Backend validation failed.",
        });
        return;
      }

      const emailStatus = data.email_sent ? 
        "\n\nA confirmation email has been sent to your admin email address." : 
        "\n\nNote: Confirmation email could not be sent, but registration was successful.";

      setPopup({
        show: true,
        type: "success",
        message: `Organization registered successfully!${emailStatus}`,
      });

      localStorage.removeItem("org_register_form");
    } catch {
      setPopup({
        show: true,
        type: "error",
        message: "Backend not reachable.",
      });
    }
  };

  /* ---------- UI COMPONENTS ---------- */

  const StepHeader = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {[
            { icon: Building, label: "Company" },
            { icon: MapPin, label: "Address" },
            { icon: User, label: "Admin" }
          ].map((stepInfo, i) => {
            const Icon = stepInfo.icon;
            return (
              <div key={i} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  step === i
                    ? "bg-blue-600 text-white shadow-lg"
                    : step > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {step > i ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {i < 2 && (
                  <div className={`w-16 h-1 mx-2 rounded-full transition-all ${
                    step > i ? "bg-green-500" : "bg-gray-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-sm font-medium text-gray-500">
          Step {step + 1} of 3
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {[
            "Company Information",
            "Address Details", 
            "Administrator Setup"
          ][step]}
        </h2>
        <p className="text-gray-600">
          {[
            "Tell us about your organization",
            "Where is your business located?",
            "Set up your admin account"
          ][step]}
        </p>
      </div>
    </div>
  );

  /* ---------- SECRET KEY SCREEN ---------- */
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        {popup.show && (
          <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false })} />
        )}

        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Secure Access</h2>
            <p className="text-gray-600">Enter your authorization key to continue</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter access key"
              className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
              onKeyPress={(e) => e.key === 'Enter' && verifyKey()}
            />

            <button
              onClick={verifyKey}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Verify Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- MAIN FORM UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        
        {popup.show && (
          <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false })} />
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Organization Registration</h1>
          <p className="text-gray-600">Join Nutryah's smart inventory management platform</p>
        </div>

        {/* Main Form Card */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 lg:p-12">
            <StepHeader />

            <form onSubmit={handleFinalSubmit} className="space-y-6">

            {/* ---------------- STEP 1 ---------------- */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organization Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organization Name *
                    </label>
                    <input
                      name="organization_name"
                      value={form.organization_name}
                      onChange={handleChange}
                      placeholder="Enter your organization name"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.organization_name && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.organization_name}
                      </p>
                    )}
                  </div>

                  {/* Organization Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organization Type *
                    </label>
                    <input
                      name="organization_type"
                      value={form.organization_type}
                      onChange={handleChange}
                      placeholder="e.g. Clinic, Hospital, Pharmacy"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.organization_type && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.organization_type}
                      </p>
                    )}
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      License Number *
                    </label>
                    <input
                      name="organization_license_number"
                      value={form.organization_license_number}
                      onChange={handleChange}
                      placeholder="Ex: LIC-12345"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.organization_license_number && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.organization_license_number}
                      </p>
                    )}
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contact Phone *
                    </label>
                    <input
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone number"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.contact_phone && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.contact_phone}
                      </p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contact Email *
                    </label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="contact@company.com"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.contact_email && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.contact_email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button 
                    type="button" 
                    onClick={goNext} 
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center"
                  >
                    Next: Address Details
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 2 ---------------- */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      name="organization_address"
                      value={form.organization_address}
                      onChange={handleChange}
                      placeholder="Street, Area, Building details"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.organization_address && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.organization_address}
                      </p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </label>
                    <select
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    >
                      <option value="">Select your city</option>
                      {INDIAN_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.city}
                      </p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    >
                      <option value="">Select your state</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.state}
                      </p>
                    )}
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.pincode && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.pincode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button 
                    type="button" 
                    onClick={goBack} 
                    className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={goNext} 
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center"
                  >
                    Next: Admin Setup
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 3 ---------------- */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Admin Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Administrator Name *
                    </label>
                    <input
                      name="admin_name"
                      value={form.admin_name}
                      onChange={handleChange}
                      placeholder="Full name of administrator"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.admin_name && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.admin_name}
                      </p>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Designation *
                    </label>
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={handleChange}
                      placeholder="Owner, Manager, Director"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.designation && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.designation}
                      </p>
                    )}
                  </div>

                  {/* Admin Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Primary Phone *
                    </label>
                    <input
                      name="admin_phone"
                      value={form.admin_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone number"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.admin_phone && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.admin_phone}
                      </p>
                    )}
                  </div>

                  {/* Secondary Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Secondary Phone *
                    </label>
                    <input
                      name="admin_secondary_phone"
                      value={form.admin_secondary_phone}
                      onChange={handleChange}
                      placeholder="Backup phone number"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.admin_secondary_phone && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.admin_secondary_phone}
                      </p>
                    )}
                  </div>

                  {/* Admin Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Administrator Email *
                    </label>
                    <input
                      name="admin_email"
                      value={form.admin_email}
                      onChange={handleChange}
                      placeholder="admin@company.com"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.admin_email && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.admin_email}
                      </p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contact Email *
                    </label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="contact@company.com"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.contact_email && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.contact_email}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status *
                    </label>
                    <input
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      placeholder="Active"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.status && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.status}
                      </p>
                    )}
                  </div>

                  {/* Tenant Code */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tenant Code *
                    </label>
                    <input
                      name="tenant_code"
                      value={form.tenant_code}
                      onChange={handleChange}
                      placeholder="Unique tenant identifier"
                      className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                    {errors.tenant_code && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.tenant_code}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Create a strong password"
                        className="w-full border-2 border-gray-200 rounded-xl p-4 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden`}>
                        <div className={`h-full transition-all ${
                          getPasswordStrength() === "Strong" ? "w-full bg-green-500" :
                          getPasswordStrength() === "Medium" ? "w-2/3 bg-yellow-500" :
                          getPasswordStrength() === "Weak" ? "w-1/3 bg-red-500" : "w-0"
                        }`} />
                      </div>
                      <span className={`text-sm font-medium ${
                        getPasswordStrength() === "Strong" ? "text-green-600" :
                        getPasswordStrength() === "Medium" ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {getPasswordStrength() || "Enter password"}
                      </span>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="mr-1">⚠</span> {errors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button 
                    type="button" 
                    onClick={goBack} 
                    className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl flex items-center"
                  >
                    Complete Registration
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
