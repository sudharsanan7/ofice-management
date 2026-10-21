import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Upload,
  Save,
  CheckCircle2,
  FileText,
  Landmark,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import settingsApi from '../../api/settings.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [cin, setCin] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // Logo
  const [currentLogo, setCurrentLogo] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Defaults & Prefixes
  const [defaultGstRate, setDefaultGstRate] = useState(18);
  const [defaultQuotationValidityDays, setDefaultQuotationValidityDays] = useState(30);
  const [defaultInvoiceDueDays, setDefaultInvoiceDueDays] = useState(15);
  const [prefixQuote, setPrefixQuote] = useState('QT');
  const [prefixInvoice, setPrefixInvoice] = useState('INV');
  const [prefixPayment, setPrefixPayment] = useState('PAY');

  // Terms & Conditions
  const [defaultPaymentConditions, setDefaultPaymentConditions] = useState(
    '50% advance on project confirmation; remaining 50% on completion and handover, as per the agreed milestone schedule.'
  );
  const [defaultQuotationTerms, setDefaultQuotationTerms] = useState('');
  const [defaultInvoiceNotes, setDefaultInvoiceNotes] = useState('');

  // Bank Details
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankUpi, setBankUpi] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.getSettings();
      const s = res.data;

      setCompanyName(s.companyName || '');
      setCin(s.cin || '');
      setGstin(s.gstin || '');
      setState(s.state || 'Tamil Nadu');
      setEmail(s.email || '');
      setPhone(s.phone || '');

      if (s.address) {
        setStreet(s.address.street || '');
        setCity(s.address.city || '');
        setPostalCode(s.address.postalCode || '');
        setCountry(s.address.country || 'India');
      }

      setCurrentLogo(s.logo || '');
      setDefaultGstRate(s.defaultGstRate ?? 18);
      setDefaultQuotationValidityDays(s.defaultQuotationValidityDays ?? 30);
      setDefaultInvoiceDueDays(s.defaultInvoiceDueDays ?? 15);

      if (s.numberingPrefixes) {
        setPrefixQuote(s.numberingPrefixes.quotation || 'QT');
        setPrefixInvoice(s.numberingPrefixes.invoice || 'INV');
        setPrefixPayment(s.numberingPrefixes.payment || 'PAY');
      }

      setDefaultPaymentConditions(
        s.defaultPaymentConditions ||
          '50% advance on project confirmation; remaining 50% on completion and handover, as per the agreed milestone schedule.'
      );
      setDefaultQuotationTerms(s.defaultQuotationTerms || '');
      setDefaultInvoiceNotes(s.defaultInvoiceNotes || '');

      if (s.bankDetails) {
        setBankAccountName(s.bankDetails.accountName || '');
        setBankAccountNumber(s.bankDetails.accountNumber || '');
        setBankName(s.bankDetails.bankName || '');
        setBankIfsc(s.bankDetails.ifscCode || '');
        setBankBranch(s.bankDetails.branch || '');
        setBankUpi(s.bankDetails.upiId || '');
      }
    } catch (err) {
      showToast(err.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be less than 2MB', 'error');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Only PNG, JPG, and WebP images are permitted', 'error');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only administrators can modify system settings.', 'error');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('companyName', companyName);
      formData.append('cin', cin);
      formData.append('gstin', gstin);
      formData.append('state', state);
      formData.append('email', email);
      formData.append('phone', phone);

      formData.append(
        'address',
        JSON.stringify({
          street,
          city,
          state,
          postalCode,
          country
        })
      );

      formData.append('defaultGstRate', defaultGstRate);
      formData.append('defaultQuotationValidityDays', defaultQuotationValidityDays);
      formData.append('defaultInvoiceDueDays', defaultInvoiceDueDays);

      formData.append(
        'numberingPrefixes',
        JSON.stringify({
          quotation: prefixQuote,
          invoice: prefixInvoice,
          payment: prefixPayment
        })
      );

      formData.append('defaultPaymentConditions', defaultPaymentConditions);
      formData.append('defaultQuotationTerms', defaultQuotationTerms);
      formData.append('defaultInvoiceNotes', defaultInvoiceNotes);

      formData.append(
        'bankDetails',
        JSON.stringify({
          accountName: bankAccountName,
          accountNumber: bankAccountNumber,
          bankName,
          ifscCode: bankIfsc,
          branch: bankBranch,
          upiId: bankUpi
        })
      );

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await settingsApi.updateSettings(formData);
      showToast('Settings saved successfully', 'success');
      setCurrentLogo(res.data.logo || currentLogo);
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">Loading system settings...</p>
      </div>
    );
  }

  const backendUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : (import.meta.env.PROD ? '' : 'http://localhost:5000');
  const logoSrc = logoPreview || (currentLogo ? `${backendUrl}${currentLogo}` : null);

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
            <Badge variant="purple" size="sm">Admin Configuration</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure organization identity, tax residency, default terms, and billing prefixes
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchSettings} disabled={saving}>
              Reload
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={Save} isLoading={saving}>
              Save Settings
            </Button>
          </div>
        )}
      </div>

      {/* Tax State Notification */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">GST Taxation Rule: </span>
          The organization's registered state (<span className="font-semibold underline">{state}</span>) governs GST calculation logic for Invoices and Quotations. Intrastate transactions (Client in {state}) apply <span className="font-semibold">CGST (9%) + SGST (9%)</span>, while interstate transactions apply <span className="font-semibold">IGST (18%)</span>.
        </div>
      </div>

      {/* Grid of Setting Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 2 Spans */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Company Profile & Tax Identity */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Company Identity & Registration</h2>
            </div>

            <Input
              label="Company Legal Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="OfficeFlow Solutions Pvt Ltd"
              required
              disabled={!isAdmin}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="CIN (Corporate Identification Number)"
                value={cin}
                onChange={(e) => setCin(e.target.value)}
                placeholder="U72900TN2026PTC123456"
                disabled={!isAdmin}
              />

              <Input
                label="GSTIN Number"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="33AAAAA0000A1Z5"
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Registered State (Tax Jurisdiction) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!isAdmin}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Company Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={!isAdmin}
              />
            </div>

            <Input
              label="Official Contact Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@officeflow.local"
              disabled={!isAdmin}
            />
          </div>

          {/* Card 2: Registered Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Registered Office Address
            </h3>

            <Input
              label="Street Address / Building"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Plot No. 42, Tech Park Avenue"
              disabled={!isAdmin}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chennai"
                disabled={!isAdmin}
              />

              <Input
                label="Postal Code (PIN)"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="600001"
                disabled={!isAdmin}
              />

              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                disabled={!isAdmin}
              />
            </div>
          </div>

          {/* Card 3: Terms & Default Conditions */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Standard Terms & Payment Conditions</h2>
            </div>

            <Input
              type="textarea"
              label="Default Payment Conditions"
              rows={3}
              value={defaultPaymentConditions}
              onChange={(e) => setDefaultPaymentConditions(e.target.value)}
              helperText="Auto-populated into all newly drafted quotations and contracts."
              disabled={!isAdmin}
            />

            <Input
              type="textarea"
              label="Default Quotation Terms & Conditions"
              rows={3}
              value={defaultQuotationTerms}
              onChange={(e) => setDefaultQuotationTerms(e.target.value)}
              disabled={!isAdmin}
            />

            <Input
              type="textarea"
              label="Default Invoice Notes & Remittance Instructions"
              rows={3}
              value={defaultInvoiceNotes}
              onChange={(e) => setDefaultInvoiceNotes(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
        </div>

        {/* Right Column: 1 Span */}
        <div className="space-y-6">
          {/* Card 4: Company Logo Upload */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Company Brand Logo
            </h3>

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
              {logoSrc ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={logoSrc}
                    alt="Company Logo Preview"
                    className="max-h-24 max-w-full object-contain rounded-lg shadow-xs bg-white p-2 border border-slate-200"
                  />
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Logo Ready
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-3">
                  <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No logo uploaded</p>
                  <p className="text-[11px] text-slate-500">Appears on invoices and quotes</p>
                </div>
              )}

              {isAdmin && (
                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select New Logo
                  </Button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              PNG, JPG or WebP (max. 2MB). Validated safely on server.
            </p>
          </div>

          {/* Card 5: Document Defaults & Prefixes */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Billing Defaults & Prefixes
            </h3>

            <Input
              label="Standard GST Rate (%)"
              type="number"
              value={defaultGstRate}
              onChange={(e) => setDefaultGstRate(Number(e.target.value))}
              disabled={!isAdmin}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quote Validity (Days)"
                type="number"
                value={defaultQuotationValidityDays}
                onChange={(e) => setDefaultQuotationValidityDays(Number(e.target.value))}
                disabled={!isAdmin}
              />

              <Input
                label="Invoice Due (Days)"
                type="number"
                value={defaultInvoiceDueDays}
                onChange={(e) => setDefaultInvoiceDueDays(Number(e.target.value))}
                disabled={!isAdmin}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Numbering Prefixes
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Quotation"
                  value={prefixQuote}
                  onChange={(e) => setPrefixQuote(e.target.value.toUpperCase())}
                  disabled={!isAdmin}
                />
                <Input
                  label="Invoice"
                  value={prefixInvoice}
                  onChange={(e) => setPrefixInvoice(e.target.value.toUpperCase())}
                  disabled={!isAdmin}
                />
                <Input
                  label="Payment"
                  value={prefixPayment}
                  onChange={(e) => setPrefixPayment(e.target.value.toUpperCase())}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          {/* Card 6: Banking & Remittance */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">Bank & Remittance Details</h3>
            </div>

            <Input
              label="Beneficiary Account Name"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="e.g. OfficeFlow Solutions"
              disabled={!isAdmin}
            />

            <Input
              label="Account Number"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="50200012345678"
              disabled={!isAdmin}
            />

            <Input
              label="Bank Name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="HDFC Bank"
              disabled={!isAdmin}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="IFSC Code"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                disabled={!isAdmin}
              />
              <Input
                label="Branch"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                placeholder="T. Nagar"
                disabled={!isAdmin}
              />
            </div>

            <Input
              label="UPI ID (VPA)"
              value={bankUpi}
              onChange={(e) => setBankUpi(e.target.value)}
              placeholder="officeflow@okaxis"
              disabled={!isAdmin}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
