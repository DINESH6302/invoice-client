"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrganization } from "@/context/OrganizationContext";
import { apiFetch } from "@/lib/api";
import { Building2, Globe, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function NewOrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("id");
  const isEditMode = !!orgId;
  
  const { addOrganization, switchOrganization, organizations, setOrganizations } = useOrganization();
  const [errorPopup, setErrorPopup] = useState({ open: false, message: "" });
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(isEditMode);
  const hasOrganizations = organizations && organizations.length > 0;
  const [formData, setFormData] = useState({
    name: "",
    gst: new Date().toISOString(),
    location: "IN",
    state: "MH",
    street1: "123 Business Park, Suite 100",
    street2: "Tech Building",
    city: "Mumbai",
    zip: "400001",
    currency: "INR",
    language: "English",
    existingMethod: "",
  });

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);

  // Fetch existing org details if in edit mode
  useEffect(() => {
    if (!isEditMode) {
      setIsLoading(false);
      return;
    }

    const fetchOrgDetails = async () => {
      try {
        const res = await apiFetch(`/orgs/${orgId}`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          const orgData = data.data || data;
          setFormData({
            name: orgData.org_name || "",
            gst: orgData.gst_no || "",
            location: orgData.address?.country || "IN",
            state: orgData.address?.state || "MH",
            street1: orgData.address?.street || "",
            street2: orgData.address?.street2 || "",
            city: orgData.address?.city || "",
            zip: orgData.address?.zip_code || "",
            currency: orgData.currency || "INR",
            language: "English",
            existingMethod: "",
          });
        } else {
          setErrorPopup({
            open: true,
            message: "Failed to load organization details.",
          });
        }
      } catch (err) {
        setErrorPopup({
          open: true,
          message: err.message || "Failed to load organization details.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgDetails();
  }, [isEditMode, orgId]);

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

  // When country changes, update currency and fetch states
  useEffect(() => {
    if (!formData.location || !countries.length) return;
    const country = countries.find((c) => c.cca2 === formData.location);
    if (country && country.currencies) {
      // Pick first currency
      const [curCode, curObj] = Object.entries(country.currencies)[0];
      setFormData((f) => ({ ...f, currency: curCode, state: "" }));
    }
    // Fetch states for selected country
    fetchStates(formData.location);
  }, [formData.location, countries]);

  const fetchStates = async (countryCode) => {
    if (!countryCode) {
      setStates([]);
      return;
    }
    setLoadingStates(true);
    try {
      const response = await fetch(
        `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,cca2`
      );
      if (!response.ok) throw new Error("Failed to fetch country details");
      const data = await response.json();
      
      // Fetch states from countriesnow API
      const statesResponse = await fetch(
        `https://countriesnow.space/api/v0.1/countries/states`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: data.name.common }),
        }
      );
      
      if (statesResponse.ok) {
        const statesData = await statesResponse.json();
        if (statesData.data && statesData.data.states) {
          setStates(
            statesData.data.states.map((s) => ({
              name: s.name,
              code: s.state_code || s.name,
            }))
          );
        } else {
          setStates([]);
        }
      } else {
        setStates([]);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
      setStates([]);
    } finally {
      setLoadingStates(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check all required fields
    const requiredFields = [
      "name",
      "gst",
      "location",
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
      const method = isEditMode ? "PUT" : "POST";
      const endpoint = isEditMode ? `orgs/${orgId}` : "orgs";
      
      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errorMsg = isEditMode ? "Failed to update organization." : "Failed to create organization.";
        try {
          const data = await res.json();
          errorMsg = data.message || data.error || JSON.stringify(data);
        } catch (jsonError) {
          // If JSON parsing fails, just use status text
          errorMsg = res.statusText || errorMsg;
        }
        setErrorPopup({ open: true, message: errorMsg });
        return;
      }
      
      // Handle successful creation/update
      const responseData = await res.json();
      const newOrgId = responseData.data?.orgId || orgId;
      const message = responseData.message || (isEditMode ? "Organization updated successfully!" : "Organization created successfully!");
      
      // Update context immediately
      if (!isEditMode) {
        // For creation, add to organizations array
        const newOrgList = [...organizations, { org_id: newOrgId, org_name: formData.name }];
        setOrganizations(newOrgList);
      }
      switchOrganization(newOrgId?.toString() || newOrgId);
      
      // Show success message
      setSuccessMessage(message);
      
      // Redirect to dashboard after 1.5 seconds (reduced to allow context update)
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setErrorPopup({ open: true, message: err.message });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const ErrorPopup = ({ open, message, onClose }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Save Failed</h2>
            <p className="text-slate-600 text-sm mb-6">{message}</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setErrorPopup({ open: false, message: "" });
                }}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-900">{successMessage}</p>
              <p className="text-sm text-emerald-700 mt-1">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )}
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
          <div className="max-w-3xl mx-auto px-6 py-20">
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
                {isEditMode ? "Edit Organization" : "Create Organization"}
              </h1>
              <p className="text-slate-500 mt-1">
                {isEditMode ? "Update your organization details below." : "Enter your organization details below."}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading organization details...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Section 1: Basic Details */}
                <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Organization Name <span className="text-red-500">*</span>
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
                        State/Province
                      </label>
                      <select
                        name="state"
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white"
                        value={formData.state}
                        onChange={handleChange}
                        disabled={!formData.location || loadingStates || states.length === 0}
                      >
                        <option value="">
                          {loadingStates
                            ? "Loading states..."
                            : !formData.location
                            ? "Select country first"
                            : states.length === 0
                            ? "No states available"
                            : "Select State/Province"}
                        </option>
                        {states.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
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
                  {isEditMode ? "Update" : "Save"}
                </button>
              </div>
            </form>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
