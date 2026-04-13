import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaUpload, 
  FaBook, FaArrowLeft, FaCheckCircle, FaLayerGroup, FaEye,
  FaTag, FaClock, FaRupeeSign
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/course';

const CoursesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); // 'list' or 'form'
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormState = {
    course_Name: '',
    type: '',
    duration: '',
    course_Price: '',
    discount_Price: '',
    status: 'Active',
    date: '',
    images: [] // Used internally for the file input
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1. GET ALL API
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get`);
      const result = await response.json();
      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Could not load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    
    // Handle auto-edit if state is passed
    if (location.state?.editId) {
       const loadEdit = async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/getOne/${location.state.editId}`);
            const result = await res.json();
            if (result.data) openEditForm(result.data);
          } catch(e) { console.error(e); }
       };
       loadEdit();
    }
  }, [location.state]);

  // Helper to generate correct Image URLs
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return null;
    if (imagePath.startsWith('http')) return imagePath;

    const cleanPath = imagePath
      .replace(/^public[\/\\]Uploads[\/\\]/, '')
      .replace(/^public[\/\\]/, '')
      .replace(/^Uploads[\/\\]/, '');
      
    return `http://localhost:3005/${cleanPath}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, images: files }));
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(files[0]);
    }
  };

  const openAddForm = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setImagePreview(null);
    setView('form');
  };

  const openEditForm = (course) => {
    setFormData({
      ...course,
      images: [] 
    });
    setCurrentId(course._id);
    setIsEditing(true);
    setImagePreview(course.banner?.[0] || null);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'images') {
        formData.images.forEach(file => {
          // The backend expects 'banner' as the field name for course images
          submitData.append('banner', file);
        });
      } else {
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
        toast.success(isEditing ? 'Course profile updated!' : 'New course launched successfully!');
        setView('list');
        fetchCourses();
        window.history.replaceState({}, document.title);
      } else {
        const result = await response.json();
        toast.error(result.message || 'Operation failed.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Network error or server unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
           toast.success('Course removed from catalogue.');
           fetchCourses();
        } else {
           toast.error('Could not remove course.');
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        toast.error('Network failure.');
      }
    }
  };

  const filteredCourses = courses.filter(course => 
    course.course_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.type?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-bold uppercase">Course Management</h1>
                <p className="mt-1 text-sm text-gray-500 font-medium">Design and deploy academic curriculums.</p>
              </div>
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all font-bold"
              >
                <FaPlus className="h-4 w-4" />
                Add Course
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><FaBook className="h-5 w-5" /></div>
                <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wider font-bold">Total Courses</p><p className="text-xl font-bold text-gray-900 font-bold">{courses.length}</p></div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><FaCheckCircle className="h-5 w-5" /></div>
                <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wider font-bold">Active</p><p className="text-xl font-bold text-gray-900 font-bold">{courses.filter(c => c.status === 'Active').length}</p></div>
              </div>
              <div className="col-span-full lg:col-span-2">
                <div className="relative group">
                  <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search by name or type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-6 py-4 font-semibold text-gray-900 font-bold uppercase">Course Identity</th>
                      <th className="px-6 py-4 font-semibold text-gray-900 font-bold uppercase">Pricing</th>
                      <th className="px-6 py-4 font-semibold text-gray-900 font-bold uppercase text-center">Duration</th>
                      <th className="px-6 py-4 font-semibold text-gray-900 font-bold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="4" className="px-6 py-8"><div className="h-5 bg-gray-100 rounded-lg w-full"></div></td>
                        </tr>
                      ))
                    ) : filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <tr 
                          key={course._id} 
                          className="group hover:bg-blue-50/30 transition-all cursor-pointer"
                          onClick={() => navigate(`/courses/${course._id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-20 overflow-hidden rounded-xl bg-gray-50 border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                                {course.banner?.[0] ? (
                                  <img 
                                    src={getImageUrl(course.banner[0])} 
                                    alt={course.course_Name} 
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + course.course_Name; }}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-gray-200 bg-gray-50 font-bold uppercase"><FaBook className="text-xl" /></div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-base font-bold">{course.course_Name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">TYPE: {course.type}</span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter border-l pl-2">DATE: {course.date}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                                <span className="text-gray-900 font-bold text-sm flex items-center gap-1"><FaRupeeSign className="text-[10px]" />{course.discount_Price}</span>
                                <span className="text-[10px] text-gray-400 font-bold line-through flex items-center gap-1"><FaRupeeSign className="text-[8px]" />{course.course_Price}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-100">
                                <FaClock className="inline mr-1" /> {course.duration}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border ${
                                course.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                                {course.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic font-bold">No courses found matching your search.</td></tr>
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
                  className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all font-bold shadow-sm"
                >
                  <FaArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-bold">{isEditing ? 'Update Course Profile' : 'Deploy New Course'}</h2>
                  <p className="text-xs text-gray-500 font-bold">Mirroring the official academic deployment standards.</p>
                </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setView('list')} className="px-5 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors font-bold uppercase tracking-tight">Cancel</button>
                 <button 
                   type="submit" 
                   form="courseForm" 
                   disabled={isSubmitting}
                   className={`px-6 py-2 rounded-lg text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-100'}`}
                 >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <FaCheckCircle className="h-4 w-4" />
                    )} 
                    {isSubmitting ? 'Syncing...' : isEditing ? 'Save Changes' : 'Confirm Launch'}
                  </button>
              </div>
            </div>

            <form id="courseForm" onSubmit={handleSubmit} className="space-y-6 pb-24">
              {/* Course Branding Section */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                 <div className="relative group">
                    <div className="h-32 w-56 rounded-lg bg-gray-50 overflow-hidden border-2 border-gray-100 shadow-sm relative flex items-center justify-center">
                        {imagePreview ? (
                            <img src={getImageUrl(imagePreview)} className="h-full w-full object-cover" />
                        ) : (
                            <FaBook className="text-gray-200 text-5xl" />
                        )}
                        <label className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer">
                            <FaUpload className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xl" />
                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                        </label>
                    </div>
                 </div>
                 <div className="text-center md:text-left">
                    <h3 className="text-lg font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-1 font-bold">Course Branding</h3>
                    <p className="text-gray-500 text-xs text-amber-600 font-bold uppercase tracking-tighter">A high-quality banner is mandatory for official records.</p>
                 </div>
              </div>

              {/* Core Information */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-blue-100 relative overflow-hidden">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FaTag /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight font-bold">Primary Configuration Hub</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Official Course Name</label>
                        <input required name="course_Name" value={formData.course_Name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" placeholder="e.g. BCA, MCA, PGDCA" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Academic Stream / Type</label>
                        <input required name="type" value={formData.type} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" placeholder="e.g. IT, Management" />
                    </div>
                 </div>
              </div>

              {/* Deployment & Pricing Section */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-emerald-100">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FaRupeeSign /></div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-tight font-bold">Operational Deployment & Pricing</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Catalogue Price (INR)</label>
                        <input required type="number" name="course_Price" value={formData.course_Price} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-gray-500/10 focus:border-gray-500 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Offer Price (INR)</label>
                        <input required type="number" name="discount_Price" value={formData.discount_Price} onChange={handleInputChange} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/20 p-2.5 text-lg font-bold text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Deployment Duration</label>
                        <select required name="duration" value={formData.duration} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all">
                            <option value="">Select Duration</option>
                            <option value="1 year">1 year</option>
                            <option value="3 years">3 years</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Course Availability</label>
                        <select required name="status" value={formData.status} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all">
                            <option value="Active">Operational / Active</option>
                            <option value="Inactive">Paused / Inactive</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">Official Launch Date</label>
                        <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                    </div>
                 </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50">
                 <button type="button" onClick={() => setView('list')} className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors font-bold uppercase">Cancel</button>
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
                    {isSubmitting ? 'Executing Sync...' : isEditing ? 'Save Changes' : 'Confirm Launch'}
                  </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursesPage;
