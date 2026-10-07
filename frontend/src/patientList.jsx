// src/components/nurse/PatientList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

const PatientList = ({ compact = false, showActions = true }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Add this hook

  // Debug: log what we're receiving
  console.log('PatientList state:', { 
    patientsCount: patients?.length, 
    loading, 
    compact,
    error
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      console.log('🟡 PatientList fetching patients...');
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/viewPatients');
      console.log('🟢 PatientList API response:', response.data);
      
      setPatients(response.data.patients || []);
      
    } catch (error) {
      console.error('🔴 PatientList error:', error);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function at the top of your component
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === 'Invalid Date') {
      return 'Not provided';
    }
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Not provided' : date.toLocaleDateString();
    } catch (error) {
      return 'Not provided';
    }
  };

  const handleVitalSigns = (patient) => {
    console.log('Record VS for patient:', patient.userId);
    // You can open a modal or navigate to vital signs page
    alert(`Record Vital Signs for ${patient.fName} ${patient.lName}`);
  };

  const handleHealthPrediction = (patient) => {
    console.log('Record HP for patient:', patient.userId);
    // Navigate to HypertensionPredictor and pass patient data
    navigate('/test', { 
      state: { 
        patient: patient 
      } 
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading patients...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Unable to Load Patients</h3>
          <p>{error}</p>
          <button onClick={fetchPatients} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Check if patients is empty or undefined
  if (!patients || patients.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <h3>No patients found</h3>
        <p>There are currently no patients in the system.</p>
        <button onClick={fetchPatients} className="btn btn-outline">
          Refresh
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="patient-list compact">
        {patients.slice(0, 5).map(patient => (
          <div key={patient.userId} className="patient-card compact">
            <div className="patient-info">
              <h4>{patient.fName} {patient.lName}</h4>
              <p><strong>Gender:</strong> {patient.Gender || 'Not specified'}</p>
              <p><strong>DOB:</strong> {formatDate(patient.DateOfBirth)}</p>
              <p><strong>Email:</strong> {patient.emailAddress}</p>
            </div>
            {showActions && (
              <div className="patient-actions">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleHealthPrediction(patient)}
                >
                  <i className="fas fa-brain"></i> Record(HP)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Patient List ({patients.length} patients)</h3>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-outline" onClick={fetchPatients}>
            <i className="fas fa-refresh"></i> Refresh
          </button>
          <button className="btn btn-outline">
            <i className="fas fa-filter"></i> Filter
          </button>
          <button className="btn btn-outline">
            <i className="fas fa-sort"></i> Sort
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>Email</th>
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {patients.map(patient => (
              <tr key={patient.userId}>
                <td>#{patient.userId}</td>
                <td>
                  <div className="patient-name">
                    <strong>{patient.fName}</strong>
                  </div>
                </td>
                <td>
                  <strong>{patient.lName}</strong>
                </td>
                <td>{patient.Gender || 'Not specified'}</td>
                <td>{formatDate(patient.DateOfBirth)}</td>
                <td>{patient.emailAddress}</td>
                {showActions && (
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleHealthPrediction(patient)}
                      >
                        <i className="fas fa-brain"></i> Record
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientList;