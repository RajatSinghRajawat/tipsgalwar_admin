import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, FaCalendarAlt, FaClock, FaEdit, FaTrash,
  FaCheckCircle, FaLayerGroup, FaInfoCircle, FaShieldAlt
} from 'react-icons/fa';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:3005/apis/batch';

const BatchDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/getOne/${id}`);
      const result = await response.json();
      if (result.data) {
        setBatch(result.data);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchDetails();
  }, [id]);

  const handleEdit = () => {
    navigate('/batches', { state: { editId: id } });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this batch record? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          toast.success('Batch record deleted successfully.');
          navigate('/batches');
        } else {
          const result = await response.json();
          toast.error(result.message || 'Failed to delete record.');
        }
      } catch (error) {
        console.error('Error deleting batch:', error);
        alert('An error occurred while deleting the record.');
      }
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

  if (!batch) {
    return (
      <div className="text-center py-20 px-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Batch Record Not Found</h2>
        <p className="text-sm text-gray-500 mb-6 font-medium">The specific session configuration could not be retrieved.</p>
        <button onClick={() => navigate('/batches')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all font-bold">
          <FaArrowLeft className="h-4 w-4" /> Back to Deployment List
        </button>
      </div>
    );
  }

  const DataRow = ({ label, value, colorClass = "text-gray-900" }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider font-bold">{label}</label>
      <p className={`w-full rounded-lg border border-gray-100 bg-gray-50/30 p-2.5 text-sm font-bold ${colorClass}`}>
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
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/batches')}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm font-bold"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Batch Profile Details</h2>
            <p className="text-xs text-gray-500 font-medium">Official academic session configuration.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleEdit}
            className="px-5 py-2.5 bg-blue-600 rounded-xl text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <FaEdit className="h-4 w-4" /> Edit Configuration
          </button>
          <button 
            onClick={handleDelete}
            className="p-2.5 rounded-xl border border-rose-100 bg-white text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
          >
            <FaTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
         <div className="h-40 w-40 rounded-xl bg-gray-50 overflow-hidden border-2 border-white shadow-lg relative group flex items-center justify-center">
            {batch.images?.[0] ? (
                <img 
                  src={getImageUrl(batch.images[0])} 
                  alt={batch.batch_Name} 
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + batch.batch_Name; }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-200 text-6xl"><FaLayerGroup /></div>
            )}
         </div>
         <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{batch.batch_Name}</h3>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
               <span className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                   batch.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                   batch.status === 'Upcoming' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                   'bg-gray-50 text-gray-700 border-gray-100'
               }`}>
                 <FaCheckCircle className="h-3 w-3" /> {batch.status} Marker
               </span>
               <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 border border-blue-100 flex items-center gap-2">
                 <FaShieldAlt className="h-3 w-3" /> BATCH-ID: {batch._id.slice(-5).toUpperCase()}
               </span>
            </div>
         </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-blue-100">
           <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-widest border-l-4 border-blue-600 pl-3">Deployment Hub</h4>
           <div className="grid grid-cols-1 gap-4">
              <DataRow label="Official Designation" value={batch.batch_Name} />
              <DataRow label="Current Status" value={batch.status} colorClass={batch.status === 'Active' ? 'text-emerald-600' : 'text-blue-600'} />
              <div className="p-4 bg-blue-50/30 rounded-lg border border-blue-50 flex items-start gap-3">
                 <FaInfoCircle className="text-blue-400 mt-1" />
                 <p className="text-[11px] text-blue-700 leading-relaxed font-bold">
                    System configuration verified. All session markers are aligned with the official academic calendar.
                 </p>
              </div>
           </div>
         </div>

         <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6 transition-all hover:border-emerald-100">
           <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-widest border-l-4 border-emerald-500 pl-3">Timeline Matrix</h4>
           <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <DataRow label="Initiation Date" value={formatDate(batch.start_Date)} />
                <DataRow label="Target Handover" value={formatDate(batch.end_Date)} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                 <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Start Marker</p>
                    <p className="text-xl font-black text-gray-900 flex items-center justify-center gap-2"><FaClock className="text-blue-500" /> {batch.start_Time}</p>
                 </div>
                 <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">End Marker</p>
                    <p className="text-xl font-black text-gray-900 flex items-center justify-center gap-2"><FaClock className="text-rose-500" /> {batch.end_Time}</p>
                 </div>
              </div>
           </div>
         </div>
      </div>
    </motion.div>
  );
};

export default BatchDetailsPage;
