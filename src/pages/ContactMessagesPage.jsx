import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaTrash, FaEnvelope, FaPhone, 
  FaGraduationCap, FaTimes, FaInbox, FaUser, 
  FaCalendarAlt, FaCommentAlt, FaEye
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/contact/contact';

const ContactMessagesPage = () => {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMsg, setSelectedMsg] = useState(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL);
      const result = await response.json();
      if (result.data) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Could not load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success('Message deleted 🧹');
          fetchMessages();
          if (selectedMsg?._id === id) setSelectedMsg(null);
        } else {
          toast.error('Could not delete message.');
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('Network error during deletion.');
      }
    }
  };

  const filteredMessages = messages.filter(msg => 
    msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contact Inquiries</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and respond to website contact forms</p>
        </div>

        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or subject..."
            className="w-full rounded-xl border-gray-200 pl-10 pr-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500 md:w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Counter */}
      <div className="mb-6 flex gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex items-center gap-4 flex-1">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FaInbox className="text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Inquiries</p>
            <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex items-center gap-4 flex-1">
          <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <FaUser className="text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Senders</p>
            <p className="text-2xl font-bold text-gray-900">{new Set(messages.map(m => m.email)).size}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100"></div>
          ))}
        </div>
      ) : filteredMessages.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Sender & Date</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Qualification</th>
                  <th className="px-6 py-4">Message Preview</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMessages.map((msg) => (
                  <tr 
                    key={msg._id} 
                    className="group transition-all hover:bg-blue-50/30 cursor-pointer"
                    onClick={() => setSelectedMsg(msg)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                          {msg.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{msg.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                            <FaCalendarAlt className="text-blue-300" /> {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                          <FaEnvelope className="text-blue-400 shrink-0" /> 
                          <span className="truncate max-w-[150px]">{msg.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                          <FaPhone className="text-green-500 shrink-0" /> {msg.mobilenumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-100">
                        <FaGraduationCap className="text-indigo-400" /> {msg.qualification}
                      </span>
                    </td>
                    <td className="px-6 py-5 min-w-[200px]">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1 italic italic-font opacity-80">
                          "{msg.message}"
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedMsg(msg); }}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <FaEye className="text-lg" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, msg._id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <FaTrash className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-6">
           <FaInbox className="text-5xl text-gray-200 mb-4" />
           <p className="text-gray-400 font-medium">No results found for your search.</p>
        </div>
      )}

      {/* Message View Drawer/Modal */}
      <AnimatePresence>
        {selectedMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMsg(null)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
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
                  <h2 className="text-xl font-bold text-gray-900">Message Details</h2>
                  <p className="text-sm text-gray-500 italic">Received on {formatDate(selectedMsg.createdAt)}</p>
                </div>
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Subject Block */}
                <div className="rounded-2xl bg-blue-50 p-6 border border-blue-100 shadow-inner">
                  <span className="text-[10px] uppercase tracking-widest font-black text-blue-600 block mb-2">Subject</span>
                  <h3 className="text-xl font-black text-blue-900">{selectedMsg.subject}</h3>
                </div>

                {/* Sender Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Full Name</label>
                      <div className="flex items-center gap-3 text-gray-900 font-semibold">
                        <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                          <FaUser />
                        </div>
                        {selectedMsg.name}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Email Address</label>
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-blue-400">
                          <FaEnvelope />
                        </div>
                        {selectedMsg.email}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Qualification</label>
                      <div className="flex items-center gap-3 text-gray-900 font-semibold">
                        <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-indigo-500">
                          <FaGraduationCap />
                        </div>
                        {selectedMsg.qualification}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Mobile Number</label>
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-green-500">
                          <FaPhone />
                        </div>
                        {selectedMsg.mobilenumber}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Message Content */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Original Message</label>
                  <div className="relative rounded-2xl bg-gray-50 p-6 border border-gray-100">
                    <FaCommentAlt className="absolute -top-3 -left-3 text-blue-200 text-3xl opacity-50" />
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap italic">
                      "{selectedMsg.message}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-gray-100 p-6 flex items-center justify-between bg-gray-50/50">
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-white"
                >
                  Close View
                </button>
                <div className="flex gap-2">
                  <a
                    href={`mailto:${selectedMsg.email}`}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                  >
                    <FaEnvelope /> Reply via Email
                  </a>
                  <button
                    onClick={(e) => handleDelete(e, selectedMsg._id)}
                    className="rounded-xl bg-red-50 p-2.5 text-red-500 hover:bg-red-100"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactMessagesPage;
