import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure organization identity, GST tax defaults, and document templates</p>
        </div>
        <Button variant="primary" size="sm" icon={Save}>Save Settings</Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Company Information</h3>
        <Input label="Company Name" placeholder="e.g. OfficeFlow Solutions Pvt Ltd" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" placeholder="contact@company.com" />
          <Input label="Phone" placeholder="+91 98765 43210" />
        </div>
        <Input label="GSTIN Number" placeholder="e.g. 33AAAAA0000A1Z5" />
        <Input label="Default GST Rate (%)" type="number" placeholder="18" />
      </div>
    </div>
  );
}
