import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaUniversity, FaWallet, FaCalendarAlt, FaEdit, FaTrash,
  FaArrowRight, FaIdCard, FaGraduationCap, FaCheckCircle, 
  FaShieldAlt, FaClock, FaCreditCard, FaUserFriends
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/student';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/getOne/${id}`);
      const result = await response.json();
      if (result.data) {
        setStudent(result.data);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      toast.error('Failed to load student details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [id]);

  const handleEdit = () => {
    // Navigate back to students list with editId in state
    navigate('/students', { state: { editId: id } });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanentely delete this student record?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          toast.success('Student record deleted.');
          navigate('/students');
        } else {
          toast.error('Record deletion failed.');
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

  const DataRow = ({ label, value, colorClass = "text-gray-900", icon: Icon }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />} {label}
      </label>
      <p className={`w-full rounded-lg border border-gray-100 bg-gray-50/30 p-2.5 text-sm font-semibold ${colorClass}`}>
        {value || 'N/A'}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 px-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Student Record Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The student record you requested was not found in the database.</p>
        <button onClick={() => navigate('/students')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all">
          <FaArrowLeft className="h-4 w-4" /> Back to Students
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-12 space-y-6"
    >
      {/* Header Hub */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/students')}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
            <p className="text-xs text-gray-500">Academic enrollment & personal dossier.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleEdit}
            className="px-5 py-2.5 bg-blue-600 rounded-xl text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <FaEdit className="h-4 w-4" /> Edit Record
          </button>
          <button 
            onClick={handleDelete}
            className="p-2.5 rounded-xl border border-rose-100 bg-white text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
          >
            <FaTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top Profile Summary Card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
         <div className="h-32 w-32 rounded-xl bg-gray-50 overflow-hidden border-2 border-white shadow-lg relative group">
            {student.image ? (
                <img 
                  src={getImageUrl(student.image)} 
                  alt={student.name} 
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-200 text-5xl"><FaUser /></div>
            )}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
         </div>
         <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{student.name}</h3>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
               <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                 <FaGraduationCap className="h-3 w-3" /> {typeof student.course_Id === 'object' ? student.course_Id?.course_Name : 'No Course'}
               </span>
               <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 uppercase tracking-widest border border-blue-100 flex items-center gap-2">
                 <FaIdCard className="h-3 w-3" /> Batch: {typeof student.batch_Id === 'object' ? student.batch_Id?.batch_Name : 'Unassigned'}
               </span>
               <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-black text-indigo-700 uppercase tracking-widest border border-indigo-100 flex items-center gap-2">
                 <FaShieldAlt className="h-3 w-3" /> Reg: {student.enrollment_Id}
               </span>
            </div>
         </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Academic Detailed Hub */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 md:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
               <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 uppercase tracking-tight">
                  <FaGraduationCap className="text-emerald-500" /> Academic Program & Schedule
               </h4>
               <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-bold uppercase">Active Status</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Course Column */}
               <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Course Information</p>
                  <DataRow label="Enrolled Course" value={student.course_Id?.course_Name} icon={FaGraduationCap} />
                  <div className="grid grid-cols-2 gap-4">
                     <DataRow label="Course Type" value={student.course_Id?.type} />
                     <DataRow label="Duration" value={student.course_Id?.duration} icon={FaClock} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <DataRow label="Course Fee" value={`₹${student.course_Id?.course_Price?.toLocaleString()}`} icon={FaCreditCard} />
                     <DataRow label="After Discount" value={`₹${student.course_Id?.discount_Price?.toLocaleString()}`} colorClass="text-emerald-600" />
                  </div>
               </div>

               {/* Batch Column */}
               <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Batch Identification & Timing</p>
                  <DataRow label="Assigned Batch" value={student.batch_Id?.batch_Name} icon={FaIdCard} />
                  <div className="grid grid-cols-2 gap-4">
                     <DataRow label="Start Date" value={formatDate(student.batch_Id?.start_Date)} icon={FaCalendarAlt} />
                     <DataRow label="End Date" value={formatDate(student.batch_Id?.end_Date)} icon={FaCalendarAlt} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <DataRow label="Morning Start" value={student.batch_Id?.start_Time} icon={FaClock} />
                     <DataRow label="Evening End" value={student.batch_Id?.end_Time} icon={FaClock} />
                  </div>
               </div>
            </div>
         </div>

         {/* Personal & Parentage */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <h4 className="font-bold text-gray-900 text-sm border-l-4 border-blue-600 pl-3 uppercase tracking-tight">Student & Parentage Hub</h4>
            <div className="grid grid-cols-1 gap-4">
               <DataRow label="Date of Birth" value={formatDate(student.dob)} icon={FaCalendarAlt} />
               <DataRow label="Father's Name" value={student.father_Name} icon={FaUserFriends} />
               <DataRow label="Mother's Name" value={student.mother_Name} icon={FaUserFriends} />
               <div className="grid grid-cols-2 gap-4">
                  <DataRow label="Contact" value={student.contact} icon={FaPhone} />
                  <DataRow label="Email" value={student.email} icon={FaEnvelope} />
               </div>
            </div>
         </div>

         {/* Identity & Legal Info */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <h4 className="font-bold text-gray-900 text-sm border-l-4 border-indigo-600 pl-3 uppercase tracking-tight">Identity & Identity Matrix</h4>
            <div className="grid grid-cols-1 gap-4">
               <DataRow label="Aadhar Document ID" value={student.aadhar} icon={FaShieldAlt} />
               <DataRow label="PAN Identification" value={student.pan_Card} icon={FaShieldAlt} />
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider flex items-center gap-1">
                     <FaWallet className="h-2.5 w-2.5" /> EMI Frequency
                  </label>
                  <p className="w-full rounded-lg border border-indigo-100 bg-indigo-50/30 p-2.5 text-sm font-black text-indigo-700 uppercase tracking-widest">
                    {student.emi || 'Standard'} Basis
                  </p>
               </div>
            </div>
         </div>

         {/* Location & Contact Card */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 md:col-span-2">
            <h4 className="font-bold text-gray-900 text-sm border-l-4 border-amber-500 pl-3 uppercase tracking-tight">Geographic Hub (Residence)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <DataRow label="Street / Locality address" value={student.address?.street} icon={FaMapMarkerAlt} />
                  <div className="grid grid-cols-2 gap-4">
                     <DataRow label="City / District" value={student.address?.city} />
                     <DataRow label="State Code" value={student.address?.state} />
                  </div>
               </div>
               <div className="flex flex-col justify-end">
                  <div className="rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 p-6 flex items-center justify-center gap-3">
                     <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <FaMapMarkerAlt className="h-6 w-6" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Zip Postal Code</p>
                        <p className="text-2xl font-black text-gray-900">{student.address?.pincode}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default StudentDetailsPage;
