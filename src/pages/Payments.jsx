import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaCalendarAlt, FaCheckCircle, FaChevronRight, FaCreditCard,
  FaEdit, FaFileInvoiceDollar, FaMoneyBillWave, FaPlus, FaReceipt, FaRupeeSign,
  FaSearch, FaSyncAlt, FaTimes, FaTrash, FaUserGraduate, FaWallet, FaChartLine,
  FaIdCard, FaUniversity, FaClock, FaBuilding, FaListUl, FaCheckDouble
} from 'react-icons/fa';
import { useToast } from '../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';   // ✅ Correct import

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

const getStudentDefaultPaymentDetails = (student) => {
  const courseFee = Number(student?.course_Id?.course_Price);
  const discountedFee = Number(student?.course_Id?.discount_Price);
  const finalFee = Number.isFinite(discountedFee) && discountedFee > 0
    ? discountedFee
    : (Number.isFinite(courseFee) ? courseFee : '');

  return {
    courseFee,
    discountedFee,
    finalFee,
    emiType: typeof student?.emi === 'string' ? student.emi.toLowerCase() : ''
  };
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

const EMI_TYPE_MAPPING = {
  'monthly': 12,
  'quarterly': 4,
  'semester': 2,
  'yearly': 1
};

// ---------- Client-side receipt generator (fixed autoTable) ----------
const generateReceiptPDF = (payment) => {
  const doc = new jsPDF();
  const student = payment.student_id || {};
  const course = student.course_Id || {};

  const statusText = payment.is_paid ? 'PAID' : (payment.status || 'PENDING');
  const statusColor = payment.is_paid ? [34, 197, 94] : (payment.status === 'failed' ? [239, 68, 68] : [245, 158, 11]);

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('TIPS GALWAR', 14, 22);
  doc.setFontSize(9);
  doc.text('Institute of Technical & Professional Studies', 14, 32);
  doc.setTextColor(0, 0, 0);

  // Receipt title & number
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text('PAYMENT RECEIPT', 14, 55);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${payment.receipt || payment._id?.slice(-8) || 'N/A'}`, 14, 63);
  doc.text(`Date: ${formatDate(payment.created_at || payment.payment_date)}`, 14, 70);

  // Status badge
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(150, 55, 45, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(statusText, 172.5, 62, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Student Information
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Student Information', 14, 85);
  doc.line(14, 88, 196, 88);

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Name: ${student.name || 'N/A'}`, 14, 96);
  doc.text(`Enrollment ID: ${student.enrollment_Id || 'N/A'}`, 14, 103);
  doc.text(`Email: ${student.email || 'N/A'}`, 14, 110);
  doc.text(`Contact: ${student.contact || 'N/A'}`, 14, 117);
  doc.text(`Course: ${course.course_Name || 'N/A'}`, 14, 124);
  doc.text(`Batch: ${student.batch_Id?.batch_Name || 'N/A'}`, 14, 131);

  // Payment Summary
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Summary', 14, 145);
  doc.line(14, 148, 196, 148);

  const tableData = [];
  tableData.push(['EMI Type:', payment.emi_type || (payment.is_full_payment ? 'Full Payment' : 'N/A')]);
  if (!payment.is_full_payment) {
    tableData.push(['EMI Number:', `${payment.emi_number || 1} of ${payment.total_emis || 4}`]);
    tableData.push(['Amount Paid:', formatCurrency(payment.amount)]);
    tableData.push(['EMI Discount:', `- ${formatCurrency(payment.emi_discount || 0)}`]);
    tableData.push(['Net Amount:', formatCurrency((payment.amount || 0) - (payment.emi_discount || 0))]);
  } else {
    tableData.push(['Full Payment Amount:', formatCurrency(payment.amount)]);
  }
  tableData.push(['Transaction ID:', payment.txn_id || payment.razorpay_payment_id || 'N/A']);
  tableData.push(['Payment Date:', formatDate(payment.payment_date)]);

  autoTable(doc, {
    startY: 152,
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [80, 80, 80] }, 1: { textColor: [0, 0, 0] } },
    margin: { left: 14, right: 14 }
  });

  let finalY = doc.lastAutoTable.finalY + 8;

  // EMI Schedule if applicable
  if (!payment.is_full_payment && payment.emi_duedate && payment.emi_type) {
    const totalEmis = payment.total_emis || 4;
    const emiAmount = ((payment.amount || 0) - (payment.emi_discount || 0)) / totalEmis;
    const dueDates = generateEmiSchedule(new Date(payment.payment_date), payment.emi_type, totalEmis);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Upcoming EMI Schedule', 14, finalY);
    doc.line(14, finalY + 3, 196, finalY + 3);

    const scheduleData = dueDates.map((date, idx) => [
      idx + 1,
      formatDate(date),
      formatCurrency(emiAmount)
    ]);

    autoTable(doc, {
      startY: finalY + 7,
      head: [['EMI No.', 'Due Date', 'Amount']],
      body: scheduleData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });
    finalY = doc.lastAutoTable.finalY + 8;
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated receipt and does not require a signature.', 14, finalY);
  doc.text('Thank you for your payment.', 14, finalY + 5);

  doc.save(`Receipt_${student.enrollment_Id || payment._id}.pdf`);
};

