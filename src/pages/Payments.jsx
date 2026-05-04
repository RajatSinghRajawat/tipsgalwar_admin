import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaCalendarAlt, FaCheckCircle, FaChevronRight, FaCreditCard,
  FaEdit, FaFileInvoiceDollar, FaMoneyBillWave, FaPlus, FaReceipt, FaRupeeSign,
  FaSearch, FaSyncAlt, FaTimes, FaTrash, FaUserGraduate, FaWallet, FaChartLine,
  FaIdCard, FaUniversity, FaClock, FaBuilding, FaListUl, FaCheckDouble
} from 'react-icons/fa';
import { useToast } from '../components/Toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PAYMENT_API_BASE_URL = 'http://localhost:3005/apis/payment';
const STUDENT_API_BASE_URL = 'http://localhost:3005/apis/student';

const initialFormState = {
  student_id: '',
  amount: '',
  emi_discount: '0',
  emi_type: '',
  payment_date: '',
  emi_duedate: '',
  receipt: '',
  txn_id: '',
  is_full_payment: false,
  total_emis: 4
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number(value) || 0);

const formatDate = (value, includeTime = false) => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('en-IN', includeTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return value; }
};

const normalizeAmount = (value) => {
  const parsed = Number(value);
  return isFinite(parsed) ? parsed : NaN;
};

const readApiResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
};

const getApiErrorMessage = (result, fallback) => {
  const candidates = [
    result?.details?.description, result?.details?.reason, result?.error?.description,
    result?.error?.reason, result?.message
  ].filter(Boolean);
  return candidates[0] || fallback;
};

const getStatusBadge = (status, isPaid) => {
  const isPaidStatus = isPaid || status === 'paid';
  const bg = isPaidStatus ? 'bg-emerald-100' : (status === 'failed' ? 'bg-rose-100' : 'bg-amber-100');
  const text = isPaidStatus ? 'text-emerald-800' : (status === 'failed' ? 'text-rose-800' : 'text-amber-800');
  return `${bg} ${text} px-2.5 py-0.5 rounded-full text-[11px] font-bold`;
};

// Helper to generate EMI schedule dates
const generateEmiSchedule = (startDate, emiType, totalEmis) => {
  if (!startDate || !emiType || !totalEmis) return [];
  const dates = [];
  let current = new Date(startDate);
  for (let i = 0; i < totalEmis; i++) {
    const next = new Date(current);
    switch (emiType) {
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'semester': next.setMonth(next.getMonth() + 6); break;
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
      default: next.setMonth(next.getMonth() + 1);
    }
    dates.push(new Date(next));
    current = next;
  }
  return dates;
};

