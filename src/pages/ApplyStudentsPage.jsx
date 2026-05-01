import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaTrash, FaUser, FaClipboardList, 
  FaCalendarAlt, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaGraduationCap, FaBookOpen, FaTimes, FaCheckCircle,
  FaUniversity, FaClock, FaLightbulb, FaCommentDots,
  FaEdit, FaSave, FaVenusMars, FaGlobeAmericas
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/apply/apply';

const ApplyStudentsPage = () => {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL);
      const result = await response.json();
      if (result.data) {
        setApplications(result.data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Could not load application records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success('Application removed 🧹');
          fetchApplications();
          if (selectedApp?._id === id) setSelectedApp(null);
        } else {
          toast.error('Could not delete application.');
        }
      } catch (error) {
        console.error('Error deleting application:', error);
        toast.error('Network error during deletion.');
      }
    }
  };

  const parseDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const handleEditClick = (e, app) => {
    e.stopPropagation();
    setSelectedApp(app);
    setEditFormData({
      ...app,
      date_of_birth: parseDateForInput(app.date_of_birth)
    });
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Clean up data to send only relevant fields (avoid _id, createdAt, updatedAt etc if possible)
      const { _id, createdAt, updatedAt, __v, ...updateData } = editFormData;

      const response = await fetch(`${API_BASE_URL}/${_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        toast.success('Application updated successfully! ✨');
        setIsEditing(false);
        setSelectedApp(null);
        fetchApplications();
      } else {
        const result = await response.json();
        toast.error(result.message || 'Update failed.');
      }
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Network error or server unavailable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredApplications = applications.filter(app => 
    app.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.selected_course?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Applied Students</h1>
            <p className="mt-1 text-sm text-gray-500">Review and manage student applications from the website.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <FaClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Applications</p>
                  <p className="text-lg font-bold text-gray-900 leading-none">{applications.length}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 relative group">
            <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or course..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-sm" 
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Student Info</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Professional Info</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs">Application Date</th>
                  <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="4" className="px-6 py-8"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredApplications.length > 0 ? (
                    filteredApplications.map((app) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={app._id} 
                        className="group hover:bg-blue-50/20 transition-all cursor-pointer"
                        onClick={() => setSelectedApp(app)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 group-hover:scale-110 transition-transform shadow-sm">
                              <FaUser className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-gray-900 text-base">{app.fullName}</span>
                              <div className="flex items-center gap-2 text-gray-400">
                                <FaEnvelope className="h-3 w-3" />
                                <span className="text-[11px] font-medium">{app.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                               <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700 uppercase tracking-widest border border-blue-100 flex items-center gap-1.5">
                                  <FaBookOpen className="h-3 w-3" />
                                  {app.selected_course}
                               </span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <FaPhone className="h-2.5 w-2.5" />
                                <span className="text-[11px] font-bold">{app.mobile_Number}</span>
                              </div>
                              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                                <FaMapMarkerAlt className="h-2.5 w-2.5" />
                                <span className="text-[11px] font-medium">{app.city}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 text-gray-900 font-bold mb-1">
                                <FaCalendarAlt className="h-3 w-3 text-blue-500" />
                                <span className="text-xs">{formatDate(app.createdAt)}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-medium">Applied for Next Intake</span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => handleEditClick(e, app)}
                              className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="Edit Application"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, app._id)}
                              className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              title="Delete Application"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                          <FaClipboardList className="h-16 w-16" />
                          <p className="text-gray-500 font-medium italic">No applications found in the database.</p>
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

      {/* Details/Edit Modal */}
      <AnimatePresence>
        {(selectedApp || isEditing) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedApp(null); setIsEditing(false); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <form onSubmit={handleUpdate}>
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      {isEditing ? <FaEdit className="h-5 w-5" /> : <FaUser className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        {isEditing ? 'Update Application' : selectedApp?.fullName}
                      </h3>
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest">
                        {isEditing ? 'Editing Mode' : 'Application Details'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isEditing && (
                      <button 
                        type="button"
                        onClick={(e) => handleEditClick(e, selectedApp)}
                        className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => { setSelectedApp(null); setIsEditing(false); }}
                      className="rounded-xl bg-white p-2 text-gray-400 border border-gray-100 hover:bg-gray-50 hover:text-gray-600 transition-all shadow-sm"
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto px-6 py-6" style={{ maxHeight: 'calc(90vh - 150px)' }}>
                  {isEditing ? (
                    /* EDIT FORM UI */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                          <input required name="fullName" value={editFormData.fullName} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email ID</label>
                          <input required type="email" name="email" value={editFormData.email} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                          <input required name="mobile_Number" value={editFormData.mobile_Number} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
                          <select required name="gender" value={editFormData.gender} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all">
                             <option value="Male">Male</option>
                             <option value="Female">Female</option>
                             <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth</label>
                          <input required type="date" name="date_of_birth" value={editFormData.date_of_birth} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                         <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State</label>
                          <input required name="state" value={editFormData.state} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                          <input required name="city" value={editFormData.city} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                         <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pincode</label>
                          <input required name="pincode" value={editFormData.pincode} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Address</label>
                          <textarea required name="address" value={editFormData.address} onChange={handleInputChange} rows="2" className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Course</label>
                          <input required name="selected_course" value={editFormData.selected_course} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Highest Qualification</label>
                          <input required name="highest_Qualification" value={editFormData.highest_Qualification} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                         <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">College Name</label>
                          <input required name="college_Name" value={editFormData.college_Name} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passing Year</label>
                          <input required type="number" name="passing_year" value={editFormData.passing_year} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Area of Interest</label>
                          <input required name="area_of_interest" value={editFormData.area_of_interest} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                         <div className="space-y-1 md:col-span-2">
                           <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <input type="checkbox" name="previous_coding_experience" checked={editFormData.previous_coding_experience} onChange={handleInputChange} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                             <label className="text-sm font-bold text-gray-700">Student Has Previous Coding Experience?</label>
                           </div>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Additional Message</label>
                          <textarea name="additional_message" value={editFormData.additional_message} onChange={handleInputChange} rows="3" className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* VIEW DETAILS UI */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Personal Section */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[2px] border-b pb-2">Contact & Personal</h4>
                          <div className="space-y-3">
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaEnvelope className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Email Address</p><p className="text-sm font-bold text-gray-900">{selectedApp.email}</p></div>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaPhone className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Phone Number</p><p className="text-sm font-bold text-gray-900">{selectedApp.mobile_Number}</p></div>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaVenusMars className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Gender</p><p className="text-sm font-bold text-gray-900">{selectedApp.gender || 'N/A'}</p></div>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaCalendarAlt className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Date of Birth</p><p className="text-sm font-bold text-gray-900">{formatDate(selectedApp.date_of_birth)}</p></div>
                             </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[2px] border-b pb-2">Location Information</h4>
                          <div className="space-y-3">
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaGlobeAmericas className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">State / Region</p><p className="text-sm font-bold text-gray-900">{selectedApp.state || 'N/A'}</p></div>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaMapMarkerAlt className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">City & Pincode</p><p className="text-sm font-bold text-gray-900">{selectedApp.city} - {selectedApp.pincode}</p></div>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaMapMarkerAlt className="h-3 w-3" /></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Full Address</p><p className="text-xs font-bold text-gray-700 leading-relaxed">{selectedApp.address || 'N/A'}</p></div>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Academic Section */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[2px] border-b pb-2">Academic & Course</h4>
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-blue-50 bg-blue-50/30 p-4 space-y-3">
                               <div className="flex items-center gap-2 text-blue-600">
                                 <FaBookOpen className="h-4 w-4" />
                                 <span className="text-xs font-black uppercase tracking-wider">Target Course</span>
                               </div>
                               <p className="text-base font-black text-gray-900">{selectedApp.selected_course}</p>
                            </div>
                            
                            <div className="space-y-3 pl-1">
                              <div className="flex items-start gap-3">
                                 <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaGraduationCap className="h-3 w-3" /></div>
                                 <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Highest Qualification</p><p className="text-sm font-bold text-gray-900">{selectedApp.highest_Qualification}</p></div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaUniversity className="h-3 w-3" /></div>
                                 <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">College/University</p><p className="text-sm font-bold text-gray-900">{selectedApp.college_Name}</p></div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaClock className="h-3 w-3" /></div>
                                 <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Passing Year</p><p className="text-sm font-bold text-gray-900">{selectedApp.passing_year}</p></div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400"><FaLightbulb className="h-3 w-3" /></div>
                                 <div><p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Area of Interest</p><p className="text-sm font-bold text-gray-900">{selectedApp.area_of_interest}</p></div>
                              </div>
                            </div>
                          </div>
                        </div>

                         <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[2px] border-b pb-2">Experience</h4>
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg flex items-center gap-2 ${selectedApp.previous_coding_experience ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                               <FaCheckCircle className="h-3 w-3" />
                               <span className="text-xs font-black uppercase">{selectedApp.previous_coding_experience ? 'Has Coding Experience' : 'No Coding Experience'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Message Section - Full Width */}
                      <div className="md:col-span-2 mt-4">
                        <div className="rounded-2xl bg-gray-50 p-5 space-y-3 border border-gray-100">
                           <div className="flex items-center gap-2 text-gray-500">
                             <FaCommentDots className="h-4 w-4" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Additional Message</span>
                           </div>
                           <p className="text-sm text-gray-700 italic leading-relaxed">
                             "{selectedApp.additional_message || 'No additional message provided.'}"
                           </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                   <p className="text-[10px] text-gray-400 font-bold uppercase">
                     {isEditing ? 'Drafting Changes...' : `Submitted on ${formatDate(selectedApp?.createdAt)}`}
                   </p>
                   <div className="flex gap-3">
                      {isEditing && (
                        <button 
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type={isEditing ? 'submit' : 'button'}
                        disabled={isSubmitting}
                        onClick={() => !isEditing && setSelectedApp(null)}
                        className={`rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {isSubmitting ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : isEditing ? (
                          <FaSave className="h-4 w-4" />
                        ) : (
                          <FaCheckCircle className="h-4 w-4" />
                        )}
                        {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Done'}
                      </button>
                   </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplyStudentsPage;
