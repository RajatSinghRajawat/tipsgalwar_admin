import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaTrash, FaGraduationCap, FaTimes, 
  FaExclamationTriangle, FaEye, FaCalendarAlt, 
  FaUser, FaPhone, FaAward, FaShieldAlt, FaClock 
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/exam/results';

const ExamResultsPage = () => {
  const toast = useToast();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL);
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch exam results.');
      }
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast.error('Could not connect to the backend database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this exam result record?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok && data.success) {
          toast.success('Exam result record removed 🧹');
          fetchResults();
          if (selectedResult?._id === id) setSelectedResult(null);
        } else {
          toast.error(data.message || 'Could not delete record.');
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Network error during deletion.');
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredResults = results.filter(res => 
    res.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.examId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.mobileNumber?.includes(searchTerm)
  );

  // Statistics calculations
  const totalExams = results.length;
  const avgScore = totalExams > 0 
    ? results.reduce((acc, curr) => acc + (curr.score / (curr.totalMarks || 1) * 100), 0) / totalExams 
    : 0;
  const totalWarnings = results.reduce((acc, curr) => acc + curr.warningCount, 0);
  const cleanExamsCount = results.filter(r => r.warningCount === 0).length;

  return (
    <div className="min-h-screen pb-12 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Exam Results & Monitoring</h1>
            <p className="mt-1 text-sm text-gray-500">Track student exam marks, cheating logs, and security warnings.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <FaGraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Exams Taken</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{totalExams}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <FaAward className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Average Grade</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{avgScore.toFixed(1)}%</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="rounded-xl bg-red-50 p-3 text-red-600">
              <FaExclamationTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Warnings</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{totalWarnings}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <FaShieldAlt className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clean Exams (0 Alerts)</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{cleanExamsCount}</p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="relative group max-w-xl">
          <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by student name, email, mobile or exam ID..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm" 
          />
        </div>

        {/* Results Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Student Info</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Exam Details</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Score</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Warnings</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Date</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="6" className="px-6 py-8"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredResults.length > 0 ? (
                    filteredResults.map((res) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={res._id} 
                        className="group hover:bg-blue-50/20 transition-all cursor-pointer"
                        onClick={() => setSelectedResult(res)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 font-bold group-hover:scale-110 transition-transform shadow-sm">
                              {res.studentName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{res.studentName}</p>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase leading-none mt-1">Father: {res.fatherName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-900 uppercase">{res.examId.replace(/-/g, ' ')}</p>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                              <FaPhone className="text-gray-300" /> {res.mobileNumber}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-gray-900">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs border ${
                            (res.score / (res.totalMarks || 1) * 100) >= 60 
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {res.score} / {res.totalMarks} ({(res.score / (res.totalMarks || 1) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                            res.warningCount === 0 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : res.warningCount < 3
                                ? 'bg-orange-50 text-orange-700 border-orange-100'
                                : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            <FaShieldAlt className="h-3 w-3" />
                            {res.warningCount} Alerts
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-500 font-medium text-xs">
                          {formatDate(res.createdAt)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedResult(res); }}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <FaEye className="text-lg" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, res._id)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <FaTrash className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 grayscale opacity-40">
                          <FaGraduationCap className="h-16 w-16 text-gray-300" />
                          <p className="text-gray-500 font-medium italic">No exam result records found in the database.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Proctor Report Detail Drawer */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResult(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Exam Proctor Report</h2>
                  <p className="text-xs text-gray-500 italic mt-0.5">Finished on {formatDate(selectedResult.createdAt)}</p>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Candidate Overview */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Student Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Student Name</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedResult.studentName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Father's Name</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedResult.fatherName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Mobile Number</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedResult.mobileNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Exam Code</p>
                      <p className="text-sm font-bold text-blue-600 uppercase mt-0.5">{selectedResult.examId}</p>
                    </div>
                  </div>
                </div>

                {/* Score & Security Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-blue-50/40 border border-blue-100/50 p-5 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Marks Obtained</p>
                    <p className="text-3xl font-black text-blue-700 mt-2">
                      {selectedResult.score} <span className="text-xs text-blue-500 font-bold">/ {selectedResult.totalMarks}</span>
                    </p>
                    <p className="text-[10px] text-blue-500 font-bold mt-1">
                      Grade: {((selectedResult.score / (selectedResult.totalMarks || 1)) * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-5 text-center ${
                    selectedResult.warningCount === 0 
                      ? 'bg-emerald-50/40 border-emerald-100/50 text-emerald-700'
                      : 'bg-red-50/40 border-red-100/50 text-red-700'
                  }`}>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Integrity Score</p>
                    <p className="text-3xl font-black mt-2">
                      {Math.max(0, 100 - (selectedResult.warningCount * 33))}%
                    </p>
                    <p className="text-[10px] font-bold mt-1">
                      {selectedResult.warningCount} Warnings Triggered
                    </p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Security Violations Log */}
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Security Violation Logs</h4>
                  {selectedResult.cheatingAttempts?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedResult.cheatingAttempts.map((attempt, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-red-100 bg-red-50/20 text-red-700">
                          <FaExclamationTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold leading-relaxed">{attempt.reason}</p>
                            <p className="text-[10px] text-red-400 font-bold mt-1 flex items-center gap-1">
                              <FaClock /> {attempt.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100">
                      <FaShieldAlt className="text-4xl text-emerald-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Clean Integrity Audit</p>
                      <p className="text-[10px] text-gray-400 mt-1">No violations detected during this exam session.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-gray-100 p-6 flex items-center justify-between bg-gray-50/50">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-white"
                >
                  Close Report
                </button>
                <button
                  onClick={(e) => handleDelete(e, selectedResult._id)}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95"
                >
                  <FaTrash className="h-4.5 w-4.5" /> Delete Attempt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamResultsPage;
