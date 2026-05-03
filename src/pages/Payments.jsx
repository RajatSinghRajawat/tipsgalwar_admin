import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaPlus,
  FaReceipt,
  FaRupeeSign,
  FaSearch,
  FaSyncAlt,
  FaUserGraduate
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const PAYMENT_API_BASE_URL = 'http://localhost:3005/apis/payment';
const STUDENT_API_BASE_URL = 'http://localhost:3005/apis/student';

const initialFormState = {
  student_id: '',
  amount: '',
  emi_discount: '0',
  payment_date: '',
  emi_duedate: '',
  receipt: '',
  txn_id: ''
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value, includeTime = false) => {
  if (!value) {
    return 'N/A';
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      'en-IN',
      includeTime
        ? {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }
        : {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
    );
  } catch (error) {
    return value;
  }
};

const normalizeAmount = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
};

const getStatusClasses = (status, isPaid) => {
  if (isPaid || status === 'paid') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  if (status === 'failed') {
    return 'bg-rose-50 text-rose-700 border-rose-100';
  }

  return 'bg-amber-50 text-amber-700 border-amber-100';
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
  const [isOnlineSubmitting, setIsOnlineSubmitting] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  const selectedStudent = students.find((student) => student._id === formData.student_id);

  const fetchPayments = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await fetch(PAYMENT_API_BASE_URL);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not load payments.');
      }

      setPayments(result.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Could not load payment records.');
    } finally {
      if (showLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const response = await fetch(`${STUDENT_API_BASE_URL}/get`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not load students.');
      }

      setStudents(result.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Could not load students for payment form.');
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    const loadPageData = async () => {
      await Promise.all([fetchPayments(), fetchStudents()]);
    };

    loadPageData();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previousData) => ({
      ...previousData,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const validatePaymentForm = () => {
    if (!formData.student_id) {
      toast.error('Please select a student first.');
      return null;
    }

    const amount = normalizeAmount(formData.amount);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return null;
    }

    const emiDiscount = normalizeAmount(formData.emi_discount || 0);

    if (Number.isNaN(emiDiscount) || emiDiscount < 0) {
      toast.error('EMI discount must be zero or more.');
      return null;
    }

    return {
      amount,
      emiDiscount
    };
  };

  const verifyPaymentOnServer = async (payload) => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.verified) {
      throw new Error(result.message || 'Payment verification failed.');
    }

    return result;
  };

  const handleOnlinePayment = async () => {
    const validatedData = validatePaymentForm();

    if (!validatedData) {
      return;
    }

    if (!window.Razorpay) {
      toast.error('Razorpay checkout script is not loaded.');
      return;
    }

    try {
      setIsOnlineSubmitting(true);

      const response = await fetch(`${PAYMENT_API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: formData.student_id,
          amount: validatedData.amount,
          emi_discount: validatedData.emiDiscount,
          emi_duedate: formData.emi_duedate || null,
          receipt: formData.receipt || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not create payment order.');
      }

      const razorpayKey = result.key || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error('Razorpay key is missing. Add it in backend env or frontend env.');
      }

      const order = result.order;

      const checkout = new window.Razorpay({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'TIPS-G Alwar',
        description: selectedStudent ? `Fee payment for ${selectedStudent.name}` : 'Student payment',
        order_id: order.id,
        prefill: {
          name: selectedStudent?.name || '',
          email: selectedStudent?.email || '',
          contact: selectedStudent?.contact || ''
        },
        notes: {
          student_id: formData.student_id,
          enrollment_id: selectedStudent?.enrollment_Id || '',
          receipt: order.receipt || formData.receipt || ''
        },
        theme: {
          color: '#2563eb'
        },
        handler: async (paymentResponse) => {
          try {
            await verifyPaymentOnServer({
              ...paymentResponse,
              student_id: formData.student_id,
              amount: validatedData.amount,
              emi_discount: validatedData.emiDiscount,
              emi_duedate: formData.emi_duedate || null,
              payment_date: formData.payment_date || new Date().toISOString()
            });

            toast.success('Online payment verified and saved successfully.');
            resetForm();
            fetchPayments(false);
          } catch (error) {
            console.error('Error verifying payment:', error);
            toast.error(error.message || 'Payment completed but verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            fetchPayments(false);
          }
        }
      });

      checkout.on('payment.failed', (failureResponse) => {
        const errorMessage =
          failureResponse?.error?.description || 'Payment failed before verification.';
        toast.error(errorMessage);
      });

      checkout.open();
      toast.info('Razorpay checkout opened. Complete the payment to verify it.');
      fetchPayments(false);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Could not start online payment.');
    } finally {
      setIsOnlineSubmitting(false);
    }
  };

  const handleManualPayment = async () => {
    const validatedData = validatePaymentForm();

    if (!validatedData) {
      return;
    }

    try {
      setIsManualSubmitting(true);

      const response = await fetch(`${PAYMENT_API_BASE_URL}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          txn_id: formData.txn_id || null,
          student_id: formData.student_id,
          amount: validatedData.amount,
          is_paid: true,
          emi_discount: validatedData.emiDiscount,
          payment_date: formData.payment_date || new Date().toISOString(),
          emi_duedate: formData.emi_duedate || null,
          receipt: formData.receipt || null,
          currency: 'INR',
          status: 'paid'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not save manual payment.');
      }

      toast.success('Manual payment saved successfully.');
      resetForm();
      fetchPayments(false);
    } catch (error) {
      console.error('Error saving manual payment:', error);
      toast.error(error.message || 'Could not save manual payment.');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const searchableValues = [
      payment.student_id?.name,
      payment.student_id?.enrollment_Id,
      payment.txn_id,
      payment.razorpay_order_id,
      payment.razorpay_payment_id,
      payment.receipt,
      payment.status,
      payment.currency,
      String(payment.amount || '')
    ];

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())
    );
  });

  const totalCollected = payments.reduce((sum, payment) => {
    if (payment.is_paid || payment.status === 'paid') {
      return sum + (Number(payment.amount) || 0);
    }

    return sum;
  }, 0);

  const pendingAmount = payments.reduce((sum, payment) => {
    if (!payment.is_paid && payment.status !== 'paid') {
      return sum + (Number(payment.amount) || 0);
    }

    return sum;
  }, 0);

  const studentsWithPayments = new Set(
    payments
      .map((payment) =>
        typeof payment.student_id === 'object' ? payment.student_id?._id : payment.student_id
      )
      .filter(Boolean)
  ).size;

  return (
    <div className="min-h-screen overflow-x-hidden pb-12">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payments Desk</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create Razorpay orders, save manual collections, and track student payments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchPayments(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh Payments
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <FaMoneyBillWave className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">Collected</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <FaFileInvoiceDollar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">Pending</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FaCreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{payments.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <FaUserGraduate className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">Students Paid</p>
                <p className="text-xl font-bold text-gray-900">{studentsWithPayments}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Payment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select a student and either open Razorpay checkout or save an offline payment.
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FaPlus className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                  Student
                </label>
                <select
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  disabled={studentsLoading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  <option value="">{studentsLoading ? 'Loading students...' : 'Select student'}</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.enrollment_Id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                    Amount
                  </label>
                  <div className="relative">
                    <FaRupeeSign className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                    EMI Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="emi_discount"
                    value={formData.emi_discount}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                    Payment Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                    EMI Due Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      name="emi_duedate"
                      value={formData.emi_duedate}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                    Receipt
                  </label>
                  <div className="relative">
                    <FaReceipt className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="receipt"
                      value={formData.receipt}
                      onChange={handleInputChange}
                      placeholder="Optional receipt id"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    name="txn_id"
                    value={formData.txn_id}
                    onChange={handleInputChange}
                    placeholder="For manual entries"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {selectedStudent && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                      <FaUserGraduate className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{selectedStudent.name}</p>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        Enrollment: {selectedStudent.enrollment_Id} | Contact: {selectedStudent.contact}
                      </p>
                      <p className="mt-2 text-xs font-medium text-gray-600">
                        Course: {selectedStudent.course_Id?.course_Name || 'N/A'} | Batch:{' '}
                        {selectedStudent.batch_Id?.batch_Name || 'N/A'} | EMI: {selectedStudent.emi || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleOnlinePayment}
                  disabled={isOnlineSubmitting || isManualSubmitting || studentsLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
                >
                  {isOnlineSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FaCreditCard className="h-4 w-4" />
                  )}
                  {isOnlineSubmitting ? 'Opening Checkout...' : 'Pay with Razorpay'}
                </button>

                <button
                  type="button"
                  onClick={handleManualPayment}
                  disabled={isManualSubmitting || isOnlineSubmitting || studentsLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {isManualSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                  ) : (
                    <FaCheckCircle className="h-4 w-4" />
                  )}
                  {isManualSubmitting ? 'Saving Payment...' : 'Save Manual Payment'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payment Records</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Search by student, receipt, status, order id, payment id, or amount.
                </p>
              </div>

              <div className="relative w-full max-w-sm">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search payments..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-[2px] text-gray-500">Student</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-[2px] text-gray-500">Payment</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-[2px] text-gray-500">Amount</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-[2px] text-gray-500">Schedule</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-[2px] text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td colSpan="5" className="px-5 py-6">
                            <div className="h-10 rounded-xl bg-gray-100" />
                          </td>
                        </tr>
                      ))
                    ) : filteredPayments.length > 0 ? (
                      filteredPayments.map((payment) => (
                        <tr key={payment._id} className="transition-all hover:bg-blue-50/20">
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-bold text-gray-900">{payment.student_id?.name || 'Unknown student'}</p>
                              <p className="text-xs font-medium text-gray-500">
                                Enrollment: {payment.student_id?.enrollment_Id || 'N/A'}
                              </p>
                              <p className="text-xs font-medium text-gray-400">
                                {payment.student_id?.contact || payment.student_id?.email || 'No contact'}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-700">
                                Txn: {payment.txn_id || payment.razorpay_payment_id || 'N/A'}
                              </p>
                              <p className="text-xs font-medium text-gray-500">
                                Order: {payment.razorpay_order_id || 'N/A'}
                              </p>
                              <p className="text-xs font-medium text-gray-400">
                                Receipt: {payment.receipt || 'N/A'}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <p className="text-base font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                            <p className="mt-1 text-xs font-medium text-gray-500">
                              Discount: {formatCurrency(payment.emi_discount || 0)}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-700">
                                Paid On: {formatDate(payment.payment_date)}
                              </p>
                              <p className="text-xs font-medium text-gray-500">
                                Due: {formatDate(payment.emi_duedate)}
                              </p>
                              <p className="text-xs font-medium text-gray-400">
                                Created: {formatDate(payment.created_at, true)}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[2px] ${getStatusClasses(
                                  payment.status,
                                  payment.is_paid
                                )}`}
                              >
                                {payment.is_paid ? 'Paid' : payment.status || 'Created'}
                              </span>
                              <p className="text-xs font-medium text-gray-500">
                                Currency: {payment.currency || 'INR'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-5 py-16 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                            <div className="rounded-2xl bg-gray-50 p-4 text-gray-300">
                              <FaCreditCard className="h-8 w-8" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">No payments found</p>
                              <p className="mt-1 text-sm text-gray-400">
                                Try a different search or create the first payment from the form.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Payments;
