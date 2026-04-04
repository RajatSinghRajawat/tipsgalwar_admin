import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaUniversity, FaWallet, FaCalendarAlt, FaBuilding, FaEdit, FaTrash,
  FaArrowRight, FaPrint, FaDownload, FaBriefcase, FaCreditCard,
  FaClock, FaShieldAlt, FaCheckCircle, FaGlobe, FaUniversity as FaBank
} from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:3005/apis/employee';

const EmployeeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/getOne/${id}`);
      const result = await response.json();
      if (result.data) {
        setEmployee(result.data);
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  const handleEdit = () => {
    // Navigate to Employees list with the current ID in state to trigger edit mode
    navigate('/employees', { state: { editId: id } });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this employee record? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          alert('Employee record deleted successfully.');
          navigate('/employees');
        } else {
          const result = await response.json();
          alert(result.message || 'Failed to delete record.');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('An error occurred while deleting the record.');
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

  // Helper to generate correct Image URLs (Handles old paths and new filenames)
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return null;
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) return imagePath;

    // Clean the path (remove public/Uploads prefixes)
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

  if (!employee) {
    return (
      <div className="text-center py-20 px-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Record Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The employee you are looking for does not exist in our systems.</p>
        <button onClick={() => navigate('/employees')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all">
          <FaArrowLeft className="h-4 w-4" /> Back to List
        </button>
      </div>
    );
  }

  // Consistent with EmployeesPage format
  const DataRow = ({ label, value, colorClass = "text-gray-900" }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">{label}</label>
      <p className={`w-full rounded-lg border border-gray-100 bg-gray-50/30 p-2.5 text-sm font-semibold ${colorClass}`}>
        {value || 'N/A'}
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-12 space-y-6"
    >
      {/* Header aligned with EmployeesPage Form Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employee Profile</h2>
            <p className="text-xs text-gray-500">Official identification and employment record.</p>
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

      {/* Top Profile Summary Card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
         <div className="h-32 w-32 rounded-xl bg-gray-50 overflow-hidden border-2 border-white shadow-lg relative group">
            {employee.images?.[0] ? (
                <img 
                  src={getImageUrl(employee.images[0])} 
                  alt={employee.name} 
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + employee.name; }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-200 text-5xl"><FaUser /></div>
            )}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
         </div>
         <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{employee.name}</h3>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
               <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 flex items-center gap-2">
                 <FaBriefcase className="h-3 w-3" /> {employee.department}
               </span>
               <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 flex items-center gap-2">
                 <FaCheckCircle className="h-3 w-3" /> Active Official
               </span>
               <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 flex items-center gap-2">
                 <FaShieldAlt className="h-3 w-3" /> ID: TG-{employee._id.slice(-5).toUpperCase()}
               </span>
            </div>
         </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Personal Details Card */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
           <h4 className="font-bold text-gray-900 text-sm border-l-4 border-blue-600 pl-3">Personal & Contact</h4>
           <div className="grid grid-cols-1 gap-4">
              <DataRow label="Full Name" value={employee.name} />
              <DataRow label="Email Address" value={employee.email} />
              <div className="grid grid-cols-2 gap-4">
                <DataRow label="Direct Mobile" value={employee.mobile_Number} />
                <DataRow label="Emergency Contact" value={employee.emergency_Contact} colorClass="text-rose-600" />
              </div>
              <DataRow label="Date of Birth" value={formatDate(employee.dob)} />
           </div>
         </div>

         {/* Office Details Card */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
           <h4 className="font-bold text-gray-900 text-sm border-l-4 border-emerald-500 pl-3">Employment Profile</h4>
           <div className="grid grid-cols-1 gap-4">
              <DataRow label="Current Department" value={employee.department} />
              <DataRow label="Joining Date" value={formatDate(employee.join_Date)} />
              <DataRow label="Qualification" value={employee.qualification} colorClass="text-blue-600" />
              <DataRow label="Institute Name" value={employee.institute} />
           </div>
         </div>

         {/* Financial Details Card */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
           <h4 className="font-bold text-gray-900 text-sm border-l-4 border-indigo-500 pl-3">Fiscal & Bank Details</h4>
           <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Base Monthly Salary</label>
                <p className="w-full rounded-lg border border-gray-100 bg-emerald-50 p-2.5 text-xl font-black text-emerald-700">
                  ₹{parseFloat(employee.salary || 0).toLocaleString()}
                </p>
              </div>
              <DataRow label="Bank Holder Name" value={employee.bank_Holder_Name} />
              <DataRow label="Bank Name" value={employee.bank_Name} />
              <div className="grid grid-cols-2 gap-4">
                <DataRow label="Account Number" value={employee.account_Number} />
                <DataRow label="IFSC Code" value={employee.ifsc_Code} />
              </div>
           </div>
         </div>

         {/* Location Card */}
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
           <h4 className="font-bold text-gray-900 text-sm border-l-4 border-amber-500 pl-3">Residence & Schedule</h4>
           <div className="grid grid-cols-1 gap-4">
              <DataRow label="Street / Locality" value={employee.address?.street} />
              <div className="grid grid-cols-2 gap-4">
                <DataRow label="City" value={employee.address?.city} />
                <DataRow label="State / PIN" value={`${employee.address?.state} - ${employee.address?.pincode}`} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                 <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Shift Start</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1"><FaClock className="text-blue-500 h-3 w-3" /> {employee.start_Time}</p>
                 </div>
                 <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Shift End</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1"><FaClock className="text-rose-500 h-3 w-3" /> {employee.end_Time}</p>
                 </div>
              </div>
           </div>
         </div>
      </div>
    </motion.div>
  );
};

export default EmployeeDetailsPage;
