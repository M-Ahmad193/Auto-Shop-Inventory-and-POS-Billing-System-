import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  onSnapshot, 
  Timestamp, 
  runTransaction, 
  doc, 
  limit, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InventoryItem, Bill, Customer, InvoiceSettings } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  ShoppingCart, 
  User, 
  Bike as BikeIcon, 
  Gauge, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  Save, 
  Search,
  Calculator,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

const POSBilling = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastProcessedBill, setLastProcessedBill] = useState<{ id: string; num: number } | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [activeJobCards, setActiveJobCards] = useState<any[]>([]);
  const [showJobCards, setShowJobCards] = useState(false);
  const [currentJobCardId, setCurrentJobCardId] = useState<string | null>(null);

  // Form states
  const [customerSearch, setCustomerSearch] = useState('');
  const [suggestedCustomers, setSuggestedCustomers] = useState<Customer[]>([]);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    bikeNumber: '',
    bikeModel: ''
  });
  const [meterReading, setMeterReading] = useState({
    current: '',
    next: ''
  });
  const [charges, setCharges] = useState({
    service: '0',
    labor: '0'
  });

  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);

  useEffect(() => {
    const fetchInvoiceSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'invoice'));
      if (snap.exists()) {
        setInvoiceSettings(snap.data() as InvoiceSettings);
      }
    };
    fetchInvoiceSettings();

    const unsubscribe = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });

    const qJobCards = query(collection(db, 'jobCards'), where('status', '==', 'active'), orderBy('updatedAt', 'desc'));
    const unsubscribeJobCards = onSnapshot(qJobCards, (snapshot) => {
      setActiveJobCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeJobCards();
    };
  }, []);

  const handleCustomerSearch = async (val: string) => {
    setCustomerSearch(val);
    const v = val.toUpperCase();
    setCustomerData(prev => ({ ...prev, bikeNumber: v }));
    
    if (val.length > 1) {
      const q = query(
        collection(db, 'customers'), 
        where('bikeNumber', '>=', v), 
        where('bikeNumber', '<=', v + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      setSuggestedCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    } else {
      setSuggestedCustomers([]);
    }
  };

  const selectCustomer = (c: Customer) => {
    setCustomerData(c);
    setCustomerSearch(c.bikeNumber);
    setSuggestedCustomers([]);
  };

  const updateCurrentMeter = (val: string) => {
    const current = Number(val);
    setMeterReading({
      current: val,
      next: isNaN(current) ? '' : (current + 1000).toString()
    });
  };

  const addItem = (item: InventoryItem) => {
    if (item.quantity <= 0) return;
    const existing = selectedItems.find(si => si.item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.quantity) return;
      setSelectedItems(selectedItems.map(si => 
        si.item.id === item.id ? { ...si, quantity: si.quantity + 1 } : si
      ));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const removeItemQty = (id: string) => {
    setSelectedItems(selectedItems.map(si => 
      si.item.id === id ? { ...si, quantity: Math.max(0, si.quantity - 1) } : si
    ).filter(si => si.quantity > 0));
  };

  const calculateTotal = () => {
    const itemsTotal = selectedItems.reduce((acc, curr) => acc + ((curr.item.salePrice || 0) * curr.quantity), 0);
    const service = Number(charges.service) || 0;
    const labor = Number(charges.labor) || 0;
    const disc = Number(discount) || 0;
    return itemsTotal + service + labor - disc;
  };

  const calculateProfit = () => {
    const itemsProfit = selectedItems.reduce((acc, curr) => {
      const sale = curr.item.salePrice || 0;
      const cost = curr.item.costPrice || 0;
      return acc + ((sale - cost) * curr.quantity);
    }, 0);
    return itemsProfit;
  };

  const generatePDF = (docId: string, billNum: number) => {
    try {
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
        format: [s.paperWidth, 200] // Length is flexible
      });
      
      const centerX = s.paperWidth / 2;
      const printableWidth = s.paperWidth - 2; // 1mm margin each side for 78mm print area
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
      doc.text(`${s.address}`, centerX, 28, { align: 'center' });
      
      doc.setDrawColor(200);
      doc.line(marginX, 32, s.paperWidth - marginX, 32);

      // Bill Info
      doc.setFontSize(s.bodyFontSize);
      doc.setTextColor(0);
      doc.text(`INV: ${billNum}`, marginX, 40);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, s.paperWidth - marginX, 40, { align: 'right' });

      // Customer Info
      doc.text(`BIKE: ${customerData.bikeNumber}`, marginX, 46);
      doc.text(`${customerData.bikeModel}`, s.paperWidth - marginX, 46, { align: 'right' });
      doc.text(`METER: ${meterReading.current} km`, marginX, 51);

      // Items Table
      const tableRows = selectedItems.map(si => [
        si.item.name,
        si.quantity,
        formatCurrency(si.item.salePrice * si.quantity)
      ]);

      if (Number(charges.service) > 0) tableRows.push(['Service', '1', formatCurrency(Number(charges.service))]);
      if (Number(charges.labor) > 0) tableRows.push(['Labor', '1', formatCurrency(Number(charges.labor))]);
      if (Number(discount) > 0) tableRows.push(['Disc', '1', `-${formatCurrency(Number(discount))}`]);

      autoTable(doc, {
        startY: 58,
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
      doc.text(`TOTAL: ${formatCurrency(calculateTotal())}`, s.paperWidth - marginX, finalY, { align: 'right' });

      const paid = Number(amountPaid) || calculateTotal();
      const balance = calculateTotal() - paid;

      doc.setFontSize(s.bodyFontSize);
      doc.text(`PAID: ${formatCurrency(paid)}`, s.paperWidth - marginX, finalY + 5, { align: 'right' });
      
      if (balance > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`BAL: ${formatCurrency(balance)}`, s.paperWidth - marginX, finalY + 10, { align: 'right' });
      } else {
        doc.setTextColor(22, 163, 74);
        doc.setFontSize(s.bodyFontSize);
        doc.text('PAID FULL', marginX, finalY + 5);
      }

      if (notes) {
        doc.setFontSize(s.bodyFontSize - 2);
        doc.setTextColor(120);
        const splitNotes = doc.splitTextToSize(`Notes: ${notes}`, printableWidth);
        doc.text(splitNotes, marginX, finalY + 18);
      }

      const footerY = notes ? finalY + 28 : finalY + 20;
      doc.setFontSize(s.bodyFontSize - 1);
      doc.setTextColor(100);
      const splitFooter = doc.splitTextToSize(s.footerMessage, printableWidth);
      doc.text(splitFooter, centerX, footerY, { align: 'center' });

      doc.save(`Bill_${billNum}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Print failed: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleProcessBill = async () => {
    if (!customerData.phone || !customerData.bikeNumber) {
      alert("Please enter customer and bike details");
      return;
    }
    setLoading(true);

    try {
      const result = await runTransaction(db, async (transaction) => {
        // 1. Get next bill number (global counter or max from existing)
        const billsRef = collection(db, 'bills');
        const billSnap = await getDocs(query(billsRef, orderBy('billNumber', 'desc'), limit(1)));
        const lastBillNum = billSnap.empty ? 1000 : (billSnap.docs[0].data() as Bill).billNumber;
        const nextBillNum = lastBillNum + 1;

        // 2. READ ALL NECESSARY DATA FIRST
        const inventoryUpdates = [];
        for (const si of selectedItems) {
          const itemRef = doc(db, 'inventory', si.item.id);
          const itemDoc = await transaction.get(itemRef);
          if (!itemDoc.exists()) throw `Item ${si.item.name} not found`;
          
          const currentQty = itemDoc.data().quantity;
          if (currentQty < si.quantity) throw `Insufficient stock for ${si.item.name}`;
          
          inventoryUpdates.push({
            ref: itemRef,
            newQty: currentQty - si.quantity
          });
        }

        // 3. Prepare items for storage
        const billItems = selectedItems.map(si => ({
          id: si.item.id,
          name: si.item.name,
          quantity: si.quantity,
          salePrice: si.item.salePrice,
          costPrice: si.item.costPrice,
          total: si.item.salePrice * si.quantity
        }));

        // 4. PERFORM ALL WRITES
        // A. Create Bill
        const total = calculateTotal();
        const paid = Number(amountPaid) || total; // Default to full if empty
        const balance = total - paid;
        const disc = Number(discount) || 0;
        const partsProfit = calculateProfit();
        const svcCharge = Number(charges.service) || 0;
        const labCharge = Number(charges.labor) || 0;

        const newBillRef = doc(collection(db, 'bills'));
        transaction.set(newBillRef, {
          billNumber: nextBillNum,
          customerPhone: customerData.phone,
          bikeNumber: customerData.bikeNumber,
          bikeModel: customerData.bikeModel,
          currentMeter: Number(meterReading.current) || 0,
          nextMeter: Number(meterReading.next) || 0,
          serviceCharge: svcCharge,
          laborCharge: labCharge,
          discount: disc,
          notes: notes,
          items: billItems,
          total: total,
          amountPaid: paid,
          balance: balance,
          profit: (partsProfit + svcCharge + labCharge) - disc,
          createdAt: serverTimestamp()
        });

        // Update Job Card status if it was active
        if (currentJobCardId) {
          const jobCardRef = doc(db, 'jobCards', currentJobCardId);
          transaction.update(jobCardRef, { status: 'billed', updatedAt: serverTimestamp() });
        }

        // B. Update Inventory
        for (const update of inventoryUpdates) {
          transaction.update(update.ref, { quantity: update.newQty });
        }

        // C. Update/Create Customer
        const customerToSave = { ...customerData };
        // Remove ID from the data body before saving
        const { id: customerId, ...dataWithoutId } = customerToSave as any;
        
        const custRef = customerId 
          ? doc(db, 'customers', customerId)
          : doc(collection(db, 'customers'));

        transaction.set(custRef, {
          ...dataWithoutId,
          lastService: serverTimestamp()
        }, { merge: true });

        return { billId: newBillRef.id, billNum: nextBillNum };
      });

      // Success State - Call OUTSIDE transaction
      setSuccess(true);
      const res = result as { billId: string; billNum: number };
      if (res && res.billNum) {
        setLastProcessedBill({ id: res.billId, num: res.billNum });
        generatePDF(res.billId, res.billNum);
      }
    } catch (error) {
      console.error("Transation failed:", error);
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  const saveJobCard = async () => {
    if (!customerData.phone || !customerData.bikeNumber) {
      alert("Please enter at least customer phone and bike number");
      return;
    }
    setLoading(true);
    try {
      const data = {
        customerName: customerData.name,
        customerPhone: customerData.phone,
        bikeNumber: customerData.bikeNumber,
        bikeModel: customerData.bikeModel,
        currentMeter: Number(meterReading.current) || 0,
        items: selectedItems.map(si => ({
          id: si.item.id,
          name: si.item.name,
          quantity: si.quantity,
          salePrice: si.item.salePrice,
          costPrice: si.item.costPrice
        })),
        serviceCharge: Number(charges.service) || 0,
        laborCharge: Number(charges.labor) || 0,
        discount: Number(discount) || 0,
        notes: notes,
        status: 'active',
        updatedAt: serverTimestamp()
      };

      if (currentJobCardId) {
        const ref = doc(db, 'jobCards', currentJobCardId);
        await addDoc(collection(db, 'logs'), { type: 'jobCard_update', cardId: currentJobCardId, time: serverTimestamp() }); // dummy log
        // Actually we use set with merge or update
        const { id, ...saveData } = data as any;
        await runTransaction(db, async (t) => {
          t.set(ref, data, { merge: true });
        });
      } else {
        await addDoc(collection(db, 'jobCards'), { ...data, createdAt: serverTimestamp() });
      }
      alert("Job Card saved successfully!");
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Error saving job card");
    } finally {
      setLoading(false);
    }
  };

  const loadJobCard = (card: any) => {
    setCurrentJobCardId(card.id);
    setCustomerData({
      name: card.customerName || '',
      phone: card.customerPhone || '',
      bikeNumber: card.bikeNumber || '',
      bikeModel: card.bikeModel || ''
    });
    setCustomerSearch(card.bikeNumber);
    updateCurrentMeter(card.currentMeter?.toString() || '');
    setCharges({
      service: card.serviceCharge?.toString() || '0',
      labor: card.laborCharge?.toString() || '0'
    });
    setDiscount(card.discount?.toString() || '0');
    setNotes(card.notes || '');
    
    // items mapping
    const loadedItems = card.items.map((item: any) => ({
      item: {
        id: item.id,
        name: item.name,
        salePrice: item.salePrice,
        costPrice: item.costPrice,
        quantity: 999 // placeholder quantity for loaded items
      },
      quantity: item.quantity
    }));
    setSelectedItems(loadedItems);
    setShowJobCards(false);
  };

  const resetForm = () => {
    setSelectedItems([]);
    setCustomerSearch('');
    setCustomerData({ name: '', phone: '', bikeNumber: '', bikeModel: '' });
    setMeterReading({ current: '', next: '' });
    setCharges({ service: '0', labor: '0' });
    setAmountPaid('');
    setDiscount('0');
    setNotes('');
    setCurrentJobCardId(null);
    setSuccess(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-100px)] animate-in fade-in duration-500 relative">
      {/* Floating Job Card Button */}
      <button 
        onClick={() => setShowJobCards(true)}
        className="fixed bottom-8 left-8 z-40 bg-accent text-black p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 font-black text-xs uppercase tracking-widest"
      >
        <ClipboardList size={20} />
        Active Job Cards ({activeJobCards.length})
      </button>

      {/* Left: Bill Configuration */}
      <div className="flex-1 space-y-6">
        <div className="bg-card border border-border p-8 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif text-white tracking-tight">Customer & Vehicle</h2>
            {currentJobCardId && (
              <span className="flex items-center gap-2 text-[10px] font-black text-accent bg-accent/10 px-3 py-1 rounded-full uppercase tracking-widest border border-accent/20">
                <Clock size={12} /> Editing Job Card
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1.5 relative">
               <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Bike Number (Quick Search)</label>
               <div className="relative">
                    <input 
                      type="text" 
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      placeholder="e.g. LEC-1234"
                      className="w-full bg-black border border-border rounded py-2.5 px-4 text-white focus:border-accent transition-all font-medium text-sm placeholder:opacity-20"
                    />
               </div>
                {suggestedCustomers.length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-sidebar border border-border rounded shadow-2xl overflow-hidden divide-y divide-border/30">
                     {suggestedCustomers.map(c => (
                       <button 
                         key={c.id}
                         onClick={() => selectCustomer(c)}
                         className="w-full px-4 py-3 text-left hover:bg-black text-sm flex items-center justify-between group transition-colors"
                       >
                         <div>
                           <p className="font-bold text-white group-hover:text-accent transition-colors">{c.bikeNumber}</p>
                           <p className="text-[10px] text-text-s uppercase tracking-widest">{c.name || 'Anonymous'}</p>
                         </div>
                         <div className="text-right">
                           <p className="text-[10px] font-black text-text-s uppercase">{c.phone}</p>
                           <p className="text-[9px] text-accent/50 group-hover:text-accent uppercase font-black">Select Vehicle</p>
                         </div>
                       </button>
                     ))}
                  </div>
                )}
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Customer Name</label>
               <input 
                 type="text" 
                 value={customerData.name}
                 onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                 className="w-full bg-black border border-border rounded py-2.5 px-4 text-white focus:border-accent transition-all text-sm"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Phone Number</label>
               <input 
                 type="text" 
                 value={customerData.phone}
                 onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                 placeholder="03xx-xxxxxxx"
                 className="w-full bg-black border border-border rounded py-2.5 px-4 text-white focus:border-accent transition-all text-sm"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Bike Model</label>
               <input 
                 type="text" 
                 value={customerData.bikeModel}
                 onChange={(e) => setCustomerData({...customerData, bikeModel: e.target.value})}
                 className="w-full bg-black border border-border rounded py-2.5 px-4 text-white focus:border-accent transition-all text-sm"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Current Meter (KM)</label>
               <input 
                 type="text" 
                 value={meterReading.current}
                 onChange={(e) => updateCurrentMeter(e.target.value)}
                 className="w-full bg-black border border-border rounded py-2.5 px-4 text-white focus:border-accent transition-all text-sm"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Next Service Meter</label>
               <input 
                 type="text" 
                 disabled
                 value={meterReading.next}
                 className="w-full bg-[#111] border border-[#444] rounded py-2.5 px-4 text-accent font-bold text-sm"
               />
            </div>
          </div>

          <div className="mt-8 space-y-1.5">
             <label className="text-[10px] font-bold text-text-s uppercase tracking-wider ml-1">Job Card Notes (Description of work to be done)</label>
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               placeholder="Describe work process, parts condition, or customer specific requests..."
               className="w-full bg-black border border-border rounded py-3 px-4 text-white focus:border-accent transition-all text-sm min-h-[100px]"
             />
          </div>
        </div>

        <div className="bg-card border border-border p-8 rounded-xl shadow-lg">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-xl font-serif text-white tracking-tight">Spare Parts Inventory</h2>
            <div className="relative w-full md:w-80 transition-all focus-within:md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-accent group-focus-within:scale-110 transition-transform" size={16} />
              <input 
                type="text"
                placeholder="Search specifically for parts..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full bg-black border-2 border-border/50 rounded-xl py-3 pl-12 pr-10 text-sm text-white focus:border-accent transition-all placeholder:text-text-s/30"
              />
              {itemSearch && (
                <button 
                  onClick={() => setItemSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-s hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {items
              .filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
              .map(item => (
              <button 
                key={item.id}
                disabled={item.quantity <= 0}
                onClick={() => addItem(item)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all relative group h-full flex flex-col justify-between",
                  item.quantity > 0 
                  ? "bg-black border-border hover:border-accent hover:bg-neutral-900 shadow-sm" 
                  : "bg-neutral-900/30 border-border opacity-50 cursor-not-allowed"
                )}
              >
                <div>
                  <p className="text-[10px] font-black text-text-s uppercase tracking-wider mb-2 truncate group-hover:text-accent transition-colors">{item.name}</p>
                  <p className="text-sm font-black text-white">{formatCurrency(item.salePrice)}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                   <span className={cn(
                     "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                     item.quantity < 5 ? "bg-red-500/20 text-red-500" : "bg-accent/10 text-accent"
                   )}>
                     Stock: {item.quantity}
                   </span>
                   <Plus size={14} className="text-white/20 group-hover:text-white transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Checkout Sidebar */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <div className="bg-card border border-border p-8 rounded-xl shadow-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif text-white underline underline-offset-[12px] decoration-accent decoration-2">
              Invoice Summary
            </h2>
          </div>

          <div className="flex-1 space-y-4 mb-8 overflow-y-auto max-h-[350px] custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-text-s uppercase tracking-widest border-b border-border">
                  <th className="text-left pb-3 font-medium">Description</th>
                  <th className="text-center pb-3 font-medium">Qty</th>
                  <th className="text-right pb-3 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map(({ item, quantity }) => (
                  <tr key={item.id} className="border-b border-white/5 animate-in slide-in-from-right-4">
                    <td className="py-3 text-[11px] font-medium text-white max-w-[140px] truncate">{item.name}</td>
                    <td className="py-3 text-[11px] text-center text-text-s">{quantity}</td>
                    <td className="py-3 text-[11px] text-right font-bold text-white">{formatCurrency(item.salePrice * quantity)}</td>
                  </tr>
                ))}
                {(Number(charges.service) > 0 || Number(charges.labor) > 0) && (
                  <tr className="border-b border-white/5 italic opacity-80">
                    <td className="py-3 text-[11px] text-text-s">Service & Labor</td>
                    <td className="py-3 text-[11px] text-center text-text-s">-</td>
                    <td className="py-3 text-[11px] text-right font-bold text-white">{formatCurrency(Number(charges.service) + Number(charges.labor))}</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {selectedItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-text-s py-10">
                <p className="text-xs uppercase tracking-widest italic opacity-50">Pending Invoice</p>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t-2 border-border">
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-text-s uppercase tracking-widest ml-1">Service</label>
                   <input 
                     type="number"
                     value={charges.service}
                     onChange={(e) => setCharges({...charges, service: e.target.value})}
                     className="w-full bg-black border border-border rounded py-2 px-3 text-xs text-white focus:border-accent"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-text-s uppercase tracking-widest ml-1">Labor</label>
                   <input 
                     type="number"
                     value={charges.labor}
                     onChange={(e) => setCharges({...charges, labor: e.target.value})}
                     className="w-full bg-black border border-border rounded py-2 px-3 text-xs text-white focus:border-accent"
                   />
                </div>
             </div>

             <div className="space-y-2 px-1">
                <div className="flex justify-between text-text-s text-[10px] font-bold uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white">{formatCurrency(calculateTotal())}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-border/30">
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest">Amount Paid (Rs)</label>
                  <input 
                    type="number" 
                    placeholder="Full"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-24 bg-black border border-accent/20 rounded py-1 px-2 text-xs text-white text-right focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-t border-border/30">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Discount (Rs)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 bg-black border border-rose-500/20 rounded py-1 px-2 text-xs text-rose-500 text-right focus:border-accent"
                  />
                </div>
                {amountPaid && Number(amountPaid) < calculateTotal() && (
                  <div className="flex justify-between text-[10px] font-bold uppercase text-danger">
                    <span>Balance</span>
                    <span>{formatCurrency(calculateTotal() - Number(amountPaid))}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-border/50 mt-2">
                  <span className="text-xs font-black text-white uppercase tracking-widest">GRAND TOTAL</span>
                  <span className="text-2xl font-black text-accent">{formatCurrency(calculateTotal())}</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => saveJobCard()}
                  disabled={loading}
                  className="py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Save Job Card
                </button>
                <button 
                  onClick={handleProcessBill}
                  disabled={loading || selectedItems.length === 0}
                  className="py-3 bg-accent hover:bg-white text-black font-black rounded shadow-xl shadow-accent/10 text-[10px] uppercase tracking-widest disabled:opacity-50 transition-colors"
                >
                  {loading ? '...' : 'Finalize & Print'}
                </button>
             </div>
             <button 
                onClick={() => resetForm()}
                className="w-full mt-3 py-2 text-[9px] text-text-s/50 hover:text-white uppercase font-bold tracking-[0.2em] transition-colors"
              >
                Discard Current Draft
              </button>
          </div>
        </div>
      </div>

      {/* Job Cards Overlay */}
      <AnimatePresence>
        {showJobCards && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 20, opacity: 0 }}
               className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[85vh]"
            >
               <div className="p-6 border-b border-border flex items-center justify-between bg-accent text-black rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <ClipboardList />
                    <h3 className="text-lg font-black uppercase tracking-tight">Active Job Cards (In-Progress Work)</h3>
                  </div>
                  <button onClick={() => setShowJobCards(false)} className="hover:scale-110 text-black"><X /></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  {activeJobCards.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                       <Clock size={48} className="mx-auto mb-4" />
                       <p className="uppercase tracking-widest font-bold text-sm">No active job cards found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {activeJobCards.map(card => (
                         <div key={card.id} className="bg-black border border-border p-5 rounded-xl hover:border-accent/50 transition-all flex flex-col justify-between group">
                            <div>
                               <div className="flex justify-between items-start mb-4">
                                  <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded font-black uppercase tracking-widest border border-accent/20">Active Draft</span>
                                  <span className="text-[10px] text-text-s">{card.updatedAt?.toDate().toLocaleString()}</span>
                               </div>
                               <h4 className="text-white font-serif text-lg leading-tight uppercase tracking-tight">{card.bikeNumber}</h4>
                               <p className="text-xs text-text-s mb-1">{card.bikeModel} • {card.customerPhone}</p>
                               <div className="mt-4 pt-4 border-t border-border/30">
                                  <p className="text-[10px] font-bold text-text-s uppercase tracking-wider mb-2">Parts & Services:</p>
                                  <div className="flex flex-wrap gap-2 mb-4">
                                     {card.items.slice(0, 3).map((item: any, idx: number) => (
                                       <span key={idx} className="text-[9px] bg-neutral-900 text-white px-2 py-1 rounded">{item.name} x{item.quantity}</span>
                                     ))}
                                     {card.items.length > 3 && <span className="text-[9px] text-accent font-bold">+{card.items.length - 3} more</span>}
                                  </div>
                                  {card.notes && (
                                    <p className="text-[10px] text-text-s italic line-clamp-2 border-l-2 border-accent/30 pl-3">"{card.notes}"</p>
                                  )}
                               </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                               <button 
                                 onClick={() => loadJobCard(card)}
                                 className="flex-1 py-2.5 bg-accent text-black font-black text-[10px] uppercase rounded hover:bg-white transition-all shadow-lg shadow-accent/10"
                               >
                                 Continue Work
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center max-w-sm shadow-px shadow-white/5"
            >
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 ring-4 ring-emerald-500/5">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Bill Generated!</h2>
              <p className="text-neutral-500 text-sm mb-8 leading-relaxed">Operation was successful. The invoice has been printed and inventory stock has been updated automatically.</p>
              
              <div className="space-y-3">
                 <button 
                  onClick={() => lastProcessedBill && generatePDF(lastProcessedBill.id, lastProcessedBill.num)}
                  className="w-full py-3.5 bg-accent hover:bg-white text-black font-black rounded-xl transition-all flex items-center justify-center gap-2"
                 >
                    <Printer size={18} />
                    Reprint Invoice
                 </button>
                 <button 
                  onClick={resetForm}
                  className="w-full py-3.5 bg-neutral-100 hover:bg-white text-neutral-950 font-black rounded-xl transition-all"
                >
                  Start New Bill
                </button>
                 <button 
                  onClick={() => setSuccess(false)}
                  className="w-full py-3.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSBilling;
