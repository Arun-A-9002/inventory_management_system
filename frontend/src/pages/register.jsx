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

/* ---------- Helper validators (match backend) ---------- */
const validators = {
  required: (v) => v !== undefined && v !== null && String(v).trim() !== "",
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

  /* ---------------------------------------------------
        🔐 SECRET KEY PROTECTION (NEW)
  -----------------------------------------------------*/
  /* ---------- SECRET KEY PROTECTION ---------- */
const SECRET_KEY = "9002";  // your secret key
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

  /* ---------------------------------------------------
        EXISTING FULL FORM CODE (UNCHANGED)
  -----------------------------------------------------*/

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
  const passwordColor = () => {
    const s = getPasswordStrength();
    if (s === "Strong") return "text-green-600";
    if (s === "Medium") return "text-yellow-600";
    if (s === "Weak") return "text-red-600";
    return "";
  };

  const handleChange = (e) => {
    const name = e.target.name;
    let value = e.target.value;

    if (["contact_phone", "admin_phone", "admin_secondary_phone"].includes(name)) {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }

    if (name === "organization_license_number") value = value.toUpperCase();
    if (name === "contact_email" || name === "admin_email") value = value.toLowerCase().trim();

    setForm((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleFocusMoveEnd = (e) => {
    const el = e.target;
    const val = el.value || "";
    setTimeout(() => {
      try {
        el.setSelectionRange(val.length, val.length);
      } catch {}
    }, 0);
  };

  const validateField = (name, value) => {
    let msg = "";

    if (!validators.required(value)) {
      msg = "Field required";
    } else {
      if (name === "pincode" && !validators.pincode(value))
        msg = "Pincode must be exactly 6 digits.";

      if (
        ["contact_phone", "admin_phone", "admin_secondary_phone"].includes(name) &&
        !validators.phone(value)
      )
        msg = "Phone must be exactly 10 digits.";

      if (
        ["contact_email", "admin_email"].includes(name) &&
        !validators.email(value)
      )
        msg = "Email must contain '@' and end with '.com'";

      if (name === "password" && !validators.password(value))
        msg = "Password must have uppercase, lowercase, number and special character.";

      if (name === "city" && !validators.city(value)) msg = "Choose a valid city.";
      if (name === "state" && !validators.state(value)) msg = "Choose a valid state.";
    }

    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg === "";
  };

  const validateStep = (currentStep) => {
    const stepFields = [
      ["organization_name", "organization_type", "organization_license_number", "contact_phone", "contact_email"],
      ["organization_address", "city", "state", "pincode"],
      ["admin_name", "admin_email", "admin_phone", "admin_secondary_phone", "designation", "status", "password"],
    ];

    const fields = stepFields[currentStep] || [];
    let ok = true;

    fields.forEach((f) => {
      if (!validateField(f, form[f])) ok = false;
    });

    return ok;
  };

  const validateAll = () => {
    const names = Object.keys(initial);
    let ok = true;
    let newErrors = {};

    names.forEach((f) => {
      if (!validators.required(form[f])) {
        newErrors[f] = "Field required";
        ok = false;
      }
    });

    setErrors(newErrors);
    return ok;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      setPopup({
        show: true,
        type: "error",
        message: "Please fix fields in this step before continuing.",
      });
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    if (!validateAll()) {
      setPopup({
        show: true,
        type: "error",
        message: "Fix validation errors before submitting.",
      });
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let message = "Validation failed";
        const newErrors = { ...errors };

        if (Array.isArray(data.detail)) {
          const msgs = data.detail.map((d) => {
            if (Array.isArray(d.loc) && d.loc.length >= 2) {
              const field = d.loc[1];
              newErrors[field] = d.msg;
              return `${field}: ${d.msg}`;
            }
            return d.msg;
          });

          message = msgs.join("\n");
          setErrors(newErrors);
        }

        setPopup({ show: true, type: "error", message });
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

  const StepHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-3 items-center">
        <div className={`px-3 py-1 rounded-full ${step === 0 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>1</div>
        <div className={`px-3 py-1 rounded-full ${step === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>2</div>
        <div className={`px-3 py-1 rounded-full ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>3</div>
      </div>
      <div className="text-sm text-gray-500">Step {step + 1} of 3</div>
    </div>
  );

  /* ******************************************************************
       🔐 IF NOT VERIFIED, SHOW SECRET KEY SCREEN ONLY
  ********************************************************************/

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100 p-6">
        {popup.show && (
          <Popup
            type={popup.type}
            message={popup.message}
            onClose={() => setPopup({ show: false })}
          />
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

  /* ----------------------------------------------------------------
        ORIGINAL FULL REGISTER PAGE (UNTOUCHED)
  ------------------------------------------------------------------*/

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex bg-blue-100 relative">
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-10">
          <h1 className="text-blue-800 text-4xl font-bold mb-4 leading-snug">
            Empowering Organization With  
            <br /> Smart, Connected Nutryah
          </h1>
          <p className="text-black-600 text-lg max-w-md">
            Nutryah provides advanced automation,
            modern patient management and real-time monitoring tools.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full flex justify-center items-center p-6 bg-blue-100 overflow-y-auto">

        {popup.show && (
          <Popup
            type={popup.type}
            message={popup.message}
            onClose={() => setPopup({ show: false })}
          />
        )}

        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl">
          <StepHeader />

          <form onSubmit={handleFinalSubmit}>

            {/* STEP 1 */}
            {step === 0 && (
              <>
                <h2 className="form-title">Company Details</h2>

                <div className="form-grid">

                  <div>
                    <label className="label">Organization Name</label>
                    <input
                      name="organization_name"
                      value={form.organization_name}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Enter organization name"
                      className="input-box"
                    />
                    {errors.organization_name && (
                      <p className="error">{errors.organization_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Organization Type</label>
                    <input
                      name="organization_type"
                      value={form.organization_type}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="e.g. Clinic, Company"
                      className="input-box"
                    />
                    {errors.organization_type && (
                      <p className="error">{errors.organization_type}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">License Number</label>
                    <input
                      name="organization_license_number"
                      value={form.organization_license_number}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Ex: LIC-12345"
                      className="input-box"
                    />
                    {errors.organization_license_number && (
                      <p className="error">{errors.organization_license_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Contact Phone</label>
                    <input
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="10-digit phone"
                      className="input-box"
                    />
                    {errors.contact_phone && (
                      <p className="error">{errors.contact_phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Contact Email</label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="example@company.com"
                      className="input-box"
                    />
                    {errors.contact_email && (
                      <p className="error">{errors.contact_email}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button type="button" onClick={goNext} className="btn-primary">
                    Next: Address
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <>
                <h2 className="form-title">Address Details</h2>

                <div className="form-grid">

                  <div>
                    <label className="label">Address</label>
                    <input
                      name="organization_address"
                      value={form.organization_address}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Street / Area / Building"
                      className="input-box"
                    />
                    {errors.organization_address && (
                      <p className="error">{errors.organization_address}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">City</label>
                    <select
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="input-box"
                    >
                      <option value="">Select City</option>
                      <option>Chennai</option>
                      <option>Coimbatore</option>
                      <option>Madurai</option>
                      <option>Trichy</option>
                      <option>Salem</option>
                    </select>
                    {errors.city && <p className="error">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="label">State</label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="input-box"
                    >
                      <option value="">Select State</option>
                      <option>Tamil Nadu</option>
                      <option>Kerala</option>
                      <option>Karnataka</option>
                      <option>Andhra Pradesh</option>
                      <option>Telangana</option>
                    </select>
                    {errors.state && <p className="error">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="label">Pincode</label>
                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="6-digit pincode"
                      className="input-box"
                    />
                    {errors.pincode && <p className="error">{errors.pincode}</p>}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button type="button" onClick={goBack} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={goNext} className="btn-primary">
                    Next: Admin
                  </button>
                </div>
              </>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <>
                <h2 className="form-title">Admin Details</h2>

                <div className="form-grid">

                  <div>
                    <label className="label">Admin Name</label>
                    <input
                      name="admin_name"
                      value={form.admin_name}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Full name"
                      className="input-box"
                    />
                    {errors.admin_name && (
                      <p className="error">{errors.admin_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Designation</label>
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Owner / Manager"
                      className="input-box"
                    />
                    {errors.designation && (
                      <p className="error">{errors.designation}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Admin Phone</label>
                    <input
                      name="admin_phone"
                      value={form.admin_phone}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="10-digit phone"
                      className="input-box"
                    />
                    {errors.admin_phone && (
                      <p className="error">{errors.admin_phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Admin Secondary Phone</label>
                    <input
                      name="admin_secondary_phone"
                      value={form.admin_secondary_phone}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Backup phone"
                      className="input-box"
                    />
                    {errors.admin_secondary_phone && (
                      <p className="error">{errors.admin_secondary_phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Admin Email</label>
                    <input
                      name="admin_email"
                      value={form.admin_email}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="admin@company.com"
                      className="input-box"
                    />
                    {errors.admin_email && (
                      <p className="error">{errors.admin_email}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Contact Email</label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="contact@company.com"
                      className="input-box"
                    />
                    {errors.contact_email && (
                      <p className="error">{errors.contact_email}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Status</label>
                    <input
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      onFocus={handleFocusMoveEnd}
                      placeholder="Active"
                      className="input-box"
                    />
                    {errors.status && (
                      <p className="error">{errors.status}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Password</label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        onFocus={handleFocusMoveEnd}
                        placeholder="Strong password"
                        className="input-box pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="password-toggle"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    <p className={`mt-1 text-sm ${passwordColor()}`}>
                      {getPasswordStrength()}
                    </p>

                    {errors.password && (
                      <p className="error">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button type="button" onClick={goBack} className="btn-secondary">
                    Back
                  </button>

                  <button type="submit" className="btn-primary">
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
