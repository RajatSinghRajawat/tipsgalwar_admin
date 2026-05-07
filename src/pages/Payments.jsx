import React, { useEffect, useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaCheckCircle, FaChevronRight, FaCreditCard,
  FaEdit, FaFileInvoiceDollar, FaReceipt, FaRupeeSign,
  FaSearch, FaSyncAlt, FaTimes, FaTrash, FaUserGraduate, FaWallet,
  FaChartLine, FaClock, FaBuilding, FaListUl, FaFilter
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const PAYMENT_API_BASE_URL = 'http://localhost:3005/apis/payment';
const STUDENT_API_BASE_URL = 'http://localhost:3005/apis/student';

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

const formatDate = (value, includeTime = false) => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('en-IN', includeTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
};

const normalizeAmount = (value) => {
  const parsed = Number(value);
  return isFinite(parsed) ? parsed : 0;
};

const readApiResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const getApiErrorMessage = (result, fallback) => {
  const candidates = [
    result?.details?.description,
    result?.details?.reason,
    result?.error?.description,
    result?.error?.reason,
    result?.message,
  ].filter(Boolean);
  return candidates[0] || fallback;
};

const getStatusBadge = (status, isPaid) => {
  const isPaidStatus = isPaid || status === 'paid';
  const bg = isPaidStatus ? 'bg-emerald-100' : status === 'failed' ? 'bg-rose-100' : 'bg-amber-100';
  const text = isPaidStatus ? 'text-emerald-800' : status === 'failed' ? 'text-rose-800' : 'text-amber-800';
  return `${bg} ${text} px-2.5 py-0.5 rounded-full text-[11px] font-bold`;
};

const toTitleCase = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getReceiptStatusLabel = (payment) => {
  if (payment?.is_paid || payment?.status === 'paid') return 'Paid';
  return toTitleCase(payment?.status || 'pending');
};

const getReceiptNumber = (payment) => payment?.receipt || payment?._id?.slice(-8) || 'N/A';

const getPaymentPlanLabel = (payment) => {
  if (payment?.is_full_payment) return 'Full Payment';
  return payment?.emi_type ? toTitleCase(payment.emi_type) : 'N/A';
};

const getCourseLabel = (student) => {
  const course = student?.course_Id;
  if (course && typeof course === 'object') return course.course_Name || 'N/A';
  return course || 'N/A';
};

const getBatchLabel = (student) => {
  const batch = student?.batch_Id;
  if (batch && typeof batch === 'object') return batch.batch_Name || 'N/A';
  return batch || 'N/A';
};

const getStudentAddress = (student) => {
  const address = student?.address;
  if (!address || typeof address !== 'object') return 'N/A';
  const parts = [address.street, address.city, address.state, address.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : 'N/A';
};

const getNetAmount = (payment) => Math.max((Number(payment?.amount) || 0) - (Number(payment?.emi_discount) || 0), 0);

const extractFilenameFromDisposition = (headerValue) => {
  if (!headerValue) return null;
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const basicMatch = headerValue.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] || null;
};

const ReceiptField = ({ label, value, mono = false, valueClassName = '' }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className={`mt-2 break-words text-sm font-semibold text-slate-900 ${mono ? 'font-mono text-[13px]' : ''} ${valueClassName}`}>{value}</p>
  </div>
);

const generateEmiSchedule = (startDate, emiType, totalEmis) => {
  if (!startDate || !emiType || !totalEmis) return [];
  const dates = [];
  let current = new Date(startDate);
  for (let i = 0; i < totalEmis; i++) {
    const next = new Date(current);
    switch (emiType) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semester':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    dates.push(new Date(next));
    current = next;
  }
  return dates;
};

// ---------- PERFECT PDF RECEIPT – NO CUTTING ----------
const generateReceiptPDF = (payment) => {
  if (!payment) return;
  const doc = new jsPDF();
  const student = payment.student_id || {};
  const course = student.course_Id || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('TIPS GALWAR', margin, 22);
  doc.setFontSize(10);
  doc.text('Institute of Technical & Professional Studies', margin, 32);
  doc.text('An ISO 9001:2015 Certified Institute', margin, 40);
  doc.setTextColor(0, 0, 0);

  yPos = 55;

  // Receipt title & number
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text('PAYMENT RECEIPT', margin, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${payment.receipt || payment._id?.slice(-8) || 'N/A'}`, margin, yPos);
  doc.text(`Date: ${formatDate(payment.created_at || payment.payment_date)}`, pageWidth - margin - 40, yPos, { align: 'right' });
  yPos += 6;

  // Status badge
  const statusText = payment.is_paid ? 'PAID' : payment.status || 'PENDING';
  const statusColor = payment.is_paid ? [34, 197, 94] : payment.status === 'failed' ? [239, 68, 68] : [245, 158, 11];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 35, yPos - 5, 35, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(statusText, pageWidth - margin - 17.5, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // Student Information
  doc.setFontSize(11);
  doc.text('Student Information', margin, yPos);
  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  const studentData = [
    ['Name:', student.name || 'N/A'],
    ['Enrollment ID:', student.enrollment_Id || 'N/A'],
    ['Email:', student.email || 'N/A'],
    ['Contact:', student.contact || 'N/A'],
    ['Course:', course.course_Name || 'N/A'],
    ['Batch:', student.batch_Id?.batch_Name || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    body: studentData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, textColor: [60, 60, 60] },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 35 }, 1: { cellWidth: 'auto' } },
    margin: { left: margin, right: margin },
  });
  yPos = doc.lastAutoTable.finalY + 8;

  // Payment Summary
  doc.setFontSize(11);
  doc.text('Payment Summary', margin, yPos);
  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  const summaryData = [['EMI Type:', payment.emi_type || (payment.is_full_payment ? 'Full Payment' : 'N/A')]];
  if (!payment.is_full_payment) {
    summaryData.push(['EMI Number:', `${payment.emi_number || 1} of ${payment.total_emis || 4}`]);
    summaryData.push(['Amount Paid:', formatCurrency(payment.amount)]);
    summaryData.push(['EMI Discount:', `- ${formatCurrency(payment.emi_discount || 0)}`]);
    summaryData.push(['Net Amount:', formatCurrency((payment.amount || 0) - (payment.emi_discount || 0))]);
  } else {
    summaryData.push(['Full Payment Amount:', formatCurrency(payment.amount)]);
  }
  summaryData.push(['Transaction ID:', payment.txn_id || 'N/A']);
  summaryData.push(['Payment Date:', formatDate(payment.payment_date)]);

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 45 }, 1: { cellWidth: 100, textColor: [60, 60, 60] } },
    margin: { left: margin, right: margin },
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // EMI Schedule if applicable
  if (!payment.is_full_payment && payment.emi_duedate && payment.emi_type) {
    const totalEmis = payment.total_emis || 4;
    const emiAmount = ((payment.amount || 0) - (payment.emi_discount || 0)) / totalEmis;
    const dueDates = generateEmiSchedule(new Date(payment.payment_date), payment.emi_type, totalEmis);

    doc.setFontSize(11);
    doc.text('Upcoming EMI Schedule', margin, yPos);
    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    const scheduleData = dueDates.map((date, idx) => [idx + 1, formatDate(date), formatCurrency(emiAmount)]);

    autoTable(doc, {
      startY: yPos,
      head: [['EMI No.', 'Due Date', 'Amount']],
      body: scheduleData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 70 }, 2: { cellWidth: 55 } },
      margin: { left: margin, right: margin },
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated receipt and does not require a signature.', margin, yPos);
  doc.text('Thank you for your payment.', margin, yPos + 5);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos + 10);

  doc.save(`Receipt_${student.enrollment_Id || payment._id}.pdf`);
};

// ---------- MAIN COMPONENT ----------
const Payments = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEmiStatus, setFilterEmiStatus] = useState('all');

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    emi_discount: '0',
    emi_type: '',
    payment_date: '',
    emi_duedate: '',
    receipt: '',
    is_full_payment: false,
    status: 'paid',
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const selectedPayment = expandedRowId ? payments.find((p) => p._id === expandedRowId) : null;

  const toggleRowExpansion = (id) => setExpandedRowId((prev) => (prev === id ? null : id));

  const fetchPayments = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      const res = await fetch(PAYMENT_API_BASE_URL);
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Failed to load payments.'));
      setPayments(result.payments || []);
      if (expandedRowId && !(result.payments || []).some((p) => p._id === expandedRowId)) setExpandedRowId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (showLoader) setLoading(false);
      else setRefreshing(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${STUDENT_API_BASE_URL}/get`);
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Failed to load students.'));
      setStudents(result.data || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    Promise.all([fetchPayments(), fetchStudents()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadReceipt = async (payment) => {
    if (!payment?._id) return;

    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/${payment._id}/receipt`);

      if (!res.ok) {
        const result = await readApiResponse(res);
        throw new Error(getApiErrorMessage(result, 'Receipt download failed.'));
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const filename =
        extractFilenameFromDisposition(res.headers.get('Content-Disposition')) ||
        `Receipt_${payment.student_id?.enrollment_Id || payment._id}.pdf`;

      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Receipt downloaded');
    } catch (err) {
      toast.error(err.message || 'Receipt download failed.');
    }
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
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditPayment = (payment) => {
    let statusValue = payment.is_paid ? 'paid' : payment.status || 'pending';
    if (statusValue === 'unpaid') statusValue = 'pending';

    setEditingPaymentId(payment._id);
    setEditFormData({
      amount: payment.amount || '',
      emi_discount: payment.emi_discount || '0',
      emi_type: payment.emi_type || '',
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : '',
      emi_duedate: payment.emi_duedate ? new Date(payment.emi_duedate).toISOString().split('T')[0] : '',
      receipt: payment.receipt || '',
      is_full_payment: payment.is_full_payment || false,
      status: statusValue,
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const amount = normalizeAmount(editFormData.amount);
    if (!amount || amount <= 0) {
      toast.error('Valid amount required');
      return;
    }
    try {
      setIsEditSubmitting(true);
      const isPaid = editFormData.status === 'paid';
      let statusValue = editFormData.status;
      if (statusValue !== 'paid' && statusValue !== 'pending' && statusValue !== 'failed') {
        statusValue = 'pending';
      }

      const res = await fetch(`${PAYMENT_API_BASE_URL}/${editingPaymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          emi_discount: normalizeAmount(editFormData.emi_discount) || 0,
          emi_type: editFormData.is_full_payment ? null : editFormData.emi_type || null,
          payment_date: editFormData.payment_date ? new Date(editFormData.payment_date).toISOString() : undefined,
          emi_duedate: editFormData.is_full_payment ? null : editFormData.emi_duedate || undefined,
          receipt: editFormData.receipt || null,
          is_full_payment: editFormData.is_full_payment,
          is_paid: isPaid,
          status: statusValue,
        }),
      });
      const result = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiErrorMessage(result, 'Update failed'));
      toast.success('Payment updated');
      setEditingPaymentId(null);
      fetchPayments(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Filter logic
  const filteredPayments = payments.filter((p) => {
    // Payment status filter
    if (filterStatus !== 'all') {
      const isPaid = p.is_paid === true || p.status === 'paid';
      if (filterStatus === 'paid' && !isPaid) return false;
      if (filterStatus === 'unpaid' && isPaid) return false;
      if (filterStatus === 'pending' && (isPaid || p.status !== 'pending')) return false;
    }

    // Date range filter
    if (filterStartDate || filterEndDate) {
      const paymentDate = p.payment_date ? new Date(p.payment_date) : null;
      if (paymentDate) {
        if (filterStartDate && new Date(filterStartDate) > paymentDate) return false;
        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          if (end < paymentDate) return false;
        }
      } else {
        return false;
      }
    }

    // EMI status filter
    if (filterEmiStatus !== 'all') {
      const isPaid = p.is_paid === true || p.status === 'paid';
      if (p.is_full_payment || isPaid) return false;
      const dueDate = p.emi_duedate ? new Date(p.emi_duedate) : null;
      if (!dueDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (filterEmiStatus === 'overdue' && dueDate >= today) return false;
      if (filterEmiStatus === 'upcoming' && dueDate < today) return false;
    }

    // Search term
    const search = searchTerm.toLowerCase();
    return [
      p.student_id?.name,
      p.student_id?.enrollment_Id,
      p.txn_id,
      p.receipt,
      p.status,
      String(p.amount),
    ].some((val) => String(val || '').toLowerCase().includes(search));
  });

  const totalCollected = payments.reduce(
    (sum, p) => sum + ((p.is_paid || p.status === 'paid') ? Number(p.amount) || 0 : 0),
    0
  );
  const pendingAmount = payments.reduce(
    (sum, p) => sum + ((!p.is_paid && p.status !== 'paid') ? Number(p.amount) || 0 : 0),
    0
  );
  const studentsWithPayments = new Set(payments.map((p) => p.student_id?._id).filter(Boolean)).size;

  const clearDateFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const emiSchedule =
    selectedPayment && !selectedPayment.is_full_payment && selectedPayment.emi_duedate && selectedPayment.emi_type
      ? generateEmiSchedule(
          new Date(selectedPayment.payment_date),
          selectedPayment.emi_type,
          selectedPayment.total_emis || 4
        )
      : [];
  const selectedStudent = selectedPayment?.student_id || {};
  const selectedReceiptNumber = getReceiptNumber(selectedPayment);
  const selectedNetAmount = getNetAmount(selectedPayment);
  const selectedStatusLabel = getReceiptStatusLabel(selectedPayment);
  const selectedPaymentPlan = getPaymentPlanLabel(selectedPayment);
  const selectedCourse = getCourseLabel(selectedStudent);
  const selectedBatch = getBatchLabel(selectedStudent);
  const selectedAddress = getStudentAddress(selectedStudent);

  return (
    <div className="min-h-screen pb-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header – No Create Payment button */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 shadow-sm">
              <FaBuilding className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">TIPS GALWAR</h1>
              <p className="text-sm text-gray-500">Payment Management Desk</p>
            </div>
          </div>
          <button
            onClick={() => fetchPayments(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            <FaSyncAlt className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Collected', value: formatCurrency(totalCollected), icon: FaWallet, iconClassName: 'bg-emerald-50 text-emerald-600' },
            { label: 'Pending Amount', value: formatCurrency(pendingAmount), icon: FaChartLine, iconClassName: 'bg-amber-50 text-amber-600' },
            { label: 'Transactions', value: payments.length, icon: FaCreditCard, iconClassName: 'bg-indigo-50 text-indigo-600' },
            { label: 'Students Paid', value: studentsWithPayments, icon: FaUserGraduate, iconClassName: 'bg-blue-50 text-blue-600' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.iconClassName}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
              className="mb-8 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
            >
              <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_34%),linear-gradient(135deg,_#0f4cc9_0%,_#0f766e_100%)] px-6 py-6 text-white sm:px-8">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_40%,transparent_100%)]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-50">
                      <FaReceipt className="text-[10px]" />
                      Official Receipt Preview
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-lg backdrop-blur-sm">
                        <FaBuilding className="text-2xl" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-[0.08em]">TIPS GALWAR</h2>
                        <p className="mt-1 text-sm text-blue-50/90">Institute of Technical & Professional Studies</p>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50/85">
                          Student payment acknowledgment formatted for professional PDF export and office record use.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-3xl border border-white/15 bg-white/12 p-5 shadow-lg backdrop-blur-sm sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-100/90">Net Amount Received</p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-white">{formatCurrency(selectedNetAmount)}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-blue-50/85">
                        <span>Receipt No. {selectedReceiptNumber}</span>
                        <span>{formatDate(selectedPayment.created_at || selectedPayment.payment_date)}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/90">Status</p>
                      <p className="mt-2 text-lg font-bold text-white">{selectedStatusLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/90">Payment Plan</p>
                      <p className="mt-2 text-lg font-bold text-white">{selectedPaymentPlan}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_22%,_#ffffff_100%)] p-6 sm:p-8">
                <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Received With Thanks From</p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedStudent.name || 'N/A'}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        This receipt confirms that the payment has been recorded against the student profile and is ready for download in official PDF format.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:min-w-[280px] sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">Recorded On</p>
                        <p className="mt-2 text-sm font-bold text-emerald-950">{formatDate(selectedPayment.payment_date || selectedPayment.created_at, true)}</p>
                      </div>
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">Transaction Ref</p>
                        <p className="mt-2 break-all font-mono text-[13px] font-bold text-slate-900">{selectedPayment.txn_id || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <ReceiptField label="Receipt Number" value={selectedReceiptNumber} mono />
                    <ReceiptField label="Enrollment ID" value={selectedStudent.enrollment_Id || 'N/A'} mono />
                    <ReceiptField label="Payment Status" value={selectedStatusLabel} valueClassName="text-emerald-700" />
                    <ReceiptField label="Student Email" value={selectedStudent.email || 'N/A'} />
                    <ReceiptField label="Course" value={selectedCourse} />
                    <ReceiptField label="Batch" value={selectedBatch} />
                    <ReceiptField label="Contact Number" value={selectedStudent.contact || 'N/A'} />
                    <ReceiptField label="Address" value={selectedAddress} />
                    <ReceiptField
                      label="Installment"
                      value={selectedPayment.is_full_payment ? 'Single payment' : `${selectedPayment.emi_number || 1} of ${selectedPayment.total_emis || 4}`}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                          <FaReceipt className="text-blue-600" /> Payment Breakdown
                        </h3>
                        <span className={getStatusBadge(selectedPayment.status, selectedPayment.is_paid)}>{selectedStatusLabel}</span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Payment Plan</span>
                          <span className="font-semibold text-slate-900">{selectedPaymentPlan}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Gross Amount</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Discount Applied</span>
                          <span className="font-semibold text-emerald-700">- {formatCurrency(selectedPayment.emi_discount || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-dashed border-slate-300 pt-3">
                          <span className="text-slate-700 font-semibold">Net Amount</span>
                          <span className="text-xl font-black tracking-tight text-slate-950">{formatCurrency(selectedNetAmount)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(160deg,_#eff6ff_0%,_#f8fafc_100%)] p-5 shadow-[0_12px_30px_rgba(37,99,235,0.08)]">
                      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <FaFileInvoiceDollar className="text-blue-600" /> Receipt Notes
                      </h3>
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <p>This receipt is prepared for student records and accounts verification.</p>
                        <p>Download the PDF to get the finalized official format with proper spacing and wrapped transaction details.</p>
                        <p className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 font-semibold text-slate-800">
                          Generated reference time: {formatDate(new Date(), true)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {!selectedPayment.is_full_payment && selectedPayment.emi_duedate && (
                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div className="rounded-[24px] border border-indigo-100 bg-[linear-gradient(135deg,_#eef2ff_0%,_#e0f2fe_100%)] p-5 shadow-[0_14px_36px_rgba(79,70,229,0.12)]">
                      <h4 className="flex items-center gap-2 font-semibold text-indigo-700"><FaClock /> Next Payment Due</h4>
                      <p className="mt-3 text-3xl font-black tracking-tight text-indigo-950">{formatDate(selectedPayment.emi_duedate)}</p>
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-indigo-700">
                          EMI {(selectedPayment.emi_number || 1) + 1} of {selectedPayment.total_emis || 4}
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-indigo-700">
                          Due {formatCurrency(selectedPayment.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                      <h4 className="flex items-center gap-2 font-semibold text-slate-800"><FaListUl /> Upcoming EMI Schedule</h4>
                      <div className="mt-3 space-y-2 text-sm max-h-52 overflow-y-auto pr-1">
                        {emiSchedule.length > 0 ? (
                          emiSchedule.map((date, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                              <span className="font-semibold text-slate-500">EMI #{idx + 2}</span>
                              <span className="text-slate-700">{formatDate(date)}</span>
                              <span className="font-bold text-slate-900">{formatCurrency(selectedPayment.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500">No upcoming EMI schedule</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <button
                    onClick={() => downloadReceipt(selectedPayment)}
                    className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
                  >
                    Download Receipt (PDF)
                  </button>
                  <button
                    onClick={() => handleEditPayment(selectedPayment)}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Edit Payment
                  </button>
                  <button
                    onClick={() => handleDeletePayment(selectedPayment._id)}
                    className="flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
                  >
                    Delete Payment
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Records Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payment Records</h2>
                <p className="text-sm text-gray-500">Click any row to view full receipt & details</p>
              </div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, receipt, transaction..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-64"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-gray-100 pt-4">
              <div className="min-w-[130px]">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <FaFilter className="text-xs" /> Payment Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid (All non-paid)</option>
                  <option value="pending">Pending (exact)</option>
                </select>
              </div>
              <div className="min-w-[130px]">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <FaCalendarAlt /> EMI Status
                </label>
                <select
                  value={filterEmiStatus}
                  onChange={(e) => setFilterEmiStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                >
                  <option value="all">All EMIs</option>
                  <option value="overdue">Overdue (Past Due Date)</option>
                  <option value="upcoming">Upcoming (Future Due Date)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <FaCalendarAlt /> From Date
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <FaCalendarAlt /> To Date
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={clearDateFilters}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200 transition"
                >
                  <FaTimes /> Clear Dates
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Payment Ref</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">Loading payments...</td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">No payments found.</td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <Fragment key={payment._id}>
                      <tr
                        className={`cursor-pointer transition hover:bg-indigo-50/20 ${
                          expandedRowId === payment._id ? 'bg-indigo-50/40' : ''
                        }`}
                        onClick={() => toggleRowExpansion(payment._id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`transition-transform ${expandedRowId === payment._id ? 'rotate-90' : ''}`}>
                              <FaChevronRight className="text-xs text-gray-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{payment.student_id?.name || 'Unknown'}</p>
                              <p className="text-[11px] text-gray-500">Enroll: {payment.student_id?.enrollment_Id || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>Txn: {payment.txn_id || '—'}</div>
                          <div className="text-gray-400">Receipt: {payment.receipt || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                          <p className="text-[11px] text-gray-500">Discount: {formatCurrency(payment.emi_discount)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
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
                          <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => downloadReceipt(payment)}
                              className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition hover:bg-blue-100"
                              title="Download Receipt"
                            >
                              <FaFileInvoiceDollar size={14} />
                            </button>
                            <button
                              onClick={() => handleEditPayment(payment)}
                              className="rounded-lg bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200"
                              title="Edit"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment._id)}
                              className="p-1.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingPaymentId && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-gray-100 bg-white shadow-xl"
              >
                <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
                  <h3 className="text-lg font-bold">Edit Payment</h3>
                  <button
                    onClick={() => setEditingPaymentId(null)}
                    className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <input
                      type="checkbox"
                      id="edit_full_payment"
                      name="is_full_payment"
                      checked={editFormData.is_full_payment}
                      onChange={handleEditInputChange}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="edit_full_payment" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      On‑the‑spot Full Payment (No EMI)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Amount</label>
                      <input
                        type="number"
                        name="amount"
                        value={editFormData.amount}
                        onChange={handleEditInputChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-500">EMI Discount</label>
                      <input
                        type="number"
                        name="emi_discount"
                        value={editFormData.emi_discount}
                        onChange={handleEditInputChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                    {!editFormData.is_full_payment && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-gray-500">EMI Type</label>
                          <select
                            name="emi_type"
                            value={editFormData.emi_type}
                            onChange={handleEditInputChange}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          >
                            <option value="">None</option>
                            <option>monthly</option>
                            <option>quarterly</option>
                            <option>semester</option>
                            <option>yearly</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Due Date</label>
                          <input
                            type="date"
                            name="emi_duedate"
                            value={editFormData.emi_duedate}
                            onChange={handleEditInputChange}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Payment Date</label>
                      <input
                        type="date"
                        name="payment_date"
                        value={editFormData.payment_date}
                        onChange={handleEditInputChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Receipt</label>
                      <input
                        type="text"
                        name="receipt"
                        value={editFormData.receipt}
                        onChange={handleEditInputChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Payment Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingPaymentId(null)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEditSubmitting}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm text-white transition hover:bg-blue-700"
                    >
                      {isEditSubmitting ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Update'
                      )}
                    </button>
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
