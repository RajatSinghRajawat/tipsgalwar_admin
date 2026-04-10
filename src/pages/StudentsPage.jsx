import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaUpload, 
  FaUser, FaBriefcase, FaArrowLeft, FaCheckCircle, FaGraduationCap, FaEye,
  FaMapMarkerAlt, FaCreditCard, FaCalendarAlt, FaIdCard, FaShieldAlt
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/student';

const StudentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); // 'list' or 'form'
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);

  const initialFormState = {
    course_Id: '',
    batch_Id: '',
    enrollment_Id: '',
    name: '',
    father_Name: '',
    mother_Name: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    aadhar: '',
    pan_Card: '',
    emi: '',
    contact: '',
    email: '',
    password: '',
    dob: '',
    image: null
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1. GET ALL STUDENTS API
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get`);
      const result = await response.json();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Could not load student records.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAcademicData = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        fetch('http://localhost:3005/apis/course/get'),
        fetch('http://localhost:3005/apis/batch/get')
      ]);
      const coursesData = await coursesRes.json();
      const batchesData = await batchesRes.json();
      
      if (coursesData.data) setCourses(coursesData.data);
      if (batchesData.data) setBatches(batchesData.data);
    } catch (error) {
      console.error('Error fetching academic data:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAcademicData();
  }, []);

  // Handle Edit navigation from Details Page
  useEffect(() => {
    if (location.state?.editId && students.length > 0) {
      const studentToEdit = students.find(s => s._id === location.state.editId);
      if (studentToEdit) {
        openEditForm(studentToEdit);
        // Clear state to prevent re-triggering on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, students]);

  // Helper to generate correct Image URLs
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;

    const cleanPath = imagePath
      .replace(/^public[\/\\]Uploads[\/\\]/, '')
      .replace(/^public[\/\\]/, '')
      .replace(/^Uploads[\/\\]/, '');
      
    return `http://localhost:3005/${cleanPath}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const parseDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const openAddForm = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setImagePreview(null);
    setView('form');
  };

  const openEditForm = (student) => {
    setFormData({
      ...student,
      course_Id: typeof student.course_Id === 'object' ? student.course_Id?._id : student.course_Id,
      batch_Id: typeof student.batch_Id === 'object' ? student.batch_Id?._id : student.batch_Id,
      password: '', // Don't pre-fill password for security
      dob: parseDateForInput(student.dob),
      image: null 
    });
    setCurrentId(student._id);
    setIsEditing(true);
    setImagePreview(student.image || null);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'address') {
        Object.keys(formData.address).forEach(subKey => {
          submitData.append(`address[${subKey}]`, formData.address[subKey]);
        });
      } else if (key === 'image') {
        if (formData.image) {
          submitData.append('image', formData.image);
        }
      } else {
        if (key === 'password' && isEditing && !formData[key]) return;
        submitData.append(key, formData[key]);
      }
    });

    try {
      setIsSubmitting(true);
      const url = isEditing ? `${API_BASE_URL}/update/${currentId}` : `${API_BASE_URL}/add`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: submitData
      });
      
      if (response.ok) {
        toast.success(isEditing ? 'Student record updated successfully!' : 'Student registered successfully!');
        setView('list');
        fetchStudents();
      } else {
        const result = await response.json();
        toast.error(result.message || 'Operation failed. Please check inputs.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Network error or server unavailable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student record?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success('Student record removed.');
          fetchStudents();
        } else {
          toast.error('Could not delete student.');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Network error during deletion.');
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      let date;
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        date = new Date(`${y}-${m}-${d}`);
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.enrollment_Id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-12 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Students Portal</h1>
                <p className="mt-1 text-sm text-gray-500">Manage all student academic records in one place.</p>
              </div>
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
              >
                <FaPlus className="h-4 w-4" />
                Add Student
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><FaGraduationCap className="h-5 w-5" /></div>
                <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Enrolled</p><p className="text-xl font-bold text-gray-900">{students.length}</p></div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><FaIdCard className="h-5 w-5" /></div>
                <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Batches</p><p className="text-xl font-bold text-gray-900">{new Set(students.map(s => typeof s.batch_Id === 'object' ? s.batch_Id?._id : s.batch_Id)).size}</p></div>
              </div>
              <div className="col-span-full lg:col-span-2">
                <div className="relative group">
                  <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search by name, enrollment ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-6 py-4 font-semibold text-gray-900">Student Info</th>
                      <th className="px-6 py-4 font-semibold text-gray-900">Academic Details</th>
                      <th className="px-6 py-4 font-semibold text-gray-900">Parent Info</th>
                      <th className="px-6 py-4 font-semibold text-gray-900 text-right">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="5" className="px-6 py-8"><div className="h-5 bg-gray-100 rounded-lg w-full"></div></td>
                        </tr>
                      ))
                    ) : filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <tr key={student._id} className="group hover:bg-blue-50/30 transition-all cursor-pointer" onClick={() => navigate(`/students/${student._id}`)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-50 border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                                {student.image ? (
                                  <img 
                                    src={getImageUrl(student.image)} 
                                    alt={student.name} 
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-gray-200 bg-gray-50"><FaUser className="text-xl" /></div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-base">{student.name}</span>
                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">ID: {student.enrollment_Id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col gap-1">
                                <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-100 w-fit">
                                  Course: {typeof student.course_Id === 'object' ? (student.course_Id?.course_Name || 'N/A') : (student.course_Id || 'N/A')}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Batch: {typeof student.batch_Id === 'object' ? (student.batch_Id?.batch_Name || 'N/A') : (student.batch_Id || 'N/A')}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-gray-900 font-semibold text-xs">F: {student.father_Name}</span>
                                <span className="text-gray-400 text-[10px]">M: {student.mother_Name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                                <span className="text-gray-900 font-bold text-sm">{student.contact}</span>
                                <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{student.email}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">No student records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('list')}
                  className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <FaArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Student Profile' : 'Student Enrollment'}</h2>
                  <p className="text-xs text-gray-500">Fill in the official academic and personal details.</p>
                </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setView('list')} className="px-5 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                 <button 
                   type="submit" 
                   form="studentForm" 
                   disabled={isSubmitting}
                   className={`px-6 py-2 rounded-lg text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                 >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <FaCheckCircle className="h-4 w-4" />
                    )} 
                    {isSubmitting ? 'Processing...' : isEditing ? 'Save Changes' : 'Enroll Student'}
                  </button>
              </div>
            </div>

            <form id="studentForm" onSubmit={handleSubmit} className="space-y-6 pb-24">
              {/* Profile Photo Section */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                 <div className="relative group">
                    <div className="h-32 w-32 rounded-lg bg-gray-50 overflow-hidden border-2 border-gray-100 shadow-sm relative">
                        {imagePreview ? (
                            <img src={imagePreview.startsWith('data:') ? imagePreview : getImageUrl(imagePreview)} className="h-full w-full object-cover" />
                        ) : (
                            <FaUser className="m-auto text-gray-200 text-5xl mt-10" />
                        )}
                        <label className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer">
                            <FaUpload className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xl" />
                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                        </label>
                    </div>
                 </div>
                 <div className="text-center md:text-left">
                    <h3 className="text-lg font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-1">Upload Identification Photo</h3>
                    <p className="text-gray-500 text-xs">Student profile photo is required for ID cards.</p>
                 </div>
              </div>

              {/* Personal & Parent Section */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 relative overflow-hidden transition-all hover:border-blue-100">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FaUser /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight">Personal & Parent Details</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1 md:col-span-2"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Full Student Name</label><input required name="name" value={formData.name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Date of Birth</label><input required type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" /></div>
                    
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Father's Name</label><input required name="father_Name" value={formData.father_Name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Mother's Name</label><input required name="mother_Name" value={formData.mother_Name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Contact Number</label><input required pattern="[0-9]{10}" name="contact" value={formData.contact} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" /></div>
                 </div>
              </div>

              {/* Login Credentials */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-emerald-100">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FaShieldAlt className="h-4 w-4" /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight">Portal Access Credentials</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Email Address</label><input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Password</label><input required={!isEditing} type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium" placeholder={isEditing ? '••••••••' : 'Set portal password'} /></div>
                 </div>
              </div>

              {/* Academic Section */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-amber-100">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FaGraduationCap /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight">Academic Enrollment</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Select Course</label>
                      <select 
                        required 
                        name="course_Id" 
                        value={formData.course_Id} 
                        onChange={handleInputChange} 
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                      >
                        <option value="">Choose Course</option>
                        {courses.map(course => (
                          <option key={course._id} value={course._id}>{course.course_Name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Select Batch</label>
                      <select 
                        required 
                        name="batch_Id" 
                        value={formData.batch_Id} 
                        onChange={handleInputChange} 
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                      >
                        <option value="">Choose Batch</option>
                        {batches.map(batch => (
                          <option key={batch._id} value={batch._id}>{batch.batch_Name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Enrollment ID</label>
                      <input 
                        required 
                        name="enrollment_Id" 
                        value={formData.enrollment_Id} 
                        onChange={handleInputChange} 
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium" 
                        placeholder="Enrollment ID" 
                      />
                    </div>
                 </div>
              </div>

              {/* Identity & Fees Section */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-indigo-100">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FaIdCard /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight">Identity & Fees (EMI)</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Aadhar Number</label><input required pattern="[0-9]{12}" name="aadhar" value={formData.aadhar} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium" placeholder="12 Digit Aadhar" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">PAN Card</label><input required name="pan_Card" value={formData.pan_Card} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium uppercase" placeholder="PAN Number" /></div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">EMI Frequency</label>
                      <select required name="emi" value={formData.emi} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium">
                        <option value="">Select Frequency</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Semester">Semester</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                 </div>
              </div>

              {/* Residential Block */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-amber-100">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FaMapMarkerAlt /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight">Residential Address</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Street / Locality</label><input required name="address.street" value={formData.address.street} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">City</label><input required name="address.city" value={formData.address.city} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">State</label><input required name="address.state" value={formData.address.state} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">PIN Code</label><input required name="address.pincode" value={formData.address.pincode} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all" /></div>
                    </div>
                 </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50">
                 <button type="button" onClick={() => setView('list')} className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                 <button 
                   type="submit" 
                   disabled={isSubmitting}
                   className={`px-8 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 active:scale-95'}`}
                 >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <FaCheckCircle className="h-5 w-5" />
                    )} 
                    {isSubmitting ? 'Enrolling...' : isEditing ? 'Save Changes' : 'Enroll Student'}
                  </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentsPage;