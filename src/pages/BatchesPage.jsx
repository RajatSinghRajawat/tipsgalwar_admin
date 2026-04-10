import React, { useState, useEffect } from "react";
import { Search, Plus, Calendar, Clock, CheckCircle, XCircle, Loader, Trash2, Edit, RefreshCw, Eye, Image as ImageIcon, X, Upload, Info, AlertCircle } from "lucide-react";

function Batches() {
  const [showModal, setShowModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBatch, setEditingBatch] = useState(null);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  const [form, setForm] = useState({
    batch_Name: "",
    start_Date: "",
    end_Date: "",
    start_Time: "",
    end_Time: "",
    status: "",
  });

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // API endpoint
  const API = "http://localhost:3005/apis/batch";

  // 🔹 GET ALL BATCHES
  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/get`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Fetched batches:", data);
      setBatches(data.data || []);
    } catch (err) {
      console.error("Error fetching batches:", err);
      setError("Failed to fetch batches. Please check your connection.");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const validateForm = () => {
    const errors = {};
    if (!form.batch_Name.trim()) {
      errors.batch_Name = "Batch name is required";
    }
    if (form.start_Date && form.end_Date && new Date(form.start_Date) > new Date(form.end_Date)) {
      errors.end_Date = "End date must be after start date";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: "" });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      if (!selectedFile.type.startsWith('image/')) {
        alert("Please upload an image file");
        return;
      }
      setFile(selectedFile);
      const preview = URL.createObjectURL(selectedFile);
      setPreviewUrl(preview);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      if (droppedFile.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      setFile(droppedFile);
      const preview = URL.createObjectURL(droppedFile);
      setPreviewUrl(preview);
    } else {
      alert("Please drop an image file");
    }
  };

  const resetForm = () => {
    setForm({
      batch_Name: "",
      start_Date: "",
      end_Date: "",
      start_Time: "",
      end_Time: "",
      status: "",
    });
    setFile(null);
    setPreviewUrl(null);
    setEditingBatch(null);
    setError(null);
    setFormErrors({});
  };

  // 🔹 ADD/UPDATE BATCH
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const formdata = new FormData();
    
    Object.keys(form).forEach((key) => {
      if (form[key]) {
        formdata.append(key, form[key]);
      }
    });

    if (file) {
      formdata.append("images", file);
    }

    try {
      const url = editingBatch 
        ? `${API}/update/${editingBatch._id}` 
        : `${API}/add`;
      const method = editingBatch ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        body: formdata,
      });

      if (res.ok) {
        const result = await res.json();
        
        const message = editingBatch ? "Batch Updated Successfully!" : "Batch Added Successfully!";
        setSuccessMessage(message);
        console.log("Response:", result);
        
        setShowModal(false);
        resetForm();
        await fetchBatches();
        
      } else {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        alert(`Error: ${res.status} - ${res.statusText || errorText}`);
      }
    } catch (error) {
      console.error("Error saving batch:", error);
      alert("Error saving batch. Please check your connection.");
    }
  };

  // 🔹 EDIT BATCH
  const handleEdit = async (batch) => {
    setEditingBatch(batch);
    setForm({
      batch_Name: batch.batch_Name || "",
      start_Date: batch.start_Date ? batch.start_Date.split('T')[0] : "",
      end_Date: batch.end_Date ? batch.end_Date.split('T')[0] : "",
      start_Time: batch.start_Time || "",
      end_Time: batch.end_Time || "",
      status: batch.status || "",
    });
    
    setPreviewUrl(null);
    setFile(null);
    setShowModal(true);
  };

  // 🔹 DELETE BATCH
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this batch?")) {
      try {
        const res = await fetch(`${API}/delete/${id}`, {
          method: "DELETE",
        });
        
        if (res.ok) {
          const result = await res.json();
          setSuccessMessage("Batch Deleted Successfully!");
          console.log("Delete response:", result);
          await fetchBatches();
          setShowDetailsModal(false);
        } else {
          const errorText = await res.text();
          alert(`Error deleting batch: ${errorText}`);
        }
      } catch (error) {
        console.error("Error deleting batch:", error);
        alert("Error deleting batch. Please check your connection.");
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return "Invalid Date";
    }
  };

  // FIXED: Corrected getImageUrl function
  const getImageUrl = (imageName) => {
    if (!imageName) return null;
    
    if (typeof imageName === 'string') {
      const cleanImageName = imageName.split('/').pop();
      return `${API}/images/${cleanImageName}`;
    }
    
    if (typeof imageName === 'object') {
      const imagePath = imageName?.path || imageName?.filename || imageName?.url;
      if (imagePath && typeof imagePath === 'string') {
        const cleanImageName = imagePath.split('/').pop();
        return `${API}/images/${cleanImageName}`;
      }
    }
    
    if (Array.isArray(imageName) && imageName.length > 0) {
      return getImageUrl(imageName[0]);
    }
    
    return null;
  };

  const handleImageError = (batchId) => {
    setImageError(prev => ({ ...prev, [batchId]: true }));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Active": { color: "green", icon: CheckCircle, text: "Active", bgClass: "bg-green-100", textClass: "text-green-800" },
      "Inactive": { color: "red", icon: XCircle, text: "Inactive", bgClass: "bg-red-100", textClass: "text-red-800" },
      "Completed": { color: "blue", icon: CheckCircle, text: "Completed", bgClass: "bg-blue-100", textClass: "text-blue-800" },
      "Upcoming": { color: "yellow", icon: Calendar, text: "Upcoming", bgClass: "bg-yellow-100", textClass: "text-yellow-800" }
    };
    
    const config = statusMap[status] || statusMap["Inactive"];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
        <Icon size={12} />
        {config.text}
      </span>
    );
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return "N/A";
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  const filteredBatches = batches.filter(batch =>
    batch.batch_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Success Message Popup */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50" style={{
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Batches Management
            </h1>
            <p className="text-gray-500 mt-1">Click on any batch to view details</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80 bg-white shadow-sm"
              />
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Plus size={18} />
              Add Batch
            </button>

            <button
              onClick={fetchBatches}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              title="Refresh"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
          <button 
            onClick={fetchBatches}
            className="ml-4 text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Batches</p>
              <p className="text-3xl font-bold text-gray-800">{batches.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Batches</p>
              <p className="text-3xl font-bold text-green-600">
                {batches.filter(b => b.status === "Active").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Inactive Batches</p>
              <p className="text-3xl font-bold text-red-600">
                {batches.filter(b => b.status === "Inactive").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-3xl font-bold text-purple-600">
                {batches.filter(b => b.status === "Completed").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin text-blue-600" size={48} />
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">No batches found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or add a new batch</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Add Your First Batch
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">S.No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Batch Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Start Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBatches.map((batch, index) => (
                  <tr 
                    key={batch._id} 
                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => {
                      setSelectedBatch(batch);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const imageUrl = getImageUrl(batch.images);
                          const hasImageError = imageError[batch._id];
                          return imageUrl && !hasImageError ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <img
                                src={imageUrl}
                                alt={batch.batch_Name}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(batch._id)}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <ImageIcon size={14} className="text-gray-400" />
                            </div>
                          );
                        })()}
                        <p className="font-medium text-gray-900">{batch.batch_Name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(batch.start_Date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(batch.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit Batch */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => {
            setShowModal(false);
            resetForm();
          }} />
          
          <div className="relative w-full h-full flex flex-col bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex-shrink-0 shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {editingBatch ? "Edit Batch" : "Create New Batch"}
                  </h2>
                  <p className="text-blue-100 text-base mt-1">
                    {editingBatch ? "Update batch information" : "Fill in the details to add a new batch"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white/20"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="max-w-7xl mx-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Batch Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          name="batch_Name"
                          value={form.batch_Name}
                          onChange={handleChange}
                          placeholder="e.g., Web Development Batch 2024"
                          className={`w-full border ${formErrors.batch_Name ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white`}
                        />
                        {formErrors.batch_Name && (
                          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {formErrors.batch_Name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Start Date
                        </label>
                        <div className="relative">
                          <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="date"
                            name="start_Date"
                            value={form.start_Date}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-10 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          End Date
                        </label>
                        <div className="relative">
                          <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="date"
                            name="end_Date"
                            value={form.end_Date}
                            onChange={handleChange}
                            className={`w-full border ${formErrors.end_Date ? 'border-red-500' : 'border-gray-300'} rounded-xl px-10 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white`}
                          />
                          {formErrors.end_Date && (
                            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                              <AlertCircle size={14} />
                              {formErrors.end_Date}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Start Time
                        </label>
                        <div className="relative">
                          <Clock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="time"
                            name="start_Time"
                            value={form.start_Time}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-10 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          End Time
                        </label>
                        <div className="relative">
                          <Clock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="time"
                            name="end_Time"
                            value={form.end_Time}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-10 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Completed">Completed</option>
                        <option value="Upcoming">Upcoming</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Batch Image
                    </label>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-8 transition-all min-h-[400px] flex flex-col items-center justify-center ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-400 bg-white'
                      }`}
                    >
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {!previewUrl ? (
                        <div className="text-center">
                          <Upload size={64} className="mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 text-lg font-medium mb-2">Drag & drop an image here</p>
                          <p className="text-gray-400 text-base">or click to select</p>
                          <p className="text-gray-400 text-sm mt-4">PNG, JPG, GIF up to 5MB</p>
                          {editingBatch && editingBatch.images && !file && (
                            <p className="text-blue-600 text-base mt-4 flex items-center justify-center gap-2">
                              <Info size={18} />
                              Current image will be kept if you don't select a new one
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="relative w-full">
                          <div className="rounded-lg overflow-hidden">
                            <img 
                              src={previewUrl} 
                              alt="Preview" 
                              className="w-full h-80 object-contain"
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                              setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X size={20} />
                          </button>
                          <p className="text-green-600 text-sm mt-3 text-center truncate">
                            {file?.name} ({(file?.size / 1024).toFixed(1)} KB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Info size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-base text-blue-800 font-medium">Important Information</p>
                      <p className="text-sm text-blue-600 mt-1">
                        All fields marked with <span className="text-red-500 font-medium">*</span> are required. 
                        You can update the batch image later by editing the batch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-t border-gray-200 px-8 py-5 flex justify-end gap-4 flex-shrink-0 shadow-lg">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all font-medium text-gray-700 text-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2 text-lg"
              >
                {editingBatch ? (
                  <>
                    <Edit size={20} />
                    Update Batch
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Create Batch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {showDetailsModal && selectedBatch && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)} />
          <div className="bg-white rounded-2xl w-[550px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl sticky top-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Batch Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {(() => {
                const imageUrl = getImageUrl(selectedBatch.images);
                const hasImageError = imageError[selectedBatch._id];
                return imageUrl && !hasImageError ? (
                  <div className="mb-6 rounded-xl overflow-hidden h-56 bg-gray-100">
                    <img
                      src={imageUrl}
                      alt={selectedBatch.batch_Name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(selectedBatch._id)}
                    />
                  </div>
                ) : (
                  <div className="mb-6 rounded-xl overflow-hidden h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon size={48} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No Image Available</p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Batch Name</label>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{selectedBatch.batch_Name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-gray-100 pb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Start Date</label>
                    <p className="text-gray-800 mt-1 flex items-center gap-2">
                      <Calendar size={14} className="text-blue-500" />
                      {formatDate(selectedBatch.start_Date)}
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">End Date</label>
                    <p className="text-gray-800 mt-1 flex items-center gap-2">
                      <Calendar size={14} className="text-blue-500" />
                      {formatDate(selectedBatch.end_Date)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-gray-100 pb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Start Time</label>
                    <p className="text-gray-800 mt-1 flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      {selectedBatch.start_Time || "N/A"}
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">End Time</label>
                    <p className="text-gray-800 mt-1 flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      {selectedBatch.end_Time || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-gray-100 pb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Duration</label>
                    <p className="text-gray-800 mt-1 font-medium">
                      {calculateDuration(selectedBatch.start_Date, selectedBatch.end_Date)}
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedBatch.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedBatch);
                }}
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all font-medium shadow-md flex items-center gap-2"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(selectedBatch._id)}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium shadow-md flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Batches;