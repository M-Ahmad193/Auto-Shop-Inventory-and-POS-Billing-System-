import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InvoiceSettings } from '../types';
import { Loader2, Save, Type, Palette, Layout, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

const DEFAULT_SETTINGS: InvoiceSettings = {
  storeName: 'AFZAL AUTO SERVICE',
  storeTagline: 'Workshop & Spare Parts Specialist',
  address: 'Main Road, City',
  phone: '0321-1234567',
  footerMessage: 'Thank you for choosing Afzal Auto Service!',
  accentColor: '#f97316',
  headerFontSize: 14, // Smaller default for 80mm
  bodyFontSize: 8,   // Smaller default for 80mm
  paperWidth: 80,
  showSignature: true,
  tableTheme: 'plain' // Cleaner for thermal
};

const InvoiceCustomizer = () => {
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'invoice');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as InvoiceSettings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'invoice'), settings);
      alert('Invoice settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Configuration Column */}
      <div className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
            <Layout size={16} /> Header Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Store Name</label>
              <input 
                type="text" 
                value={settings.storeName}
                onChange={e => setSettings({...settings, storeName: e.target.value})}
                className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Tagline</label>
              <input 
                type="text" 
                value={settings.storeTagline}
                onChange={e => setSettings({...settings, storeTagline: e.target.value})}
                className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Address</label>
              <input 
                type="text" 
                value={settings.address}
                onChange={setSettings ? e => setSettings({...settings, address: e.target.value}) : undefined}
                className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Phone</label>
              <input 
                type="text" 
                value={settings.phone}
                onChange={e => setSettings({...settings, phone: e.target.value})}
                className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
            <Palette size={16} /> Visual Branding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Accent Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.accentColor}
                  onChange={e => setSettings({...settings, accentColor: e.target.value})}
                  className="h-9 w-12 bg-black border border-border rounded"
                />
                <input 
                  type="text"
                  value={settings.accentColor}
                  onChange={e => setSettings({...settings, accentColor: e.target.value})}
                  className="flex-1 bg-black border border-border rounded-lg py-2 px-3 text-sm text-white font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Table Style</label>
              <select 
                value={settings.tableTheme}
                onChange={e => setSettings({...settings, tableTheme: e.target.value as any})}
                className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
              >
                <option value="striped">Striped Rows</option>
                <option value="grid">Full Grid</option>
                <option value="plain">Minimal Plain</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
            <Type size={16} /> Typography & Messaging
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Header Font Size</label>
                <input 
                  type="number" 
                  value={settings.headerFontSize}
                  onChange={e => setSettings({...settings, headerFontSize: parseInt(e.target.value)})}
                  className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Body Font Size</label>
                <input 
                  type="number" 
                  value={settings.bodyFontSize}
                  onChange={e => setSettings({...settings, bodyFontSize: parseInt(e.target.value)})}
                  className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Paper Width (mm)</label>
                <input 
                  type="number" 
                  value={settings.paperWidth}
                  onChange={e => setSettings({...settings, paperWidth: parseInt(e.target.value)})}
                  className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
                />
             </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-s uppercase tracking-widest">Footer Message / Policy</label>
            <textarea 
              value={settings.footerMessage}
              onChange={e => setSettings({...settings, footerMessage: e.target.value})}
              rows={3}
              className="w-full bg-black border border-border rounded-lg py-2 px-3 text-sm text-white"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-accent hover:bg-white text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-accent/10 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          Save Invoice Preferences
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-text-s flex items-center gap-2">
          <Eye size={16} /> Thermal Receipt Preview ({settings.paperWidth}mm)
        </h3>
        <div className="flex justify-center bg-black/40 p-10 rounded-3xl border border-dashed border-border">
          <div 
            className="bg-white text-black p-4 shadow-2xl font-sans border-t-[5px]" 
            style={{ 
              borderTopColor: settings.accentColor,
              width: `${settings.paperWidth * 4}px`, // Scaling for screen visibility
              minHeight: '400px'
            }}
          >
            <div className="text-center mb-6">
              <h2 style={{ fontSize: `${settings.headerFontSize}px`, color: settings.accentColor }} className="font-bold uppercase mb-1">{settings.storeName}</h2>
              <p className="text-[8px] uppercase tracking-widest font-bold text-gray-400 mb-1">{settings.storeTagline}</p>
              <p className="text-[7px] text-gray-500 leading-tight">{settings.address}<br/>Phone: {settings.phone}</p>
            </div>

            <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
               <div className="text-[7px] space-y-0.5">
                  <p><span className="font-bold">INV:</span> 1001-A</p>
                  <p><span className="font-bold">DATE:</span> {new Date().toLocaleDateString()}</p>
               </div>
               <div className="text-[7px] text-right space-y-0.5">
                  <p>Bike: ABC-123</p>
                  <p>Honda CD 70</p>
               </div>
            </div>

            <table className={cn(
              "w-full text-left text-[7px] mb-4",
              settings.tableTheme === 'grid' && "border-collapse border border-gray-200"
            )}>
               <thead style={{ backgroundColor: settings.accentColor, color: '#fff' }}>
                  <tr>
                     <th className="py-1 px-2">DESC</th>
                     <th className="py-1 px-1 text-center">QTY</th>
                     <th className="py-1 px-2 text-right">PRICE</th>
                  </tr>
               </thead>
               <tbody style={{ fontSize: `${settings.bodyFontSize}px` }}>
                  <tr className={cn(settings.tableTheme === 'striped' && "bg-gray-50", settings.tableTheme === 'grid' && "border border-gray-200")}>
                     <td className="py-1 px-2">Engine Oil</td>
                     <td className="py-1 px-1 text-center">1</td>
                     <td className="py-1 px-2 text-right">1,200</td>
                  </tr>
                  <tr className={cn(settings.tableTheme === 'grid' && "border border-gray-200")}>
                     <td className="py-1 px-2">Brake Shoe</td>
                     <td className="py-1 px-1 text-center">1</td>
                     <td className="py-1 px-2 text-right">850</td>
                  </tr>
               </tbody>
            </table>

            <div className="ml-auto w-full space-y-1 mb-6 border-t border-gray-200 pt-2">
               <div className="flex justify-between text-[10px] font-bold">
                  <span>TOTAL</span>
                  <span style={{ color: settings.accentColor }}>Rs 2,050</span>
               </div>
               <div className="flex justify-between text-[7px] text-gray-400">
                  <span>PAID</span>
                  <span>Rs 2,050</span>
               </div>
            </div>

            <div className="text-center pt-4 border-t border-dashed border-gray-200">
               <p className="text-[7px] text-gray-500 italic leading-tight whitespace-pre-line">"{settings.footerMessage}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCustomizer;
