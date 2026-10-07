// src/components/nurse/AdmitPatientModal.js
import React, { useState, useEffect } from 'react';

const AdmitPatientModal = ({ onClose, onAdmit }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    room_number: '',
    bed_number: '',
    primary_diagnosis: '',
    attending_physician_id: '',
    current_condition: 'stable',
    special_instructions: ''
  });
  const [availablePatients, setAvailablePatients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailablePatients();
  }, []);

  const fetchAvailablePatients = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inpatient/available-patients');
      const data = await response.json();
      setAvailablePatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching available patients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/inpatient/admit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Patient admitted successfully!');
        onAdmit();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to admit patient');
      }
    } catch (error) {
      console.error('Error admitting patient:', error);
      alert('Error admitting patient');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Admit Patient</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Select Patient *</label>
              <select
                className="form-control"
                value={formData.user_id}
                onChange={(e) => handleChange('user_id', e.target.value)}
                required
              >
                <option value="">Choose a patient...</option>
                {availablePatients.map(patient => (
                  <option key={patient.userId} value={patient.userId}>
                    {patient.name} - {patient.emailAddress}
                  </option>
                ))}
              </select>
              {availablePatients.length === 0 && (
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  No available patients found. All patients may already be admitted.
                </p>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.room_number}
                  onChange={(e) => handleChange('room_number', e.target.value)}
                  required
                  placeholder="e.g., 201A"
                />
              </div>
              
              <div className="form-group">
                <label>Bed Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.bed_number}
                  onChange={(e) => handleChange('bed_number', e.target.value)}
                  placeholder="e.g., Bed 1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Primary Diagnosis *</label>
              <input
                type="text"
                className="form-control"
                value={formData.primary_diagnosis}
                onChange={(e) => handleChange('primary_diagnosis', e.target.value)}
                required
                placeholder="e.g., Hypertension, Diabetes, etc."
              />
            </div>

            <div className="form-group">
              <label>Current Condition</label>
              <select
                className="form-control"
                value={formData.current_condition}
                onChange={(e) => handleChange('current_condition', e.target.value)}
              >
                <option value="stable">Stable</option>
                <option value="improving">Improving</option>
                <option value="serious">Serious</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label>Special Instructions</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.special_instructions}
                onChange={(e) => handleChange('special_instructions', e.target.value)}
                placeholder="Any special care instructions..."
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Admitting...' : 'Admit Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdmitPatientModal;