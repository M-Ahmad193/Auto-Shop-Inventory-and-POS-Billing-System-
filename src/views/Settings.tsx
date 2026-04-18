import React, { useState } from 'react';
import { Settings as SettingsIcon, Store, Shield, RefreshCw, FileText } from 'lucide-react';
import InvoiceCustomizer from '../components/InvoiceCustomizer';
import { cn } from '../lib/utils';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'invoice'>('general');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <SettingsIcon className="text-orange-500" /> System Settings
          </h1>
          <p className="text-neutral-500 text-sm">Configure shop information and system preferences</p>
        </div>

        <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button 
            onClick={() => setActiveTab('general')}
            className={cn(
              "px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
              activeTab === 'general' ? "bg-accent text-black shadow-lg" : "text-neutral-500 hover:text-white"
            )}
          >
            <Store size={14} /> General
          </button>
          <button 
            onClick={() => setActiveTab('invoice')}
            className={cn(
              "px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
              activeTab === 'invoice' ? "bg-accent text-black shadow-lg" : "text-neutral-500 hover:text-white"
            )}
          >
            <FileText size={14} /> Invoice Layout
          </button>
        </div>
      </div>

      {activeTab === 'invoice' ? (
        <InvoiceCustomizer />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Store size={20} className="text-blue-500" /> Shop Details
              </h3>
              <div className="space-y-4">
                 {[
                   { label: 'Shop Name', value: 'Afzal Auto Service' },
                   { label: 'Phone Number', value: '0321-1234567' },
                   { label: 'Address', value: 'Main Road, City' },
                   { label: 'VAT/Registration', value: '7722-X' }
                 ].map(item => (
                   <div key={item.label} className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{item.label}</label>
                      <input type="text" defaultValue={item.value} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white text-sm" />
                   </div>
                 ))}
              </div>
              <button className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all">Update Info</button>
           </div>

           <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield size={20} className="text-emerald-500" /> Data Backup
                 </h3>
                 <p className="text-sm text-neutral-500">Regularly export your database to Excel format to keep local backups of your data.</p>
                 <button className="w-full py-3 border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={18} /> Backup Database Now
                 </button>
              </div>
              
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4 opacity-50 pointer-events-none">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Cloud Synchronization
                 </h3>
                 <p className="text-sm text-neutral-500">Sync with central Afzal Auto servers (Enterprise Only)</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
