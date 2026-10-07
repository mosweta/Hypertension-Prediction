// src/components/nurse/QuickActions.js
import React from 'react';
import './NurseDashboard.css';


const QuickActions = ({ onVitalSigns }) => {
  const quickActions = [
    {
      icon: 'fas fa-heartbeat',
      label: 'Record Vitals',
      color: 'primary',
      onClick: onVitalSigns
    },
    {
      icon: 'fas fa-pills',
      label: 'Medications',
      color: 'secondary'
    },
    {
      icon: 'fas fa-file-medical',
      label: 'Add Note',
      color: 'warning'
    },
    {
      icon: 'fas fa-bell',
      label: 'Alerts',
      color: 'danger'
    }
  ];

  return (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className={`action-card ${action.color}`}
            onClick={action.onClick}
          >
            <div className="action-icon">
              <i className={action.icon}></i>
            </div>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;