import React, { useState } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bill, Expense } from '../types';
import { FileText, Download, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const generateReport = async (formatType: 'pdf' | 'excel') => {
    setLoading(true);
    try {
      const date = new Date(targetDate);
      let start, end;

      if (reportType === 'daily') {
        start = startOfDay(date);
        end = endOfDay(date);
      } else {
        start = startOfMonth(date);
        end = endOfMonth(date);
      }

      // Fetch Data
      const billsRef = collection(db, 'bills');
      const bSnap = await getDocs(query(billsRef, where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end)), orderBy('createdAt', 'asc')));
      const bills = bSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate() } as Bill));

      const expRef = collection(db, 'expenses');
      const eSnap = await getDocs(query(expRef, where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end))));
      const expenses = eSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate() } as Expense));

      const purRef = collection(db, 'purchases');
      const pSnap = await getDocs(query(purRef, where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end))));
      const purchases = pSnap.docs.map(d => ({ ...d.data() } as any));

      if (formatType === 'excel') {
        const wb = XLSX.utils.book_new();
        
        const billsData = bills.map(b => ({
          'Bill #': b.billNumber,
          'Date': format(b.createdAt, 'dd-MM-yyyy'),
          'Customer': b.customerPhone,
          'Bike': b.bikeNumber,
          'Service+Labor (Rs)': (b.serviceCharge || 0) + (b.laborCharge || 0),
          'Total (Rs)': b.total,
          'Discount (Rs)': b.discount || 0,
          'Paid (Rs)': b.amountPaid || b.total,
          'Balance (Rs)': b.balance || 0,
          'Bill Profit (Rs)': b.profit
        }));
        const wsBills = XLSX.utils.json_to_sheet(billsData);
        XLSX.utils.book_append_sheet(wb, wsBills, "Sales Report");

        const expData = expenses.map(e => ({
          'Date': format(e.createdAt, 'dd-MM-yyyy'),
          'Description': e.description,
          'Category': e.category,
          'Amount (Rs)': e.amount
        }));
        const wsExp = XLSX.utils.json_to_sheet(expData);
        XLSX.utils.book_append_sheet(wb, wsExp, "Expenses Report");

        const purData = purchases.map(p => ({
          'Supplier': p.supplierName,
          'Total (Rs)': p.total
        }));
        const wsPur = XLSX.utils.json_to_sheet(purData);
        XLSX.utils.book_append_sheet(wb, wsPur, "Purchases Report");

        XLSX.writeFile(wb, `Afzal_Auto_Report_${reportType}_${targetDate}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Afzal Auto Service - ${reportType === 'daily' ? 'Daily' : 'Monthly'} Report`, 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generated for: ${targetDate}`, 105, 22, { align: 'center' });

        const totalSales = bills.reduce((acc, curr) => acc + curr.total, 0);
        const totalProfitFromBills = bills.reduce((acc, curr) => acc + curr.profit, 0);
        const totalServiceLabor = bills.reduce((acc, curr) => acc + ((curr.serviceCharge || 0) + (curr.laborCharge || 0)), 0);
        const totalDiscount = bills.reduce((acc, curr) => acc + (curr.discount || 0), 0);
        const totalExp = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const totalPurchases = purchases.reduce((acc, curr) => acc + curr.total, 0);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Total Sales: Rs ${totalSales}`, 20, 35);
        doc.text(`Total Stock Purchases: Rs ${totalPurchases}`, 20, 40);
        doc.text(`Total Service + Labor: Rs ${totalServiceLabor}`, 20, 45);
        doc.text(`Total Discounts Given: Rs ${totalDiscount}`, 100, 35);
        doc.text(`Total Expenses: Rs ${totalExp}`, 100, 40);
        
        doc.setDrawColor(200);
        doc.line(20, 53, 190, 53);

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`OPERATIONAL PROFIT (Labor - Expenses): Rs ${totalServiceLabor - totalExp}`, 20, 60);
        
        doc.setFontSize(14);
        doc.setTextColor(249, 115, 22); // Orange
        doc.text(`NET CASH SYSTEM PROFIT: Rs ${totalProfitFromBills - totalExp - totalPurchases}`, 20, 70);

        autoTable(doc, {
          startY: 80,
          head: [['Date', 'Bill #', 'Bike', 'Total', 'Disc', 'Svc+Lab', 'Profit']],
          body: bills.map(b => [
            format(b.createdAt, 'dd/MM'), 
            b.billNumber, 
            b.bikeNumber, 
            b.total, 
            b.discount || 0,
            (b.serviceCharge || 0) + (b.laborCharge || 0),
            b.profit
          ]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        });

        doc.save(`Report_${targetDate}.pdf`);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating report. Ensure there is data for the selected range.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <FileText className="text-orange-500" /> Business Reports
          </h1>
          <p className="text-neutral-500 text-sm">Extract sales, profit, and expense breakdowns for analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-8">
           <h3 className="text-lg font-bold text-white mb-2">Configure Report</h3>
           
           <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Range Strategy</label>
                <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                   <button 
                     onClick={() => setReportType('daily')}
                     className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${reportType === 'daily' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/10' : 'text-neutral-500 hover:text-white'}`}
                   >
                     Daily Breakdown
                   </button>
                   <button 
                     onClick={() => setReportType('monthly')}
                     className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${reportType === 'monthly' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/10' : 'text-neutral-500 hover:text-white'}`}
                   >
                     Monthly Overview
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Select Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                  <input 
                    type={reportType === 'daily' ? 'date' : 'month'}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                 <button 
                    disabled={loading}
                    onClick={() => generateReport('pdf')}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                    Download PDF Report
                 </button>
                 <button 
                    disabled={loading}
                    onClick={() => generateReport('excel')}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                    Download Excel (CSV)
                 </button>
              </div>
           </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
           <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Operational Analytics</h3>
           <p className="text-sm text-neutral-500 max-w-xs leading-relaxed mb-6">
             See your craftsmanship profit. This section calculates the income from services minus your daily overhead.
           </p>

           <div className="w-full p-6 bg-black/50 border border-border rounded-2xl mb-8 group hover:border-orange-500/50 transition-colors">
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Operational Calculation</p>
              <h4 className="text-lg font-serif text-white">Service+Labor - Expenses</h4>
              <div className="mt-4 flex flex-col gap-2">
                 <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Service Goal:</span>
                    <span className="text-emerald-500 font-bold">In-Sync</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Expense Deductions:</span>
                    <span className="text-danger font-bold">Enabled</span>
                 </div>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Status</p>
                <p className="text-sm font-bold text-emerald-500">System Ready</p>
              </div>
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Data Health</p>
                <p className="text-sm font-bold text-blue-500">Synchronized</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