const Payments = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormState);
  const [totalEmis, setTotalEmis] = useState(4);
  const [isOnlineSubmitting, setIsOnlineSubmitting] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    amount: '', emi_discount: '0', emi_type: '', payment_date: '', emi_duedate: '', receipt: '', is_full_payment: false
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedPayment = expandedRowId ? payments.find(p => p._id === expandedRowId) : null;
  const selectedStudent = students.find(s => s._id === formData.student_id);

  const toggleRowExpansion = (id) => setExpandedRowId(prev => prev === id ? null : id);
  const closePaymentDetail = () => setExpandedRowId(null);
  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData(initialFormState);
    setTotalEmis(4);
  };

  const fetchPayments = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true); else setRefreshing(true);
      const res = await fetch(PAYMENT_API_BASE_URL);
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Failed to load payments.'));
      setPayments(result.payments || []);
      if (expandedRowId && !(result.payments || []).some(p => p._id === expandedRowId)) setExpandedRowId(null);
    } catch (err) { toast.error(err.message); }
    finally { if (showLoader) setLoading(false); else setRefreshing(false); }
  };

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const res = await fetch(`${STUDENT_API_BASE_URL}/get`);
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Failed to load students.'));
      setStudents(result.data || []);
    } catch (err) { toast.error(err.message); }
    finally { setStudentsLoading(false); }
  };

  useEffect(() => { Promise.all([fetchPayments(), fetchStudents()]); }, []);

  const downloadReceipt = async (paymentId) => {
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/${paymentId}/receipt`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch { toast.error('Could not download receipt'); }
  };

  // New function to download EMI schedule PDF
  const downloadEmiSchedule = () => {
    if (!formData.emi_type || !formData.emi_duedate) {
      toast.error('Please select EMI Type and Due Date first');
      return;
    }
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }
    const amount = normalizeAmount(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Valid amount required to generate schedule');
      return;
    }
    const discount = normalizeAmount(formData.emi_discount) || 0;
    const netAmount = amount - discount;
    const emiAmount = netAmount / totalEmis;

    const startDate = new Date(formData.emi_duedate);
    const dueDates = [];
    let current = new Date(startDate);
    for (let i = 0; i < totalEmis; i++) {
      const next = new Date(current);
      switch (formData.emi_type) {
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        case 'quarterly': next.setMonth(next.getMonth() + 3); break;
        case 'semester': next.setMonth(next.getMonth() + 6); break;
        case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
        default: next.setMonth(next.getMonth() + 1);
      }
      dueDates.push(new Date(next));
      current = next;
    }

    const student = selectedStudent;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('EMI Payment Schedule', 14, 22);
    doc.setFontSize(10);
    doc.text(`Student: ${student?.name || 'N/A'} (${student?.enrollment_Id || 'N/A'})`, 14, 32);
    doc.text(`Course: ${student?.course_Id?.course_Name || 'N/A'}`, 14, 38);
    doc.text(`Total Amount: ₹${amount.toFixed(2)}`, 14, 44);
    doc.text(`Discount: ₹${discount.toFixed(2)}`, 14, 50);
    doc.text(`Net Amount: ₹${netAmount.toFixed(2)}`, 14, 56);
    doc.text(`EMI Type: ${formData.emi_type}`, 14, 62);
    doc.text(`Number of EMIs: ${totalEmis}`, 14, 68);
    doc.text(`Each EMI Amount: ₹${emiAmount.toFixed(2)}`, 14, 74);

    const tableData = dueDates.map((date, idx) => [
      idx + 1,
      date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      `₹${emiAmount.toFixed(2)}`
    ]);
    doc.autoTable({
      startY: 82,
      head: [['EMI No.', 'Due Date', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }
    });
    doc.save(`EMI_Schedule_${student?.enrollment_Id || 'student'}.pdf`);
    toast.success('EMI schedule downloaded');
  };

  const validatePaymentForm = () => {
    if (!formData.student_id) { toast.error('Select a student'); return null; }
    const amount = normalizeAmount(formData.amount);
    if (!amount || amount <= 0) { toast.error('Valid amount required'); return null; }
    const discount = normalizeAmount(formData.emi_discount || 0);
    if (isNaN(discount) || discount < 0) { toast.error('Discount must be ≥ 0'); return null; }
    return { amount, emiDiscount: discount };
  };

  // ======================== FIXED: Online Payment ========================
  const handleOnlinePayment = async () => {
    const valid = validatePaymentForm();
    if (!valid) return;
    if (!window.Razorpay) { toast.error('Razorpay not loaded'); return; }

    // Calculate per‑EMI amount for EMI payments
    let amountToPay = valid.amount;         // default for full payment
    let discountPerEmi = valid.emiDiscount; // default for full payment

    if (!formData.is_full_payment) {
      const netTotal = valid.amount - valid.emiDiscount;
      amountToPay = netTotal / totalEmis;          // per EMI amount
      discountPerEmi = valid.emiDiscount / totalEmis; // distribute discount equally
    }

    try {
      setIsOnlineSubmitting(true);
      const payload = {
        student_id: formData.student_id,
        amount: amountToPay,                     // ← fixed
        emi_discount: discountPerEmi,            // ← fixed
        emi_type: formData.is_full_payment ? null : (formData.emi_type || null),
        emi_duedate: formData.is_full_payment ? null : (formData.emi_duedate || null),
        receipt: formData.receipt || undefined,
        is_full_payment: formData.is_full_payment,
        total_emis: formData.is_full_payment ? null : totalEmis
      };
      const res = await fetch(`${PAYMENT_API_BASE_URL}/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Order creation failed'));
      const key = result.key || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) throw new Error('Razorpay key missing');
      const order = result.order;
      if (!order?.id) throw new Error('Invalid order');
      const options = {
        key, amount: order.amount, currency: order.currency, name: 'TIPS-G Alwar',
        description: `Payment for ${selectedStudent?.name || 'student'}`, order_id: order.id,
        prefill: { name: selectedStudent?.name || '', email: selectedStudent?.email || '', contact: selectedStudent?.contact || '' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${PAYMENT_API_BASE_URL}/verify`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, ...payload, payment_date: formData.payment_date || new Date().toISOString() })
            });
            const verifyResult = await readApiResponse(verifyRes);
            if (!verifyRes.ok || !verifyResult.verified) throw new Error('Verification failed');
            toast.success('Payment successful');
            setFormData(initialFormState);
            setTotalEmis(4);
            closeCreateModal();
            fetchPayments(false);
          } catch (err) { toast.error(err.message); }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) { toast.error(err.message); }
    finally { setIsOnlineSubmitting(false); }
  };

  // ======================== FIXED: Manual Payment ========================
  const handleManualPayment = async () => {
    const valid = validatePaymentForm();
    if (!valid) return;

    let amountToPay = valid.amount;
    let discountPerEmi = valid.emiDiscount;

    if (!formData.is_full_payment) {
      const netTotal = valid.amount - valid.emiDiscount;
      amountToPay = netTotal / totalEmis;
      discountPerEmi = valid.emiDiscount / totalEmis;
    }

    try {
      setIsManualSubmitting(true);
      const payload = {
        txn_id: formData.txn_id || null,
        student_id: formData.student_id,
        amount: amountToPay,                     // ← fixed
        is_paid: true,
        emi_discount: discountPerEmi,            // ← fixed
        emi_type: formData.is_full_payment ? null : (formData.emi_type || null),
        payment_date: formData.payment_date || new Date().toISOString(),
        emi_duedate: formData.is_full_payment ? null : (formData.emi_duedate || null),
        receipt: formData.receipt || null,
        currency: 'INR',
        status: 'paid',
        is_full_payment: formData.is_full_payment,
        total_emis: formData.is_full_payment ? null : totalEmis
      };
      const res = await fetch(`${PAYMENT_API_BASE_URL}/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Manual payment failed'));
      toast.success('Manual payment saved');
      setFormData(initialFormState);
      setTotalEmis(4);
      closeCreateModal();
      fetchPayments(false);
    } catch (err) { toast.error(err.message); }
    finally { setIsManualSubmitting(false); }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Delete this payment permanently?')) return;
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/${id}`, { method: 'DELETE' });
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Delete failed'));
      toast.success('Payment deleted');
      if (expandedRowId === id) setExpandedRowId(null);
      fetchPayments(false);
    } catch (err) { toast.error(err.message); }
  };

  const handleEditPayment = (payment) => {
    setEditingPaymentId(payment._id);
    setEditFormData({
      amount: payment.amount || '',
      emi_discount: payment.emi_discount || '0',
      emi_type: payment.emi_type || '',
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : '',
      emi_duedate: payment.emi_duedate ? new Date(payment.emi_duedate).toISOString().split('T')[0] : '',
      receipt: payment.receipt || '',
      is_full_payment: payment.is_full_payment || false
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const amount = normalizeAmount(editFormData.amount);
    if (!amount || amount <= 0) { toast.error('Valid amount required'); return; }
    try {
      setIsEditSubmitting(true);
      const res = await fetch(`${PAYMENT_API_BASE_URL}/${editingPaymentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          emi_discount: normalizeAmount(editFormData.emi_discount) || 0,
          emi_type: editFormData.is_full_payment ? null : (editFormData.emi_type || null),
          payment_date: editFormData.payment_date ? new Date(editFormData.payment_date).toISOString() : undefined,
          emi_duedate: editFormData.is_full_payment ? null : (editFormData.emi_duedate || undefined),
          receipt: editFormData.receipt || null,
          is_full_payment: editFormData.is_full_payment
        })
      });
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Update failed'));
      toast.success('Payment updated');
      setEditingPaymentId(null);
      fetchPayments(false);
    } catch (err) { toast.error(err.message); }
    finally { setIsEditSubmitting(false); }
  };

  const filteredPayments = payments.filter(p => {
    const search = searchTerm.toLowerCase();
    return [p.student_id?.name, p.student_id?.enrollment_Id, p.txn_id, p.razorpay_order_id, p.razorpay_payment_id, p.receipt, p.status, String(p.amount)]
      .some(val => String(val || '').toLowerCase().includes(search));
  });

  const totalCollected = payments.reduce((sum, p) => sum + ((p.is_paid || p.status === 'paid') ? (Number(p.amount) || 0) : 0), 0);
  const pendingAmount = payments.reduce((sum, p) => sum + ((!p.is_paid && p.status !== 'paid') ? (Number(p.amount) || 0) : 0), 0);
  const studentsWithPayments = new Set(payments.map(p => p.student_id?._id).filter(Boolean)).size;

  // Compute EMI schedule for selected payment (if not full payment)
  const emiSchedule = selectedPayment && !selectedPayment.is_full_payment && selectedPayment.emi_duedate && selectedPayment.emi_type
    ? generateEmiSchedule(new Date(selectedPayment.payment_date), selectedPayment.emi_type, 4)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-800 p-2 rounded-lg shadow-md">
              <FaBuilding className="text-amber-100 text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-800">TIPS GALWAR</h1>
              <p className="text-stone-500 text-sm">Payment Management Desk</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => fetchPayments(false)} disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50 transition disabled:opacity-60 shadow-sm">
              <FaSyncAlt className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition shadow-md">
              <FaPlus className="h-3.5 w-3.5" /> Create Payment
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Collected', value: formatCurrency(totalCollected), icon: FaWallet, color: 'emerald' },
            { label: 'Pending Amount', value: formatCurrency(pendingAmount), icon: FaChartLine, color: 'amber' },
            { label: 'Transactions', value: payments.length, icon: FaCreditCard, color: 'stone' },
            { label: 'Students Paid', value: studentsWithPayments, icon: FaUserGraduate, color: 'stone' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-stone-800">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded Payment Detail Panel */}
        <AnimatePresence>
          {selectedPayment && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-cream-50 rounded-xl border border-amber-200 shadow-lg mb-8 overflow-hidden"
            >
              {/* Receipt Header */}
              <div className="bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4 text-white flex flex-wrap justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FaBuilding className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">TIPS GALWAR</h2>
                    <p className="text-xs text-amber-100">Institute of Technical & Professional Studies</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80">Payment Receipt</p>
                  <p className="text-sm font-mono">Receipt No: {selectedPayment.receipt || selectedPayment._id?.slice(-8) || 'N/A'}</p>
                  <p className="text-xs">Date: {formatDate(selectedPayment.created_at || selectedPayment.payment_date)}</p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Student Details */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-700 border-b border-amber-200 pb-2 flex items-center gap-2"><FaUserGraduate className="text-amber-600" /> Student Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-stone-500">Name:</span> <span className="font-medium text-stone-800">{selectedPayment.student_id?.name || 'N/A'}</span></div>
                      <div><span className="text-stone-500">Enrollment ID:</span> <span className="font-medium text-stone-800">{selectedPayment.student_id?.enrollment_Id || 'N/A'}</span></div>
                      <div><span className="text-stone-500">Email:</span> <span className="font-medium break-all text-stone-800">{selectedPayment.student_id?.email || 'N/A'}</span></div>
                      <div><span className="text-stone-500">Contact:</span> <span className="font-medium text-stone-800">{selectedPayment.student_id?.contact || 'N/A'}</span></div>
                      <div><span className="text-stone-500">Course:</span> <span className="font-medium text-stone-800">{selectedPayment.student_id?.course_Id?.course_Name || 'N/A'}</span></div>
                      <div><span className="text-stone-500">Batch:</span> <span className="font-medium text-stone-800">{selectedPayment.student_id?.batch_Id?.batch_Name || 'N/A'}</span></div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-700 border-b border-amber-200 pb-2 flex items-center gap-2"><FaReceipt className="text-amber-600" /> Payment Summary</h3>
                    <div className="bg-amber-50/50 rounded-lg p-4 space-y-2 text-sm border border-amber-100">
                      <div className="flex justify-between"><span className="text-stone-600">EMI Type:</span> <span className="font-medium text-stone-800">{selectedPayment.emi_type || (selectedPayment.is_full_payment ? 'Full Payment' : 'N/A')}</span></div>
                      {!selectedPayment.is_full_payment && (
                        <>
                          <div className="flex justify-between"><span className="text-stone-600">EMI Number:</span> <span className="font-medium text-stone-800">{selectedPayment.emi_number || 1} of {selectedPayment.total_emis || totalEmis}</span></div>
                          <div className="flex justify-between"><span className="text-stone-600">Amount Paid:</span> <span className="font-bold text-stone-800">{formatCurrency(selectedPayment.amount)}</span></div>
                          <div className="flex justify-between"><span className="text-stone-600">EMI Discount:</span> <span className="text-emerald-700">- {formatCurrency(selectedPayment.emi_discount)}</span></div>
                          <div className="flex justify-between border-t border-amber-200 pt-2 mt-2"><span className="font-semibold text-stone-700">Net Amount:</span> <span className="font-bold text-lg text-stone-800">{formatCurrency((selectedPayment.amount || 0) - (selectedPayment.emi_discount || 0))}</span></div>
                        </>
                      )}
                      {selectedPayment.is_full_payment && (
                        <div className="flex justify-between"><span className="font-semibold text-stone-700">Full Payment Amount:</span> <span className="font-bold text-lg text-stone-800">{formatCurrency(selectedPayment.amount)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-stone-600">Transaction ID:</span> <span className="font-medium break-all text-stone-800">{selectedPayment.txn_id || selectedPayment.razorpay_payment_id || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-stone-600">Status:</span> <span className={getStatusBadge(selectedPayment.status, selectedPayment.is_paid)}>{selectedPayment.is_paid ? 'Paid' : selectedPayment.status}</span></div>
                    </div>
                  </div>
                </div>

                {!selectedPayment.is_full_payment && selectedPayment.emi_duedate && (
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 shadow-sm">
                      <h4 className="font-semibold text-amber-800 flex items-center gap-2"><FaClock /> Next Payment Due</h4>
                      <p className="text-2xl font-bold text-amber-900 mt-2">{formatDate(selectedPayment.emi_duedate)}</p>
                      <p className="text-sm text-amber-700">EMI Number: {(selectedPayment.emi_number || 1) + 1} of {selectedPayment.total_emis || totalEmis}</p>
                      <p className="text-sm text-amber-700">Amount Due: {formatCurrency(selectedPayment.amount)}</p>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-4 border border-stone-200 shadow-sm">
                      <h4 className="font-semibold text-stone-700 flex items-center gap-2"><FaListUl /> Upcoming EMI Schedule</h4>
                      <div className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                        {emiSchedule.length > 0 ? emiSchedule.map((date, idx) => (
                          <div key={idx} className="flex justify-between border-b border-stone-200 py-1">
                            <span className="text-stone-600">EMI #{idx + 2}</span>
                            <span className="text-stone-700">{formatDate(date)}</span>
                            <span className="font-medium text-stone-800">{formatCurrency(selectedPayment.amount)}</span>
                          </div>
                        )) : <p className="text-stone-500">No upcoming EMI schedule</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-end gap-3 pt-4 border-t border-amber-200">
                  <button onClick={() => downloadReceipt(selectedPayment._id)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition shadow-sm">Download Receipt (PDF)</button>
                  <button onClick={() => handleEditPayment(selectedPayment)} className="flex items-center gap-2 px-4 py-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition">Edit Payment</button>
                  <button onClick={() => handleDeletePayment(selectedPayment._id)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition">Delete Payment</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Records Table */}
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-800">Payment Records</h2>
              <p className="text-sm text-stone-500">Click any row to view full receipt & details</p>
            </div>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name, receipt, transaction..." className="pl-9 pr-4 py-2 border border-amber-200 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 text-xs font-bold uppercase tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Payment Ref</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan="6" className="px-4 py-8 text-center text-stone-400">Loading payments...</td></tr>)
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-12 text-center text-stone-400">No payments found. Create one using the button above.</td></tr>
                ) : (
                  filteredPayments.map(payment => (
                    <React.Fragment key={payment._id}>
                      <tr
                        className={`cursor-pointer transition hover:bg-amber-50 ${expandedRowId === payment._id ? 'bg-amber-50/40' : ''}`}
                        onClick={() => toggleRowExpansion(payment._id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`transition-transform ${expandedRowId === payment._id ? 'rotate-90' : ''}`}>
                              <FaChevronRight className="text-stone-400 text-xs" />
                            </div>
                            <div>
                              <p className="font-semibold text-stone-800">{payment.student_id?.name || 'Unknown'}</p>
                              <p className="text-[11px] text-stone-500">Enroll: {payment.student_id?.enrollment_Id || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-600 text-xs">
                          <div>Txn: {payment.txn_id || payment.razorpay_payment_id || '—'}</div>
                          <div className="text-stone-400">Receipt: {payment.receipt || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-stone-800">{formatCurrency(payment.amount)}</p>
                          <p className="text-[11px] text-stone-500">Discount: {formatCurrency(payment.emi_discount)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-600">
                          <div>Paid: {formatDate(payment.payment_date)}</div>
                          <div>Due: {formatDate(payment.emi_duedate)}</div>
                          {payment.is_full_payment && <span className="text-emerald-600 text-[10px]">Full Payment</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={getStatusBadge(payment.status, payment.is_paid)}>
                            {payment.is_paid ? 'PAID' : payment.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => downloadReceipt(payment._id)} className="p-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition" title="Download Receipt"><FaFileInvoiceDollar size={14} /></button>
                            <button onClick={() => handleEditPayment(payment)} className="p-1.5 rounded bg-stone-100 text-stone-700 hover:bg-stone-200 transition" title="Edit"><FaEdit size={14} /></button>
                            <button onClick={() => handleDeletePayment(payment._id)} className="p-1.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 transition" title="Delete"><FaTrash size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Payment Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-5 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Create Payment</h3>
                    <p className="text-xs text-stone-500">Online or manual entry</p>
                  </div>
                  <button onClick={closeCreateModal} className="p-1 rounded-full hover:bg-amber-100"><FaTimes /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Student</label>
                    <select name="student_id" value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500">
                      <option value="">{studentsLoading ? 'Loading...' : 'Select student'}</option>
                      {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.enrollment_Id})</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <input type="checkbox" id="full_payment" checked={formData.is_full_payment}
                      onChange={(e) => {
                        setFormData({ ...formData, is_full_payment: e.target.checked, emi_type: '', emi_duedate: '' });
                        if (e.target.checked) setTotalEmis(0);
                        else setTotalEmis(4);
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" />
                    <label htmlFor="full_payment" className="text-sm font-medium text-stone-700 flex items-center gap-2">
                      <FaCheckDouble className="text-amber-600" /> On‑the‑spot Full Payment (No EMI)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Total Amount (₹)</label>
                      <div className="relative"><FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
                        <input type="number" name="amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 border border-amber-200 rounded-lg text-sm" placeholder="0.00" /></div></div>
                    <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Total Discount (₹)</label>
                      <input type="number" name="emi_discount" value={formData.emi_discount} onChange={e => setFormData({ ...formData, emi_discount: e.target.value })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="0" /></div>
                    
                    {!formData.is_full_payment && (
                      <>
                        <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">EMI Type</label>
                          <select name="emi_type" value={formData.emi_type} onChange={e => setFormData({ ...formData, emi_type: e.target.value })}
                            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">None</option><option>monthly</option><option>quarterly</option><option>semester</option><option>yearly</option>
                          </select></div>
                        <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">First EMI Due Date</label>
                          <input type="date" name="emi_duedate" value={formData.emi_duedate} onChange={e => setFormData({ ...formData, emi_duedate: e.target.value })}
                            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" /></div>
                        <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Number of EMIs</label>
                          <input type="number" min="1" max="24" value={totalEmis} onChange={e => setTotalEmis(Number(e.target.value))}
                            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" /></div>
                        {/* Show per EMI amount after calculation */}
                        {formData.amount && formData.emi_discount !== undefined && totalEmis > 0 && (
                          <div className="sm:col-span-2 mt-2 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm">
                            <span className="font-semibold">Per EMI Amount:</span>{' '}
                            {formatCurrency((Number(formData.amount || 0) - Number(formData.emi_discount || 0)) / totalEmis)}
                          </div>
                        )}
                      </>
                    )}
                    <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Payment Date</label>
                      <input type="date" name="payment_date" value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Receipt ID (optional)</label>
                      <input type="text" name="receipt" value={formData.receipt} onChange={e => setFormData({ ...formData, receipt: e.target.value })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Transaction ID (for manual payments)</label>
                      <input type="text" name="txn_id" value={formData.txn_id} onChange={e => setFormData({ ...formData, txn_id: e.target.value })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="For offline payments" /></div>
                  </div>

                  {/* Download EMI Schedule Button */}
                  {!formData.is_full_payment && formData.emi_type && formData.emi_duedate && (
                    <button type="button" onClick={downloadEmiSchedule}
                      className="w-full py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-200 transition">
                      <FaFileInvoiceDollar /> Download EMI Payment Schedule (PDF)
                    </button>
                  )}

                  {selectedStudent && (
                    <div className="bg-amber-50/40 rounded-lg p-3 text-sm text-stone-700 border border-amber-100">
                      <span className="font-semibold">{selectedStudent.name}</span> - {selectedStudent.course_Id?.course_Name} | {formData.is_full_payment ? 'Full Payment' : `EMI: ${selectedStudent.emi || 'N/A'}`}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleOnlinePayment} disabled={isOnlineSubmitting}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition shadow-sm">
                      {isOnlineSubmitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaCreditCard /> Pay Online</>}
                    </button>
                    <button onClick={handleManualPayment} disabled={isManualSubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition shadow-sm">
                      {isManualSubmitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaCheckCircle /> Manual Entry</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingPaymentId && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white border-b px-5 py-4 flex justify-between items-center">
                  <h3 className="text-lg font-bold">Edit Payment</h3>
                  <button onClick={() => setEditingPaymentId(null)} className="p-1 rounded-full hover:bg-amber-100"><FaTimes /></button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-2">
                    <input type="checkbox" id="edit_full_payment" name="is_full_payment" checked={editFormData.is_full_payment} onChange={handleEditInputChange} className="w-4 h-4" />
                    <label htmlFor="edit_full_payment" className="text-sm font-medium text-stone-700 flex items-center gap-2"><FaCheckDouble className="text-amber-600" /> On‑the‑spot Full Payment (No EMI)</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-bold uppercase text-stone-500 mb-1">Amount</label><input type="number" name="amount" value={editFormData.amount} onChange={handleEditInputChange} className="w-full border rounded-lg px-3 py-2 text-sm" required /></div>
                    <div><label className="block text-xs font-bold uppercase text-stone-500 mb-1">EMI Discount</label><input type="number" name="emi_discount" value={editFormData.emi_discount} onChange={handleEditInputChange} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    {!editFormData.is_full_payment && (
                      <>
                        <div><label className="block text-xs font-bold uppercase text-stone-500 mb-1">EMI Type</label><select name="emi_type" value={editFormData.emi_type} onChange={handleEditInputChange} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">None</option><option>monthly</option><option>quarterly</option><option>semester</option><option>yearly</option></select></div>
                        <div><label className="block text-xs font-bold uppercase text-stone-500 mb-1">Due Date</label><input type="date" name="emi_duedate" value={editFormData.emi_duedate} onChange={handleEditInputChange} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                      </>
                    )}
                    <div><label className="block text-xs font-bold uppercase text-stone-500 mb-1">Payment Date</label><input type="date" name="payment_date" value={editFormData.payment_date} onChange={handleEditInputChange} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-xs font-bold uppercase text-stone-500 mb-1">Receipt</label><input type="text" name="receipt" value={editFormData.receipt} onChange={handleEditInputChange} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingPaymentId(null)} className="px-4 py-2 border rounded-lg hover:bg-stone-50 text-sm">Cancel</button>
                    <button type="submit" disabled={isEditSubmitting} className="px-5 py-2 bg-amber-600 text-white rounded-lg flex items-center gap-2 hover:bg-amber-700 text-sm">{isEditSubmitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Payments;