// ---------- EMI Schedule PDF generator (fixed autoTable) ----------
const downloadEmiSchedulePDF = (selectedStudent, formData, totalEmis, toast) => {
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

  autoTable(doc, {
    startY: 82,
    head: [['EMI No.', 'Due Date', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11] }
  });
  doc.save(`EMI_Schedule_${student?.enrollment_Id || 'student'}.pdf`);
  toast.success('EMI schedule downloaded');
};

// ---------- Main Payments Component ----------
const Payments = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormState);
  const [totalEmis, setTotalEmis] = useState(4);
  const [isEmiTypeSelected, setIsEmiTypeSelected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isOnlineSubmitting, setIsOnlineSubmitting] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
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
    status: 'paid'
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedPayment = expandedRowId ? payments.find(p => p._id === expandedRowId) : null;
  const selectedStudent = students.find(s => s._id === formData.student_id);
  const selectedCourse = selectedStudent?.course_Id;
  const {
    courseFee: selectedCourseFee,
    finalFee: selectedPayableFee,
    emiType: selectedStudentEmiType
  } = getStudentDefaultPaymentDetails(selectedStudent);
  const selectedCourseDiscount = Number.isFinite(selectedCourseFee) && Number.isFinite(selectedPayableFee) && selectedCourseFee > selectedPayableFee
    ? selectedCourseFee - selectedPayableFee
    : 0;

  const toggleRowExpansion = (id) => setExpandedRowId(prev => prev === id ? null : id);
  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData(initialFormState);
    setTotalEmis(4);
    setIsEmiTypeSelected(false);
    setPaymentMethod(null);
  };

  const handleStudentChange = (studentId) => {
    if (!studentId) {
      setFormData(prev => ({
        ...prev,
        student_id: '',
        amount: '',
        emi_discount: '0',
        emi_type: '',
        emi_duedate: ''
      }));
      setTotalEmis(4);
      setIsEmiTypeSelected(false);
      setPaymentMethod(null);
      return;
    }

    const student = students.find(s => s._id === studentId);
    const { finalFee, emiType } = getStudentDefaultPaymentDetails(student);

    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      amount: finalFee === '' ? '' : String(finalFee),
      emi_discount: '0',
      emi_type: prev.is_full_payment ? '' : emiType,
      emi_duedate: ''
    }));
    setTotalEmis(0);
    setIsEmiTypeSelected(false);
    setPaymentMethod(null);
  };

  const handleEmiTypeChange = (emiType) => {
    if (!emiType) {
      setTotalEmis(0);
    } else {
      const numEmis = EMI_TYPE_MAPPING[emiType] || 4;
      setTotalEmis(numEmis);
    }
    setFormData(prev => ({
      ...prev,
      emi_type: emiType
    }));
    setIsEmiTypeSelected(!!emiType);
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

  useEffect(() => {
    if (studentsLoading || !location.state?.openCreateModal) return;

    setShowCreateModal(true);

    const preselectedStudentId = location.state.preselectedStudentId;
    if (preselectedStudentId && students.some(student => student._id === preselectedStudentId)) {
      handleStudentChange(preselectedStudentId);
    }

    navigate('/payments', { replace: true, state: {} });
  }, [location.state, navigate, students, studentsLoading]);

  const downloadReceipt = (payment) => {
    if (!payment) return;
    generateReceiptPDF(payment);
    toast.success('Receipt generated');
  };

  const validatePaymentForm = () => {
    if (!formData.student_id) { toast.error('Select a student'); return null; }
    const amount = normalizeAmount(formData.amount);
    if (!amount || amount <= 0) { toast.error('Valid amount required'); return null; }
    const discount = normalizeAmount(formData.emi_discount || 0);
    if (isNaN(discount) || discount < 0) { toast.error('Discount must be ≥ 0'); return null; }
    return { amount, emiDiscount: discount };
  };

  const handleOnlinePayment = async () => {
    const valid = validatePaymentForm();
    if (!valid) return;
    if (!window.Razorpay) { toast.error('Razorpay not loaded'); return; }

    if (!formData.is_full_payment && (!totalEmis || totalEmis <= 0)) {
      toast.error('Please select EMI Type first');
      return;
    }

    let amountToPay = valid.amount;
    let discountPerEmi = valid.emiDiscount;

    if (!formData.is_full_payment) {
      const netTotal = valid.amount - valid.emiDiscount;
      amountToPay = netTotal / totalEmis;
      discountPerEmi = valid.emiDiscount / totalEmis;
    }

    try {
      setIsOnlineSubmitting(true);
      const payload = {
        student_id: formData.student_id,
        amount: amountToPay,
        emi_discount: discountPerEmi,
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
            setIsEmiTypeSelected(false);
            setPaymentMethod(null);
            closeCreateModal();
            fetchPayments(false);
          } catch (err) { toast.error(err.message); }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
      setPaymentMethod(null);
    }
    finally { setIsOnlineSubmitting(false); }
  };

  const handleManualPayment = async () => {
    const valid = validatePaymentForm();
    if (!valid) return;

    if (!formData.is_full_payment && (!totalEmis || totalEmis <= 0)) {
      toast.error('Please select EMI Type first');
      return;
    }

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
        amount: amountToPay,
        is_paid: true,
        emi_discount: discountPerEmi,
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
      setIsEmiTypeSelected(false);
      setPaymentMethod(null);
      closeCreateModal();
      fetchPayments(false);
    } catch (err) {
      toast.error(err.message);
      setPaymentMethod(null);
    }
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
      is_full_payment: payment.is_full_payment || false,
      status: payment.is_paid ? 'paid' : (payment.status || 'pending')
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
      const isPaid = editFormData.status === 'paid';
      const statusValue = editFormData.status;

      const res = await fetch(`${PAYMENT_API_BASE_URL}/${editingPaymentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          emi_discount: normalizeAmount(editFormData.emi_discount) || 0,
          emi_type: editFormData.is_full_payment ? null : (editFormData.emi_type || null),
          payment_date: editFormData.payment_date ? new Date(editFormData.payment_date).toISOString() : undefined,
          emi_duedate: editFormData.is_full_payment ? null : (editFormData.emi_duedate || undefined),
          receipt: editFormData.receipt || null,
          is_full_payment: editFormData.is_full_payment,
          is_paid: isPaid,
          status: statusValue
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

  const emiSchedule = selectedPayment && !selectedPayment.is_full_payment && selectedPayment.emi_duedate && selectedPayment.emi_type
    ? generateEmiSchedule(new Date(selectedPayment.payment_date), selectedPayment.emi_type, selectedPayment.total_emis || 4)
    : [];

  return (
    <div className="min-h-screen pb-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
          <div className="flex gap-3">
            <button onClick={() => fetchPayments(false)} disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60">
              <FaSyncAlt className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
              <FaPlus className="h-3.5 w-3.5" /> Create Payment
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Collected', value: formatCurrency(totalCollected), icon: FaWallet, iconClassName: 'bg-emerald-50 text-emerald-600' },
            { label: 'Pending Amount', value: formatCurrency(pendingAmount), icon: FaChartLine, iconClassName: 'bg-amber-50 text-amber-600' },
            { label: 'Transactions', value: payments.length, icon: FaCreditCard, iconClassName: 'bg-indigo-50 text-indigo-600' },
            { label: 'Students Paid', value: studentsWithPayments, icon: FaUserGraduate, iconClassName: 'bg-blue-50 text-blue-600' }
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
              className="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FaBuilding className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">TIPS GALWAR</h2>
                    <p className="text-xs text-blue-100">Institute of Technical & Professional Studies</p>
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
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900"><FaUserGraduate className="text-blue-600" /> Student Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{selectedPayment.student_id?.name || 'N/A'}</span></div>
                      <div><span className="text-gray-500">Enrollment ID:</span> <span className="font-medium text-gray-900">{selectedPayment.student_id?.enrollment_Id || 'N/A'}</span></div>
                      <div><span className="text-gray-500">Email:</span> <span className="font-medium break-all text-gray-900">{selectedPayment.student_id?.email || 'N/A'}</span></div>
                      <div><span className="text-gray-500">Contact:</span> <span className="font-medium text-gray-900">{selectedPayment.student_id?.contact || 'N/A'}</span></div>
                      <div><span className="text-gray-500">Course:</span> <span className="font-medium text-gray-900">{selectedPayment.student_id?.course_Id?.course_Name || 'N/A'}</span></div>
                      <div><span className="text-gray-500">Batch:</span> <span className="font-medium text-gray-900">{selectedPayment.student_id?.batch_Id?.batch_Name || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 border-b border-gray-100 pb-2 font-bold text-gray-900"><FaReceipt className="text-blue-600" /> Payment Summary</h3>
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">EMI Type:</span> <span className="font-medium text-gray-900">{selectedPayment.emi_type || (selectedPayment.is_full_payment ? 'Full Payment' : 'N/A')}</span></div>
                      {!selectedPayment.is_full_payment && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-500">EMI Number:</span> <span className="font-medium text-gray-900">{selectedPayment.emi_number || 1} of {selectedPayment.total_emis || 4}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Amount Paid:</span> <span className="font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">EMI Discount:</span> <span className="text-emerald-700">- {formatCurrency(selectedPayment.emi_discount)}</span></div>
                          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold text-gray-700">Net Amount:</span> <span className="text-lg font-bold text-gray-900">{formatCurrency((selectedPayment.amount || 0) - (selectedPayment.emi_discount || 0))}</span></div>
                        </>
                      )}
                      {selectedPayment.is_full_payment && (
                        <div className="flex justify-between"><span className="font-semibold text-gray-700">Full Payment Amount:</span> <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span> <span className="font-medium break-all text-gray-900">{selectedPayment.txn_id || selectedPayment.razorpay_payment_id || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status:</span> <span className={getStatusBadge(selectedPayment.status, selectedPayment.is_paid)}>{selectedPayment.is_paid ? 'Paid' : selectedPayment.status}</span></div>
                    </div>
                  </div>
                </div>
                {!selectedPayment.is_full_payment && selectedPayment.emi_duedate && (
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                      <h4 className="flex items-center gap-2 font-semibold text-indigo-700"><FaClock /> Next Payment Due</h4>
                      <p className="mt-2 text-2xl font-bold text-indigo-900">{formatDate(selectedPayment.emi_duedate)}</p>
                      <p className="text-sm text-indigo-600">EMI Number: {(selectedPayment.emi_number || 1) + 1} of {selectedPayment.total_emis || 4}</p>
                      <p className="text-sm text-indigo-600">Amount Due: {formatCurrency(selectedPayment.amount)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
                      <h4 className="flex items-center gap-2 font-semibold text-gray-800"><FaListUl /> Upcoming EMI Schedule</h4>
                      <div className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                        {emiSchedule.length > 0 ? emiSchedule.map((date, idx) => (
                          <div key={idx} className="flex justify-between border-b border-gray-200 py-1">
                            <span className="text-gray-500">EMI #{idx + 2}</span>
                            <span className="text-gray-700">{formatDate(date)}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(selectedPayment.amount)}</span>
                          </div>
                        )) : <p className="text-gray-500">No upcoming EMI schedule</p>}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                  <button onClick={() => downloadReceipt(selectedPayment)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">Download Receipt (PDF)</button>
                  <button onClick={() => handleEditPayment(selectedPayment)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">Edit Payment</button>
                  <button onClick={() => handleDeletePayment(selectedPayment._id)} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600">Delete Payment</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Records Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payment Records</h2>
              <p className="text-sm text-gray-500">Click any row to view full receipt & details</p>
            </div>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name, receipt, transaction..." className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-64" />
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
                  Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Loading payments...</td></tr>)
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400">No payments found. Create one using the button above.</td></tr>
                ) : (
                  filteredPayments.map(payment => (
                    <React.Fragment key={payment._id}>
                      <tr
                        className={`cursor-pointer transition hover:bg-indigo-50/20 ${expandedRowId === payment._id ? 'bg-indigo-50/40' : ''}`}
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
                          <div>Txn: {payment.txn_id || payment.razorpay_payment_id || '—'}</div>
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
                          <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => downloadReceipt(payment)} className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition hover:bg-blue-100" title="Download Receipt"><FaFileInvoiceDollar size={14} /></button>
                            <button onClick={() => handleEditPayment(payment)} className="rounded-lg bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200" title="Edit"><FaEdit size={14} /></button>
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
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
                  <div>
                    <h3 className="text-lg font-bold">Create Payment</h3>
                    <p className="text-xs text-gray-500">Online or manual entry</p>
                  </div>
                  <button onClick={closeCreateModal} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"><FaTimes /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Student</label>
                    <select name="student_id" value={formData.student_id} onChange={e => handleStudentChange(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                      <option value="">{studentsLoading ? 'Loading...' : 'Select student'}</option>
                      {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.enrollment_Id})</option>)}
                    </select>
                  </div>

                  {selectedStudent && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-gray-700">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
                          <p className="text-xs text-gray-500">{selectedStudent.enrollment_Id || 'N/A'}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                          {formData.is_full_payment ? 'Full Payment' : `EMI: ${selectedStudent.emi || 'N/A'}`}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Course</p>
                          <p className="mt-1 font-semibold text-gray-900">{selectedCourse?.course_Name || 'N/A'}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Course Fee</p>
                          <p className="mt-1 font-semibold text-gray-900">{Number.isFinite(selectedCourseFee) ? formatCurrency(selectedCourseFee) : 'N/A'}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Payable Fee</p>
                          <p className="mt-1 font-semibold text-emerald-700">{Number.isFinite(selectedPayableFee) ? formatCurrency(selectedPayableFee) : 'N/A'}</p>
                        </div>
                      </div>
                      {selectedCourseDiscount > 0 && (
                        <p className="mt-3 text-xs font-medium text-emerald-700">
                          Included course discount: {formatCurrency(selectedCourseDiscount)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <input type="checkbox" id="full_payment" checked={formData.is_full_payment}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          is_full_payment: checked,
                          emi_type: checked ? '' : selectedStudentEmiType,
                          emi_duedate: ''
                        }));
                        if (checked) setTotalEmis(0);
                        else setTotalEmis(4);
                        setIsEmiTypeSelected(false);
                        setPaymentMethod(null);
                      }}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="full_payment" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FaCheckDouble className="text-indigo-600" /> On‑the‑spot Full Payment (No EMI)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Total Amount (₹)</label>
                      <div className="relative"><FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                        <input type="number" name="amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="0.00" /></div></div>
                    <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Total Discount (₹)</label>
                      <input type="number" name="emi_discount" value={formData.emi_discount} onChange={e => setFormData({ ...formData, emi_discount: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="0" /></div>
                    
                    {!formData.is_full_payment && (
                      <>
                        <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">EMI Type</label>
                          <select name="emi_type" value={formData.emi_type} onChange={e => handleEmiTypeChange(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60">
                            <option value="">None</option><option>monthly</option><option>quarterly</option><option>semester</option><option>yearly</option>
                          </select></div>
                        <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">First EMI Due Date</label>
                          <input type="date" name="emi_duedate" value={formData.emi_duedate} onChange={e => setFormData({ ...formData, emi_duedate: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                        <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Number of EMIs</label>
                          <input type="number" min="1" max="24" value={totalEmis} onChange={e => setTotalEmis(Number(e.target.value))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                        {formData.amount && formData.emi_discount !== undefined && totalEmis > 0 && (
                          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm sm:col-span-2">
                            <span className="font-semibold">Per EMI Amount:</span>{' '}
                            {formatCurrency((Number(formData.amount || 0) - Number(formData.emi_discount || 0)) / totalEmis)}
                          </div>
                        )}
                      </>
                    )}
                    <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Payment Date</label>
                      <input type="date" name="payment_date" value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                    {paymentMethod === 'manual' && (
                      <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Receipt ID</label>
                        <input type="text" name="receipt" value={formData.receipt} onChange={e => setFormData({ ...formData, receipt: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="Enter receipt ID" /></div>
                    )}
                    {paymentMethod === 'online' && (
                      <div className="sm:col-span-2"><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Transaction ID (for online payments)</label>
                        <input type="text" name="txn_id" value={formData.txn_id} onChange={e => setFormData({ ...formData, txn_id: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="Transaction ID (auto-filled after payment)" disabled /></div>
                    )}
                  </div>

                  {!formData.is_full_payment && formData.emi_type && formData.emi_duedate && (
                    <button type="button" onClick={() => downloadEmiSchedulePDF(selectedStudent, formData, totalEmis, toast)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100">
                      <FaFileInvoiceDollar /> Download EMI Payment Schedule (PDF)
                    </button>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setPaymentMethod('online'); handleOnlinePayment(); }} disabled={isOnlineSubmitting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
                      {isOnlineSubmitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaCreditCard /> Pay Online</>}
                    </button>
                    <button onClick={() => { setPaymentMethod('manual'); handleManualPayment(); }} disabled={isManualSubmitting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700">
                      {isManualSubmitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaCheckCircle /> Manual Entry</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Modal with Status Selector */}
        <AnimatePresence>
          {editingPaymentId && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
                  <h3 className="text-lg font-bold">Edit Payment</h3>
                  <button onClick={() => setEditingPaymentId(null)} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"><FaTimes /></button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <input type="checkbox" id="edit_full_payment" name="is_full_payment" checked={editFormData.is_full_payment} onChange={handleEditInputChange} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="edit_full_payment" className="flex items-center gap-2 text-sm font-medium text-gray-700"><FaCheckDouble className="text-indigo-600" /> On‑the‑spot Full Payment (No EMI)</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-xs font-bold uppercase text-gray-500">Amount</label><input type="number" name="amount" value={editFormData.amount} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" required /></div>
                    <div><label className="mb-1 block text-xs font-bold uppercase text-gray-500">EMI Discount</label><input type="number" name="emi_discount" value={editFormData.emi_discount} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                    {!editFormData.is_full_payment && (
                      <>
                        <div><label className="mb-1 block text-xs font-bold uppercase text-gray-500">EMI Type</label><select name="emi_type" value={editFormData.emi_type} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"><option value="">None</option><option>monthly</option><option>quarterly</option><option>semester</option><option>yearly</option></select></div>
                        <div><label className="mb-1 block text-xs font-bold uppercase text-gray-500">Due Date</label><input type="date" name="emi_duedate" value={editFormData.emi_duedate} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                      </>
                    )}
                    <div><label className="mb-1 block text-xs font-bold uppercase text-gray-500">Payment Date</label><input type="date" name="payment_date" value={editFormData.payment_date} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                    <div><label className="mb-1 block text-xs font-bold uppercase text-gray-500">Receipt</label><input type="text" name="receipt" value={editFormData.receipt} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                  </div>

                  {/* Status Selector */}
                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Payment Status</label>
                    <select name="status" value={editFormData.status} onChange={handleEditInputChange} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingPaymentId(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={isEditSubmitting} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm text-white transition hover:bg-blue-700">{isEditSubmitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update'}</button>
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