// src/components/nurse/InPatientManagement.js
import React, { useState, useEffect } from 'react';
import AdmitPatientModal from './AdmitPatientModal';

const InPatientManagement = () => {
  const [inPatients, setInPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  useEffect(() => {
    fetchInPatients();
  }, []);

  const fetchInPatients = async () => {
    try {
      const response = await fetch('/inpatient');
      const data = await response.json();
      setInPatients(data.patients);
    } catch (error) {
      console.error('Error fetching in-patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async (inpatientId) => {
    if (window.confirm('Are you sure you want to discharge this patient?')) {
      try {
        const response = await fetch(`/inpatient/${inpatientId}/discharge`, {
          method: 'POST'
        });
        
        if (response.ok) {
          alert('Patient discharged successfully');
          fetchInPatients();
        }
      } catch (error) {
        console.error('Error discharging patient:', error);
        alert('Error discharging patient');
      }
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'critical': return '#dc2626';
      case 'serious': return '#ea580c';
      case 'stable': return '#16a34a';
      case 'improving': return '#0d9488';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className="loading">Loading in-patients...</div>;
  }

  return (
    <div className="inpatient-management">
      <div className="page-header">
        <h2>In-Patient Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAdmitModal(true)}
        >
          <i className="fas fa-plus"></i> Admit Patient
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Current In-Patients ({inPatients.length})</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Room/Bed</th>
                <th>Admission Date</th>
                <th>Diagnosis</th>
                <th>Condition</th>
                <th>Attending Doctor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inPatients.map(patient => (
                <tr key={patient.inpatient_id}>
                  <td>#{patient.user_id}</td>
                  <td>
                    <div className="patient-info">
                      <strong>{patient.patient_name}</strong>
                      <div className="patient-meta">
                        {patient.emailAddress} • {patient.PhoneNumber}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="room-badge">
                      {patient.room_number} 
                      {patient.bed_number && ` / ${patient.bed_number}`}
                    </span>
                  </td>
                  <td>
                    {new Date(patient.admission_date).toLocaleDateString()}
                  </td>
                  <td>
                    <span className="diagnosis" title={patient.primary_diagnosis}>
                      {patient.primary_diagnosis?.substring(0, 30)}
                      {patient.primary_diagnosis?.length > 30 && '...'}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="condition-badge"
                      style={{ 
                        backgroundColor: getConditionColor(patient.current_condition),
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {patient.current_condition}
                    </span>
                  </td>
                  <td>{patient.doctor_name || 'Not assigned'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-primary">
                        <i className="fas fa-heartbeat"></i> Vitals
                      </button>
                      <button className="btn btn-sm btn-outline">
                        <i className="fas fa-edit"></i> Update
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDischarge(patient.inpatient_id)}
                      >
                        <i className="fas fa-sign-out-alt"></i> Discharge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdmitModal && (
        <AdmitPatientModal
          onClose={() => setShowAdmitModal(false)}
          onAdmit={fetchInPatients}
        />
      )}
    </div>
  );
};

export default InPatientManagement;