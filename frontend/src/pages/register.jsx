import React, { useEffect, useState } from "react";

/* ---------- Popup component ---------- */
const Popup = ({ type = "error", message = "", onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
    <div
      className={`p-6 rounded-xl shadow-xl text-white text-base font-medium max-w-lg text-center ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      <div style={{ whiteSpace: "pre-wrap" }}>{String(message)}</div>
      <button
        onClick={onClose}
        className="mt-4 inline-block bg-white text-black px-4 py-2 rounded-lg"
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
  city: (v) => ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"].includes(v),
  state: (v) =>
    ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(v),
};

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
      ["admin_name", "admin_email", "admin_phone", "admin_secondary_phone", "designation", "status", "password"],
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

      setPopup({
        show: true,
        type: "success",
        message: "Organization registered successfully.",
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
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-3 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded-full ${
              step === i
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-500">Step {step + 1} of 3</div>
    </div>
  );

  /* ---------- SECRET KEY SCREEN ---------- */
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100 p-6">
        {popup.show && (
          <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false })} />
        )}

        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Enter Secret Key</h2>

          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Enter secure access key"
            className="w-full border rounded-xl p-3 bg-gray-50 mb-4"
          />

          <button
            onClick={verifyKey}
            className="bg-blue-600 text-white w-full py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            Verify Key
          </button>
        </div>
      </div>
    );
  }

  /* ---------- MAIN FORM UI ---------- */
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* LEFT SIDE BLUE PANEL */}
      <div className="hidden lg:flex bg-blue-100 relative">
        <div className="flex flex-col items-center justify-center text-center px-10">
          <h1 className="text-blue-800 text-4xl font-bold mb-4 leading-snug">
            Empowering Organization With  
            <br /> Smart, Connected Nutryah
          </h1>
          <p className="text-black text-lg max-w-md">
            Nutryah provides advanced automation,
            modern patient management and real-time monitoring tools.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="w-full flex justify-center items-center p-6 bg-blue-100 overflow-y-auto">

        {popup.show && (
          <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false })} />
        )}

        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-3xl">
          <StepHeader />

          <form onSubmit={handleFinalSubmit}>

            {/* ---------------- STEP 1 ---------------- */}
            {step === 0 && (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">
                  Company Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Organization Name */}
                  <div>
                    <label className="block mb-1 font-medium">Organization Name</label>
                    <input
                      name="organization_name"
                      value={form.organization_name}
                      onChange={handleChange}
                      placeholder="Enter organization name"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.organization_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.organization_name}</p>
                    )}
                  </div>

                  {/* Organization Type */}
                  <div>
                    <label className="block mb-1 font-medium">Organization Type</label>
                    <input
                      name="organization_type"
                      value={form.organization_type}
                      onChange={handleChange}
                      placeholder="e.g. Clinic, Company"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.organization_type && (
                      <p className="text-red-500 text-xs mt-1">{errors.organization_type}</p>
                    )}
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block mb-1 font-medium">License Number</label>
                    <input
                      name="organization_license_number"
                      value={form.organization_license_number}
                      onChange={handleChange}
                      placeholder="Ex: LIC-12345"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.organization_license_number && (
                      <p className="text-red-500 text-xs mt-1">{errors.organization_license_number}</p>
                    )}
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block mb-1 font-medium">Contact Phone</label>
                    <input
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.contact_phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.contact_phone}</p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">Contact Email</label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="example@company.com"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.contact_email && (
                      <p className="text-red-500 text-xs mt-1">{errors.contact_email}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button type="button" onClick={goNext} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                    Next: Address
                  </button>
                </div>
              </>
            )}

            {/* ---------------- STEP 2 ---------------- */}
            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">
                  Address Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">Address</label>
                    <input
                      name="organization_address"
                      value={form.organization_address}
                      onChange={handleChange}
                      placeholder="Street / Area / Building"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.organization_address && (
                      <p className="text-red-500 text-xs mt-1">{errors.organization_address}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block mb-1 font-medium">City</label>
                    <select
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    >
                      <option value="">Select City</option>
                      <option>Chennai</option>
                      <option>Coimbatore</option>
                      <option>Madurai</option>
                      <option>Trichy</option>
                      <option>Salem</option>
                    </select>
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block mb-1 font-medium">State</label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    >
                      <option value="">Select State</option>
                      <option>Tamil Nadu</option>
                      <option>Kerala</option>
                      <option>Karnataka</option>
                      <option>Andhra Pradesh</option>
                      <option>Telangana</option>
                    </select>
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block mb-1 font-medium">Pincode</label>
                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button type="button" onClick={goBack} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300">
                    Back
                  </button>
                  <button type="button" onClick={goNext} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                    Next: Admin
                  </button>
                </div>
              </>
            )}

            {/* ---------------- STEP 3 ---------------- */}
            {step === 2 && (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">
                  Admin Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Admin Name */}
                  <div>
                    <label className="block mb-1 font-medium">Admin Name</label>
                    <input
                      name="admin_name"
                      value={form.admin_name}
                      onChange={handleChange}
                      placeholder="Full name"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.admin_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.admin_name}</p>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block mb-1 font-medium">Designation</label>
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={handleChange}
                      placeholder="Owner / Manager"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.designation && (
                      <p className="text-red-500 text-xs mt-1">{errors.designation}</p>
                    )}
                  </div>

                  {/* Admin Phone */}
                  <div>
                    <label className="block mb-1 font-medium">Admin Phone</label>
                    <input
                      name="admin_phone"
                      value={form.admin_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.admin_phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.admin_phone}</p>
                    )}
                  </div>

                  {/* Secondary Phone */}
                  <div>
                    <label className="block mb-1 font-medium">Admin Secondary Phone</label>
                    <input
                      name="admin_secondary_phone"
                      value={form.admin_secondary_phone}
                      onChange={handleChange}
                      placeholder="Backup phone"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.admin_secondary_phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.admin_secondary_phone}</p>
                    )}
                  </div>

                  {/* Admin Email */}
                  <div>
                    <label className="block mb-1 font-medium">Admin Email</label>
                    <input
                      name="admin_email"
                      value={form.admin_email}
                      onChange={handleChange}
                      placeholder="admin@company.com"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.admin_email && (
                      <p className="text-red-500 text-xs mt-1">{errors.admin_email}</p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block mb-1 font-medium">Contact Email</label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="contact@company.com"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.contact_email && (
                      <p className="text-red-500 text-xs mt-1">{errors.contact_email}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block mb-1 font-medium">Status</label>
                    <input
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      placeholder="Active"
                      className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50"
                    />
                    {errors.status && (
                      <p className="text-red-500 text-xs mt-1">{errors.status}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block mb-1 font-medium">Password</label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Strong password"
                        className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 pr-12"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-3 text-sm text-gray-600"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    <p
                      className={`mt-1 text-sm ${
                        getPasswordStrength() === "Strong"
                          ? "text-green-600"
                          : getPasswordStrength() === "Medium"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {getPasswordStrength()}
                    </p>

                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button type="button" onClick={goBack} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300">
                    Back
                  </button>

                  <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                    Submit
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
