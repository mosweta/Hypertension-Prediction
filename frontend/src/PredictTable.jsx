// src/components/nurse/PatientList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

const PredictTable = ({ compact = false, showActions = true }) => {
  const [triagedata, setTriageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictLoading, setPredictLoading] = useState(null); // Track which prediction is loading
  const navigate = useNavigate();
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchTriageData();
  }, []);

  const fetchTriageData = async () => {
    try {
      console.log('🟡 TriageDataList fetching triage data...');
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/viewTriageData');
      console.log('🟢 TriageDataList API response:', response.data);
      
      setTriageData(response.data.triagedata || []);
      
    } catch (error) {
      console.error('🔴 TriageDataList error:', error);
      setError('Failed to load the pending predictions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHealthPrediction = async (triageItem) => {
  if (!triageItem) {
    console.error('No triage data provided');
    return;
  }

  console.log('🟡 Starting prediction for triage ID:', triageItem.triageId);
  setPredictLoading(triageItem.triageId);

  try {
    const predictionData = {
      RIAGENDR: parseInt(triageItem.RIAGENDR),
      is_male: triageItem.RIAGENDR === 1 ? 1 : 0,
      RIDAGEYR: parseInt(triageItem.RIDAGEYR),
      DMDEDUC2: parseInt(triageItem.DMDEDUC2),
      INDFMPIR: parseFloat(triageItem.INDFMPIR),
      BMXWT: parseFloat(triageItem.BMXWT),
      BMXHT: parseFloat(triageItem.BMXHT),
      BMXWAIST: parseFloat(triageItem.BMXWAIST),
      BMI: parseFloat(triageItem.BMI),
      DRQSPREP: parseInt(triageItem.DRQSPREP),
      salt_frequency_ordinal: parseInt(triageItem.DBD100 || triageItem.salt_frequency_ordinal || 3),
      active: parseInt(triageItem.active),
      //has_diabetes: parseInt(triageItem.has_diabetes)
    };

    console.log('📤 Sending prediction data:', predictionData);

    const response = await axios.post("/api/predict", predictionData, { 
      withCredentials: true,
      timeout: 30000 
    });
    
    console.log('✅ Response received:', response.data);
    console.log('🔍 Response keys:', Object.keys(response.data));
    
    // ✅ EMERGENCY FIX: If we have probability data, assume success
    // The Flask API is working perfectly, so let's use the data directly
    if (response.data && response.data.probability !== undefined) {
      console.log('🎯 Prediction data received! Navigating to results...');
      
      navigate("/patient-prediction", { 
        state: { 
          predictionResult: response.data, // This contains all the prediction data
          triageData: triageItem,
          patientId: triageItem.patientId
        } 
      });
    } else if (response.data.status === "success") {
      console.log('🎯 Success status found! Navigating to results...');
      
      navigate("/patient-prediction", { 
        state: { 
          predictionResult: response.data,
          triageData: triageItem,
          patientId: triageItem.patientId
        } 
      });
    } else {
      console.error('❌ No prediction data found in response');
      alert('Prediction failed: No valid response data received');
    }
    
  } catch (err) {
    console.error("❌ Prediction error:", err);
    console.error("❌ Error response:", err.response?.data);
    alert(err.response?.data?.error || "Failed to make prediction. Please try again.");
  } finally {
    setPredictLoading(null);
  }
};


  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading triage data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Unable to Load pending predictions</h3>
          <p>{error}</p>
          <button onClick={fetchTriageData} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!triagedata || triagedata.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <h3>No predictions are pending ✅</h3>
        <p>You are good to go😁.</p>
        {/* <button onClick={fetchTriageData} className="btn btn-outline">
          Refresh
        </button> */}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="patient-list compact">
        {triagedata.slice(0, 5).map(triageItem => (
          <div key={triageItem.triageId} className="patient-card compact">
            <div className="patient-info">
              <h4>Triage #{triageItem.triageId} - Patient #{triageItem.patientId}</h4>
              <p>Nurse: {triageItem.nurseId} | Age: {triageItem.RIDAGEYR}</p>
            </div>
            {showActions && (
              <div className="patient-actions">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleHealthPrediction(triageItem)}
                  disabled={predictLoading === triageItem.triageId}
                >
                  {predictLoading === triageItem.triageId ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Predicting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-brain"></i> Predict HP
                    </>
                  )}
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
        <h3>Triage Data List ({triagedata.length} records)</h3>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-outline" onClick={fetchTriageData}>
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
              <th>Triage ID</th>
              <th>Nurse ID</th>
              <th>Patient ID</th>
              <th>Gender</th>
              <th>Age</th>
              <th>BMI</th>
              {/* <th>Diabetes</th> */}
              <th>Reviewed</th>
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {triagedata.map(triageItem => (
              <tr key={triageItem.triageId}>
                <td>#{triageItem.triageId}</td>
                <td>{triageItem.nurseId}</td>
                <td>#{triageItem.patientId}</td>
                <td>{triageItem.RIAGENDR === 1 ? 'Male' : 'Female'}</td>
                <td>{triageItem.RIDAGEYR}</td>
                <td>{triageItem.BMI ? parseFloat(triageItem.BMI).toFixed(1) : 'N/A'}</td>
                {/* <td>{triageItem.has_diabetes === 1 ? 'Yes' : 'No'}</td> */}
                <td>
                  <span className={`status ${triageItem.reviewed ? 'status-active' : 'status-inactive'}`}>
                    {triageItem.reviewed ? 'Yes' : 'No'}
                  </span>
                </td>
                {showActions && (
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleHealthPrediction(triageItem)}
                        disabled={predictLoading === triageItem.triageId}
                      >
                        {predictLoading === triageItem.triageId ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Predicting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-brain"></i> Predict
                          </>
                        )}
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

export default PredictTable;