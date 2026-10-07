// src/components/DetailedPatientStats.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

const DetailedPatientStats = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = axios.get('/patients/stats', { withCredentials: true });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching patient stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="loading">Loading statistics...</div>;

  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon total">
          <i className="fas fa-users"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.total_patients}</h3>
          <p>Total Patients</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon active">
          <i className="fas fa-user-check"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.active_patients}</h3>
          <p>Active Patients</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon new">
          <i className="fas fa-user-plus"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.new_today}</h3>
          <p>New Today</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon weekly">
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="stat-info">
          <h3>{stats.new_this_week}</h3>
          <p>New This Week</p>
        </div>
      </div>
    </div>
  );
};

export default DetailedPatientStats;