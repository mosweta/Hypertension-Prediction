// src/components/nurse/VitalSignsModal.js
import React, { useState } from 'react';

const VitalSignsModal = ({ patient, onClose, onSave }) => {
  const [vitalSigns, setVitalSigns] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    blood_sugar: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(vitalSigns);
  };

  const handleChange = (field, value) => {
    setVitalSigns(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content vital-signs-modal">
        <div className="modal-header">
          <h3>Record Vital Signs - {patient?.name}</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="vital-signs-grid">
              <div className="form-group">
                <label>Blood Pressure (Systolic)</label>
                <input
                  type="number"
                  className="form-control"
                  value={vitalSigns.blood_pressure_systolic}
                  onChange={(e) => handleChange('blood_pressure_systolic', e.target.value)}
                  placeholder="120"
                />
              </div>
              
              <div className="form-group">
                <label>Blood Pressure (Diastolic)</label>
                <input
                  type="number"
                  className="form-control"
                  value={vitalSigns.blood_pressure_diastolic}
                  onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value)}
                  placeholder="80"
                />
              </div>
              
              <div className="form-group">
                <label>Heart Rate (BPM)</label>
                <input
                  type="number"
                  className="form-control"
                  value={vitalSigns.heart_rate}
                  onChange={(e) => handleChange('heart_rate', e.target.value)}
                  placeholder="72"
                />
              </div>
              
              <div className="form-group">
                <label>Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={vitalSigns.temperature}
                  onChange={(e) => handleChange('temperature', e.target.value)}
                  placeholder="36.6"
                />
              </div>
              
              <div className="form-group">
                <label>Respiratory Rate</label>
                <input
                  type="number"
                  className="form-control"
                  value={vitalSigns.respiratory_rate}
                  onChange={(e) => handleChange('respiratory_rate', e.target.value)}
                  placeholder="16"
                />
              </div>
              
              <div className="form-group">
                <label>O₂ Saturation (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={vitalSigns.oxygen_saturation}
                  onChange={(e) => handleChange('oxygen_saturation', e.target.value)}
                  placeholder="98"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Blood Sugar (mg/dL)</label>
              <input
                type="number"
                className="form-control"
                value={vitalSigns.blood_sugar}
                onChange={(e) => handleChange('blood_sugar', e.target.value)}
                placeholder="100"
              />
            </div>
            
            <div className="form-group">
              <label>Clinical Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={vitalSigns.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any observations or concerns..."
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Vital Signs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VitalSignsModal;