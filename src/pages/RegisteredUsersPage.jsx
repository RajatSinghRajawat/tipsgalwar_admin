import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaUser, FaClipboardList, 
  FaEnvelope, FaPhone, FaCalendarAlt,
  FaTimes, FaUserGraduate, FaShieldAlt
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/auth/all-users';

const RegisteredUsersPage = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL);
      const result = await response.json();
      if (result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Could not load registered users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.mobile_Number?.includes(searchTerm)
  );

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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Registered Students</h1>
            <p className="mt-1 text-sm text-gray-500">View all students who have signed up on the portal.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <FaUserGraduate className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Total Users</p>
                  <p className="text-lg font-bold text-gray-900 leading-none">{users.length}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Filters */}
        <div className="relative group max-w-xl">
          <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, or mobile..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium shadow-sm" 
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">User Info</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Mobile Number</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Status</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Signed Up Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="4" className="px-6 py-8"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={user._id} 
                        className="group hover:bg-indigo-50/20 transition-all cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm group-hover:scale-110 transition-transform">
                              <FaUser className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-gray-900 text-sm">{user.fullName}</span>
                              <div className="flex items-center gap-2 text-gray-400">
                                <FaEnvelope className="h-2.5 w-2.5" />
                                <span className="text-[10px] font-medium">{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <FaPhone className="h-3 w-3 text-indigo-400" />
                            {user.mobile_Number}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 w-fit">
                            <FaShieldAlt className="h-2.5 w-2.5" />
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-gray-500 text-xs">
                          {formatDate(user.createdAt)}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                          <FaClipboardList className="h-16 w-16" />
                          <p className="text-gray-500 font-medium italic">No registered users found.</p>
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

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <FaUserGraduate className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedUser.fullName}</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[2px]">User Profile</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="rounded-xl bg-white p-2 text-gray-400 border border-gray-100 hover:bg-gray-50 hover:text-gray-600 transition-all shadow-sm"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <FaEnvelope className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Email Address</p>
                      <p className="text-base font-bold text-gray-900">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <FaPhone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Mobile Number</p>
                      <p className="text-base font-bold text-gray-900">{selectedUser.mobile_Number}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <FaCalendarAlt className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Registration Date</p>
                      <p className="text-base font-bold text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaShieldAlt className="text-indigo-600 h-4 w-4" />
                    <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">Account Status</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    This user has successfully registered and verified their email. They can now access the student dashboard and apply for courses.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex justify-end">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="rounded-xl px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegisteredUsersPage;
