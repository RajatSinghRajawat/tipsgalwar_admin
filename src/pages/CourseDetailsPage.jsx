import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, FaEdit, FaTrash, FaCheckCircle, FaBook, 
  FaInfoCircle, FaShieldAlt, FaRupeeSign, FaClock, FaTag
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/course';

const CourseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/getOne/${id}`);
      const result = await response.json();
      if (result.data) {
        setCourse(result.data);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast.error('Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const handleEdit = () => {
    navigate('/courses', { state: { editId: id } });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove this course from the catalogue? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          toast.success('Course record purged successfully.');
          navigate('/courses');
        } else {
          const result = await response.json();
          toast.error(result.message || 'Failed to remove course.');
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        toast.error('An error occurred during deletion.');
      }
    }
  };

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20 px-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Course Not Found</h2>
        <p className="text-sm text-gray-500 mb-6 font-medium font-bold uppercase tracking-tight">The specified academic curriculum could not be retrieved from the database.</p>
        <button onClick={() => navigate('/courses')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all font-bold">
          <FaArrowLeft className="h-4 w-4" /> Back to Catalogue
        </button>
      </div>
    );
  }

  const DataRow = ({ label, value, colorClass = "text-gray-900" }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">{label}</label>
      <p className={`w-full rounded-lg border border-gray-100 bg-gray-50/30 p-3 text-sm font-bold ${colorClass}`}>
        {value || 'N/A'}
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto pb-12 space-y-6"
    >
      {/* Action Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/courses')}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm font-bold"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-bold uppercase">Course Profile Overview</h2>
            <p className="text-xs text-gray-500 font-bold">Official deployment details and pricing matrix.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleEdit}
            className="px-5 py-2.5 bg-blue-600 rounded-xl text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <FaEdit className="h-4 w-4" /> Edit Profile
          </button>
          <button 
            onClick={handleDelete}
            className="p-2.5 rounded-xl border border-rose-100 bg-white text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
          >
            <FaTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero Branding Section */}
      <div className="rounded-xl border border-gray-100 bg-white p-1 overflow-hidden shadow-lg relative h-80">
         {course.banner?.[0] ? (
             <img 
               src={getImageUrl(course.banner[0])} 
               alt={course.course_Name} 
               className="h-full w-full object-cover" 
               onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + course.course_Name; }}
             />
         ) : (
             <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-200 text-6xl"><FaBook /></div>
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
            <div className="flex-1">
               <span className="inline-block rounded-lg bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white mb-3">
                 {course.type} Stream
               </span>
               <h3 className="text-4xl font-black text-white">{course.course_Name}</h3>
            </div>
            <div className="flex items-center gap-4">
                <span className={`rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border ${
                    course.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                    'bg-rose-500/20 text-rose-300 border-rose-400/30'
                }`}>
                  <FaCheckCircle className="h-4 w-4" /> {course.status} Status
                </span>
            </div>
         </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Academic Details */}
         <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-blue-100">
           <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-widest border-l-4 border-blue-600 pl-3">Academic Deployment Matrix</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataRow label="Official Designation" value={course.course_Name} />
              <DataRow label="Duration Marker" value={course.duration} />
              <DataRow label="Stream/Field Type" value={course.type} />
              <DataRow label="Launch Date" value={course.date} />
              <DataRow label="Current Status" value={course.status} colorClass={course.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'} />
           </div>
           
           <div className="p-4 bg-blue-50/30 rounded-lg border border-blue-50 flex items-start gap-4">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><FaInfoCircle className="text-xl" /></div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase mb-1">Administrative Note</p>
                <p className="text-[11px] text-blue-700 leading-relaxed font-bold uppercase tracking-tight">
                    This curriculum is verified and ready for student enrollment. All session markers and pricing nodes are synchronized with the central academic intelligence hub.
                </p>
              </div>
           </div>
         </div>

         {/* Pricing Matrix */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-emerald-100">
           <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-widest border-l-4 border-emerald-500 pl-3">Financial Nodes</h4>
           <div className="space-y-6">
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 text-center space-y-2">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Offer Price</p>
                 <p className="text-4xl font-black text-emerald-600 flex items-center justify-center gap-2">
                    <FaRupeeSign className="text-2xl" /> {course.discount_Price}
                 </p>
              </div>
              <div className="space-y-4 px-2">
                  <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-3">
                    <span className="text-gray-400 uppercase text-[10px]">Catalogue Value</span>
                    <span className="text-gray-500 line-through">₹{course.course_Price}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-3">
                    <span className="text-gray-400 uppercase text-[10px]">Total Savings</span>
                    <span className="text-emerald-600">-₹{course.course_Price - course.discount_Price}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-1">
                    <span className="text-gray-400 uppercase text-[10px]">Operational Yield</span>
                    <span className="text-blue-600 font-black">HIGH</span>
                  </div>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-50 flex items-center gap-3">
                 <FaShieldAlt className="text-emerald-500" />
                 <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-tighter">Verified Financial Protocol</p>
              </div>
           </div>
         </div>
      </div>
    </motion.div>
  );
};

export default CourseDetailsPage;
