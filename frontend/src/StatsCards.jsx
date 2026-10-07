// src/components/StatsCards.js
import React, { useState, useEffect } from 'react';
import "./DoctorDashboard.css";
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

const StatsCards = () => {
  const [stats, setStats] = useState({
    total_patients: 0,
    total_predictions: 0,
    pendingReview: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/stats');
      setStats(response.data);
    } catch (error) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('API Error:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Unable to Load Dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchStats} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon patients">
          <i className="fas fa-user-injured"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.total_patients}</h3>
          <p>Total Patients</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon predictions">
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.total_predictions}</h3>
          <p>Total Predictions</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon pending">
          <i className="fas fa-clock"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.pendingReview}</h3>
          <p>Pending Reviews</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;