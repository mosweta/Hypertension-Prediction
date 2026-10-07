// src/components/DoctorDashboard.js
import React, { useState, useEffect } from 'react';
import PatientTable from './PatientTable';
import PatientPrediction from "./PatientPrediction";
import StatsCards from './StatsCards';
import "./nurseDashboard.css";
import PatientList from './patientList';
import PredictTable from './PredictTable';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctorName, setDoctorName] = useState(null)
    const [doctorName2, setDoctorName2] = useState(null)

  useEffect(() => {
    fetchPatients();
  }, [currentPage]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/patients?page=${currentPage}&limit=10`);
      const data = await response.json();
      setPatients(data.patients);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get("/me", {
          withCredentials: true
        });
        
        if (response.data.status === "success") {
          setDoctorName(response.data.user.fName);
          console.log("Doctor:", response.data.user.fName);
        }
      } catch (error) {
        console.error("Error fetching nurse data:", error);
      }
    };

    fetchCurrentUser();
  }, []);
    useEffect(() => {
    const fetchCurrentUserl = async () => {
      try {
        const response = await axios.get("/me", {
          withCredentials: true
        });
        
        if (response.data.status === "success") {
          setDoctorName2(response.data.user.lName);
          console.log("Nurse ID:", response.data.user.lName);
        }
      } catch (error) {
        console.error("Error fetching nurse data:", error);
      }
    };

    fetchCurrentUserl();
  }, []);
  const handlePredict = (patient) => {
    setSelectedPatient(patient);
    setShowPredictionModal(true);
  };
  const handleLogout = () => {
  axios.post('http://localhost:8081/logout', {}, { withCredentials: true })
    .then(() => {
      console.log('Logged out successfully');
      window.location.href = 'http://localhost:5173/login';
    })
    .catch(error => {
      console.error('Logout error:', error);
      // Still redirect to login
      window.location.href = '/login';
    });
};
  const handleApprovePrediction = async (predictionData) => {
    try {
      const response = await fetch('http://localhost:5000/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionData),
      });

      if (response.ok) {
        alert('Prediction approved and saved successfully!');
        setShowPredictionModal(false);
        setSelectedPatient(null);
        fetchPatients(); // Refresh data
      } else {
        throw new Error('Failed to save prediction');
      }
    } catch (error) {
      console.error('Error saving prediction:', error);
      alert('Error saving prediction. Please try again.');
    }
  };

  return (
    
    <div className="nurse-dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">
          <i className="fas fa-user-nurse"></i>
          <h1>Shinikizua</h1>
        </div>
        <ul className="nav-links">
          <li>
            <a 
              href="#dashboard" 
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a 
              href="#patients" 
              className={activeTab === 'patients' ? 'active' : ''}
              onClick={() => setActiveTab('patients')}
            >
              <i className="fas fa-user-injured"></i>
              <span>Patients</span>
            </a>
          </li>
          {/* <li>
            <a 
              href="#medications" 
              className={activeTab === 'medications' ? 'active' : ''}
              onClick={() => setActiveTab('medications')}
            >
              <i className="fas fa-pills"></i>
              <span>Medications</span>
            </a>
          </li> */}
          {/* <li>
            <a 
              href="#tasks" 
              className={activeTab === 'tasks' ? 'active' : ''}
              onClick={() => setActiveTab('tasks')}
            >
              <i className="fas fa-tasks"></i>
              <span>Tasks</span>
            </a>
          </li> */}
           <li>
            <a href="#predictions" className={activeTab === 'predictions' ? 'active' : ''}
               onClick={() => setActiveTab('predictions')}>
              <i className="fas fa-procedures"></i>
              <span>Predictions</span>
            </a>
          </li>
          {/* <li>
            <a href="#vitals" className={activeTab === 'vitals' ? 'active' : ''}
               onClick={() => setActiveTab('vitals')}>
              <i className="fas fa-heartbeat"></i>
              <span>Triage</span>
            </a>
          </li> */}
           <li>
            <a 
              href="#logout" 
              className={activeTab === 'patients' ? 'active' : ''}
              onClick={() => handleLogout()}
            >
              <i className="fas fa-right-to-bracket"></i> 
              <span>Logout</span>
            </a>
          </li>
        </ul>
      </div>

      
      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="welcome-section">
            <h2>Welcome, {doctorName} {doctorName2} 👋 </h2>
            <p>Ready to make your day productive?</p>
          </div>
          <div className="user-info">
            <div className="user-avatar">
              <i className="fas fa-user-nurse"></i>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'dashboard' && (
            <div className="overview-tab">
              <div className="card">
                <div className="card-header">
                  <h3>Pending Predictions</h3>
                </div>
                {/* PatientList now handles its own data fetching */}
                <PredictTable compact={false} showActions={true} />
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="patients-tab">
              {/* Full patient list - self-contained */}
              <PatientTable compact={false} showActions={true} />
            </div>
          )}

          {activeTab === 'vitals' && (
            <div className="vitals-tab">
              <div className="card">
                <div className="card-header">
                  <h3>Triage Data</h3>
                </div>
                <div className="card-body">
                  
                </div>
              </div>
            </div>
          )}
           {activeTab === 'predictions' && (
            <div className="vitals-tab">
              <div className="card">
                <div className="card-header">
                  <h3>All Predictions</h3>
                </div>
                <div className="card-body">
                  
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
   
  );
};

export default DoctorDashboard;