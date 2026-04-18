import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bill, InvoiceSettings } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  History, 
  Search, 
  Printer, 
  FileText, 
  Calendar,
  Bike as BikeIcon,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDoc, doc as fsDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

const BillHistory = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);

  useEffect(() => {
    const fetchInvoiceSettings = async () => {
      const snap = await getDoc(fsDoc(db, 'settings', 'invoice'));
      if (snap.exists()) {
        setInvoiceSettings(snap.data() as InvoiceSettings);
      }
    };
    fetchInvoiceSettings();

    const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Bill));
      setBills(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.billNumber.toString().includes(searchTerm) || 
                          bill.customerPhone.includes(searchTerm) ||
                          bill.bikeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedDate) return matchesSearch;
    
    const billDate = format(bill.createdAt, 'yyyy-MM-dd');
    return matchesSearch && billDate === selectedDate;
  });

  const reprintBill = (bill: Bill) => {
    const s = invoiceSettings || {
      storeName: 'AFZAL AUTO SERVICE',
      storeTagline: 'Workshop & Spare Parts Specialist',
      address: 'Main Road, City',
      phone: '0321-1234567',
      footerMessage: 'Thank you for choosing Afzal Auto Service!',
      accentColor: '#f97316',
      headerFontSize: 14,
      bodyFontSize: 8,
      paperWidth: 80,
      showSignature: true,
      tableTheme: 'plain'
    };

    const doc = new jsPDF({
      unit: 'mm',
      format: [s.paperWidth, 200]
    });
    
    const centerX = s.paperWidth / 2;
    const printableWidth = s.paperWidth - 2;
    const marginX = (s.paperWidth - printableWidth) / 2;

    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [249, 115, 22];
    };
    
    const accentRGB = hexToRgb(s.accentColor);

    // Header
    doc.setFontSize(s.headerFontSize);
    doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
    doc.text(s.storeName, centerX, 15, { align: 'center' });
    
    doc.setFontSize(s.bodyFontSize);
    doc.setTextColor(100);
    doc.text(s.storeTagline, centerX, 20, { align: 'center' });
    doc.setFontSize(s.bodyFontSize - 1);
    doc.text(`${s.phone}`, centerX, 24, { align: 'center' });
    doc.text(`${s.address} (Reprint)`, centerX, 28, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(marginX, 32, s.paperWidth - marginX, 32);

    // Bill Info
    doc.setFontSize(s.bodyFontSize);
    doc.setTextColor(0);
    doc.text(`INV: ${bill.billNumber}`, marginX, 40);
    doc.text(`DATE: ${format(bill.createdAt, 'dd/MM/yy HH:mm')}`, s.paperWidth - marginX, 40, { align: 'right' });

    // Customer Info
    doc.text(`BIKE: ${bill.bikeNumber}`, marginX, 46);
    doc.text(`METER: ${bill.currentMeter} km`, s.paperWidth - marginX, 46, { align: 'right' });

    const tableRows = bill.items.map(si => [
      si.name,
      si.quantity,
      formatCurrency(si.total)
    ]);
    if (bill.serviceCharge > 0) tableRows.push(['Service', '1', formatCurrency(bill.serviceCharge)]);
    if (bill.laborCharge > 0) tableRows.push(['Labor', '1', formatCurrency(bill.laborCharge)]);
    if ((bill.discount || 0) > 0) tableRows.push(['Disc', '1', `-${formatCurrency(bill.discount)}`]);
    
    autoTable(doc, {
      startY: 53,
      head: [['DESC', 'QTY', 'AMT']],
      body: tableRows,
      theme: s.tableTheme as any,
      headStyles: { fillColor: accentRGB, fontSize: s.bodyFontSize, cellPadding: 1 },
      styles: { fontSize: s.bodyFontSize - 1, cellPadding: 1 },
      margin: { left: marginX, right: marginX },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 8, halign: 'center' },
        2: { cellWidth: 15, halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(s.bodyFontSize + 2);
    doc.setTextColor(0);
    doc.text(`TOTAL: ${formatCurrency(bill.total)}`, s.paperWidth - marginX, finalY, { align: 'right' });

    doc.setFontSize(s.bodyFontSize);
    doc.text(`PAID: ${formatCurrency(bill.amountPaid || bill.total)}`, s.paperWidth - marginX, finalY + 5, { align: 'right' });
    
    if (bill.balance > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`BAL: ${formatCurrency(bill.balance)}`, s.paperWidth - marginX, finalY + 10, { align: 'right' });
      doc.setFontSize(s.bodyFontSize);
      doc.text('PENDING', marginX, finalY + 5);
    } else {
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(s.bodyFontSize);
      doc.text('PAID FULL', marginX, finalY + 5);
    }

    if (bill.notes) {
      doc.setFontSize(s.bodyFontSize - 2);
      doc.setTextColor(120);
      const splitNotes = doc.splitTextToSize(`Notes: ${bill.notes}`, printableWidth);
      doc.text(splitNotes, marginX, finalY + 18);
    }

    const footerY = bill.notes ? finalY + 28 : finalY + 20;
    doc.setFontSize(s.bodyFontSize - 1);
    doc.setTextColor(100);
    const splitFooter = doc.splitTextToSize(s.footerMessage, printableWidth);
    doc.text(splitFooter, centerX, footerY, { align: 'center' });

    doc.save(`Bill_${bill.billNumber}_Reprint.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-white flex items-center gap-3 tracking-tight">
            <History className="text-orange-500" />
            Bill & Invoice History
          </h1>
          <p className="text-neutral-500 text-sm">Search, filter, and reprint customer service bills</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-orange-500 transition-all cursor-pointer" 
              />
           </div>
           {selectedDate && (
             <button 
               onClick={() => setSelectedDate('')}
               className="text-xs text-neutral-500 hover:text-white"
             >
               Clear Date
             </button>
           )}
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
            <input 
              type="text" 
              placeholder="Search by bill #, phone or bike number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-medium" 
            />
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
             <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
          ) : filteredBills.map((bill) => (
            <div 
              key={bill.id}
              onClick={() => setViewingBill(bill)}
              className="group flex flex-col md:flex-row items-center justify-between p-5 bg-neutral-950/50 rounded-2xl border border-neutral-800 hover:border-orange-500/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-500 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-all">
                  <FileText size={22} />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Bill #{bill.billNumber}</span>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded uppercase tracking-wider">{format(bill.createdAt, 'MMM d, h:mm a')}</span>
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                      <BikeIcon size={12} className="text-neutral-600" />
                      <span className="text-xs text-neutral-500 font-medium uppercase tracking-tight">{bill.bikeNumber} • {bill.bikeModel}</span>
                      <span className="mx-1 text-neutral-800">•</span>
                      <span className="text-xs text-neutral-500">{bill.customerPhone}</span>
                   </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto mt-4 md:mt-0 gap-6">
                <div className="text-right">
                  <p className="text-sm font-black text-white">{formatCurrency(bill.total)}</p>
                  {bill.balance > 0 ? (
                    <p className="text-[10px] text-danger font-bold uppercase">Pending: {formatCurrency(bill.balance)}</p>
                  ) : (
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">Paid Full</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); reprintBill(bill); }}
                    className="p-2.5 bg-neutral-900 text-neutral-400 hover:bg-orange-500 hover:text-white rounded-xl transition-all shadow-sm"
                  >
                    <Printer size={18} />
                  </button>
                  <ChevronRight size={18} className="text-neutral-700 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}

          {filteredBills.length === 0 && !loading && (
             <div className="py-20 text-center opacity-50 space-y-2">
                <Search size={40} className="mx-auto text-neutral-600" />
                <p className="text-sm font-bold">No bills match your requirements</p>
             </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {viewingBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden"
            >
               <div className="bg-orange-500 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-white" />
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bill Details #{viewingBill.billNumber}</h3>
                  </div>
                  <button onClick={() => setViewingBill(null)} className="text-white/80 hover:text-white"><X /></button>
               </div>
               
               <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Customer Details</p>
                      <p className="font-bold text-white text-base">Phone: {viewingBill.customerPhone}</p>
                      <p className="text-neutral-400">Bike: {viewingBill.bikeNumber} ({viewingBill.bikeModel})</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Service Info</p>
                      <p className="font-bold text-white">Meter: {viewingBill.currentMeter} km</p>
                      <p className="text-orange-500 font-bold">Next: {viewingBill.nextMeter} km</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-neutral-950 text-neutral-500 uppercase font-black">
                          <tr>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-neutral-800">
                          {viewingBill.items.map((item, idx) => (
                            <tr key={idx} className="bg-neutral-900">
                               <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                               <td className="px-4 py-3 text-neutral-400">{item.quantity}</td>
                               <td className="px-4 py-3 text-neutral-400 text-right">{formatCurrency(item.salePrice)}</td>
                               <td className="px-4 py-3 text-white font-bold text-right">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-neutral-900 font-bold border-t-2 border-neutral-800">
                             <td className="px-4 py-3 text-neutral-400">Service & Labor</td>
                             <td className="px-4 py-3">-</td>
                             <td className="px-4 py-3">-</td>
                             <td className="px-4 py-3 text-white text-right">{formatCurrency(viewingBill.serviceCharge + viewingBill.laborCharge)}</td>
                          </tr>
                       </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col items-end gap-2 pt-4 border-t border-neutral-800">
                      <div className="flex justify-between w-full max-w-[200px] text-neutral-500 text-xs font-bold uppercase">
                        <span>Items Total</span>
                        <span>{formatCurrency(viewingBill.total - viewingBill.serviceCharge - viewingBill.laborCharge)}</span>
                      </div>
                      <div className="flex justify-between w-full max-w-[200px] text-neutral-500 text-xs font-bold uppercase">
                        <span>Work Charges</span>
                        <span>{formatCurrency(viewingBill.serviceCharge + viewingBill.laborCharge)}</span>
                      </div>
                      <div className="flex justify-between w-full max-w-[200px] mt-2">
                        <span className="text-xl font-black text-white">Grand Total</span>
                        <span className="text-xl font-black text-orange-500">{formatCurrency(viewingBill.total)}</span>
                      </div>
                  </div>
               </div>

               <div className="p-6 bg-neutral-950 flex gap-4">
                  <button 
                    onClick={() => reprintBill(viewingBill)}
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={18} /> Reprint Invoice
                  </button>
                  <button 
                    onClick={() => setViewingBill(null)}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
                  >
                    Done
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BillHistory;
