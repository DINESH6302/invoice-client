"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/context/OrganizationContext";
import { apiFetch } from "@/lib/api";
import { Building2, Globe, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function NewOrganizationPage() {
  const router = useRouter();
  const { addOrganization } = useOrganization();
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });
  const [formData, setFormData] = useState({
    name: "",
    gst: "",
    location: "",
    state: "",
    street1: "",
    street2: "",
    city: "",
    zip: "",
    currency: "",
    language: "English",
    existingMethod: "",
  });

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
    // Fetch countries and currencies from restcountries.com
    fetch(
      "https://restcountries.com/v3.1/all?fields=name,flags,currencies,cca2",
    )
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.sort((a, b) =>
          a.name.common.localeCompare(b.name.common),
        );
        setCountries(sorted);
        setLoadingCountries(false);
      });
  }, []);

  // When country changes, update currency
  useEffect(() => {
    if (!formData.location || !countries.length) return;
    const country = countries.find((c) => c.cca2 === formData.location);
    if (country && country.currencies) {
      // Pick first currency
      const [curCode, curObj] = Object.entries(country.currencies)[0];
      setFormData((f) => ({ ...f, currency: curCode }));
    }
  }, [formData.location, countries]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check all required fields
    const requiredFields = [
      "name",
      "gst",
      "location",
      "state",
      "street1",
      "city",
      "zip",
      "currency",
    ];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        alert("Please fill all required fields.");
        return;
      }
    }

    // Build payload for API
    const payload = {
      org_name: formData.name,
      gst_no: formData.gst,
      currency: formData.currency,
      address: {
        street: formData.street1,
        city: formData.city,
        zip_code: formData.zip,
        state: formData.state,
        country: formData.location,
      },
    };

    try {
      const res = await apiFetch("orgs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errorMsg = "Failed to create organization.";
        try {
          const data = await res.json();
          errorMsg = data.message || data.error || JSON.stringify(data);
        } catch {
          errorMsg = await res.text();
        }
        setErrorPopup({ open: true, message: errorMsg });
        return;
      }
      addOrganization(formData.name);
      router.push("/dashboard");
    } catch (err) {
      setErrorPopup({ open: true, message: err.message });
    }
    // Error popup modal
    function ErrorPopup({ open, message, onClose }) {
      if (!open) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="text-red-600 font-bold mb-2">Error</div>
            <div className="text-slate-700 mb-4 whitespace-pre-line">
              {message}
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    const handleChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
      <>
        <ErrorPopup
          open={errorPopup.open}
          message={errorPopup.message}
          onClose={() => {
            setErrorPopup({ open: false, message: "" });
            router.push("/dashboard");
          }}
        />
        <div className="h-full bg-white">
          {/* Right Side - Form */}
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors group"
              >
                <ArrowLeft
                  size={18}
                  className="group-hover:-translate-x-1 transition-transform"
                />{" "}
                Back to Dashboard
              </button>

              <div className="mb-8">
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <Building2 size={24} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Create New Organization
                </h1>
                <p className="text-slate-500 mt-1">
                  Enter your organization details below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Basic Details */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Organization Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                        placeholder="e.g. Acme Corp"
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        GST No
                      </label>
                      <input
                        type="text"
                        name="gst"
                        required
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                        placeholder="Enter GST Number"
                        value={formData.gst}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-slate-100"></div>

                {/* Section 2: Location */}
                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Globe size={14} /> Location Details
                  </h3>

                  <div className="space-y-4">
                    <input
                      type="text"
                      name="street1"
                      placeholder="Street Address Line 1"
                      required
                      className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                      value={formData.street1}
                      onChange={handleChange}
                    />
                    <div className="grid grid-cols-2 gap-6">
                      <input
                        type="text"
                        name="city"
                        placeholder="City"
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                        required
                        value={formData.city}
                        onChange={handleChange}
                      />
                      <input
                        type="text"
                        name="zip"
                        placeholder="Postal Code"
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                        required
                        value={formData.zip}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Country/Region
                        </label>
                        <div className="relative">
                          <select
                            name="location"
                            required
                            className="w-full h-11 pl-12 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white appearance-none"
                            value={formData.location}
                            onChange={handleChange}
                            disabled={loadingCountries}
                          >
                            <option value="">
                              {loadingCountries
                                ? "Loading countries..."
                                : "Select Country"}
                            </option>
                            {countries.map((c) => (
                              <option key={c.cca2} value={c.cca2}>
                                {c.name.common}
                              </option>
                            ))}
                          </select>
                          {/* Show flag of selected country in the input left */}
                          {(() => {
                            const selected = countries.find(
                              (c) => c.cca2 === formData.location,
                            );
                            if (selected && selected.flags?.emoji) {
                              return (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                                  {selected.flags.emoji}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          State
                        </label>
                        <select
                          name="state"
                          required
                          className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                          value={formData.state}
                          onChange={handleChange}
                        >
                          <option value="">Select State</option>
                          <option value="AN">
                            Andaman and Nicobar Islands
                          </option>
                          <option value="AP">Andhra Pradesh</option>
                          <option value="AR">Arunachal Pradesh</option>
                          <option value="AS">Assam</option>
                          <option value="BR">Bihar</option>
                          <option value="CH">Chandigarh</option>
                          <option value="CT">Chhattisgarh</option>
                          <option value="DN">
                            Dadra and Nagar Haveli and Daman and Diu
                          </option>
                          <option value="DL">Delhi</option>
                          <option value="GA">Goa</option>
                          <option value="GJ">Gujarat</option>
                          <option value="HR">Haryana</option>
                          <option value="HP">Himachal Pradesh</option>
                          <option value="JK">Jammu and Kashmir</option>
                          <option value="JH">Jharkhand</option>
                          <option value="KA">Karnataka</option>
                          <option value="KL">Kerala</option>
                          <option value="LA">Ladakh</option>
                          <option value="LD">Lakshadweep</option>
                          <option value="MP">Madhya Pradesh</option>
                          <option value="MH">Maharashtra</option>
                          <option value="MN">Manipur</option>
                          <option value="ML">Meghalaya</option>
                          <option value="MZ">Mizoram</option>
                          <option value="NL">Nagaland</option>
                          <option value="OR">Odisha</option>
                          <option value="PY">Puducherry</option>
                          <option value="PB">Punjab</option>
                          <option value="RJ">Rajasthan</option>
                          <option value="SK">Sikkim</option>
                          <option value="TN">Tamil Nadu</option>
                          <option value="TG">Telangana</option>
                          <option value="TR">Tripura</option>
                          <option value="UP">Uttar Pradesh</option>
                          <option value="UT">Uttarakhand</option>
                          <option value="WB">West Bengal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-slate-100"></div>

                {/* Section 3: Localization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Currency
                    </label>
                    <div className="relative">
                      <input
                        name="currency"
                        required
                        className="w-full h-11 pl-12 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                        value={(() => {
                          if (!formData.currency) return "";
                          const selectedCountry = countries.find(
                            (c) => c.cca2 === formData.location,
                          );
                          if (selectedCountry && selectedCountry.currencies) {
                            const currencyObj =
                              selectedCountry.currencies[formData.currency];
                            if (currencyObj && currencyObj.symbol) {
                              return `${currencyObj.name} (${formData.currency})`;
                            }
                          }
                          return formData.currency;
                        })()}
                        disabled
                        placeholder="Currency auto-filled"
                      />
                      {/* Show currency symbol in the input left */}
                      {(() => {
                        const selectedCountry = countries.find(
                          (c) => c.cca2 === formData.location,
                        );
                        if (selectedCountry && selectedCountry.currencies) {
                          const currencyObj =
                            selectedCountry.currencies[formData.currency];
                          if (currencyObj && currencyObj.symbol) {
                            return (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                                {currencyObj.symbol}
                              </span>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex items-center justify-end gap-4 border-t border-slate-100 mt-8">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  };
}

