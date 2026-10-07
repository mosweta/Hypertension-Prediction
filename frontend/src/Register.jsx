import React, { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaCheck, FaTimes } from "react-icons/fa";
import './Register.css';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';

const Register = () => {
    return (
        <div className="wrapper">
            <div className="form-box register">
                <Registration />
                <div className="login-link">
                    <p>Already have an account? <a href="/login">Login here</a></p>
                </div>
            </div>
        </div>
    );
}

function Registration() {
    const [rvalues, setRValues] = useState({
        fName: '',
        lName: '',
        EmailAddress: '',
        Password: '',
        RepeatPassword: ''
    });
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const navigate = useNavigate();

    const checkPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[a-z]/.test(password)) strength += 25;
        if (/[@#\\/]/.test(password)) strength += 25;
        return strength;
    };

    const handlePasswordChange = (e) => {
        const password = e.target.value;
        setRValues({ ...rvalues, Password: password });
        setPasswordStrength(checkPasswordStrength(password));
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 25) return '#ff4d4d';
        if (passwordStrength <= 50) return '#ffa500';
        if (passwordStrength <= 75) return '#ffd700';
        return '#00ff8c';
    };

    const validateForm = () => {
        if (!rvalues.fName || !rvalues.lName || !rvalues.EmailAddress || !rvalues.Password || !rvalues.RepeatPassword) {
            setMessage('Please fill in all fields');
            return false;
        }

        if (rvalues.Password !== rvalues.RepeatPassword) {
            setMessage('Passwords do not match');
            return false;
        }

        if (rvalues.Password.length < 8) {
            setMessage('Password should be at least 8 characters');
            return false;
        }

        if (!/[A-Z]/.test(rvalues.Password) || !/[a-z]/.test(rvalues.Password) || !/[@#\\/]/.test(rvalues.Password)) {
            setMessage('Password must contain uppercase, lowercase, and special characters (@ # \\ /)');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!validateForm()) return;

        setLoading(true);

        try {
            const emailCheck = await axios.post('http://localhost:8081/check-email', { 
                EmailAddress: rvalues.EmailAddress 
            });

            if (emailCheck.data.exists) {
                setMessage('Email already exists');
                setLoading(false);
                return;
            }

            const registerResponse = await axios.post('http://localhost:8081/register', rvalues);
            
            if (registerResponse.data.Status === "Success") {
                setSuccess(true);
                setMessage('Registration successful! Please check your email to activate your account.');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setMessage('Registration failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Error processing your request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const PasswordGuideline = ({ text, met }) => (
        <div className={`guideline-item ${met ? 'met' : ''}`}>
            {met ? <FaCheck className="guideline-icon" /> : <FaTimes className="guideline-icon" />}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="registration-container">
            {success ? (
                <div className="success-message">
                    <div className="success-icon">✓</div>
                    <h2>Registration Successful!</h2>
                    <p>{message}</p>
                    <button 
                        className="success-btn"
                        onClick={() => navigate('/login')}
                    >
                        Go to Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="registration-form">
                    <div className="form-header">
                        <h1>Create Account</h1>
                        <p>Join us today and get started</p>
                    </div>

                    <div className="name-fields">
                        <div className="input-box">
                            <input
                                type="text"
                                placeholder=" "
                                value={rvalues.fName}
                                onChange={(e) => setRValues({ ...rvalues, fName: e.target.value })}
                                required
                            />
                            <FaUser className="icon" />
                            <label>First Name</label>
                        </div>
                        <div className="input-box">
                            <input
                                type="text"
                                placeholder=" "
                                value={rvalues.lName}
                                onChange={(e) => setRValues({ ...rvalues, lName: e.target.value })}
                                required
                            />
                            <FaUser className="icon" />
                            <label>Last Name</label>
                        </div>
                    </div>

                    <div className="input-box">
                        <input
                            type="email"
                            placeholder=" "
                            value={rvalues.EmailAddress}
                            onChange={(e) => setRValues({ ...rvalues, EmailAddress: e.target.value })}
                            required
                        />
                        <FaEnvelope className="icon" />
                        <label>Email Address</label>
                    </div>

                    <div className="input-box password-input">
                        <input
                            type="password"
                            placeholder=" "
                            value={rvalues.Password}
                            onChange={handlePasswordChange}
                            onFocus={() => setShowGuidelines(true)}
                            onBlur={() => setTimeout(() => setShowGuidelines(false), 200)}
                            required
                        />
                        <FaLock className="icon" />
                        <div 
                            className="password-strength-bar"
                            style={{
                                width: `${passwordStrength}%`,
                                backgroundColor: getPasswordStrengthColor()
                            }}
                        ></div>
                        <label>Password</label>
                    </div>

                    {showGuidelines && (
                        <div className="password-guidelines">
                            <h4>Password Requirements:</h4>
                            <PasswordGuideline 
                                text="At least 8 characters long" 
                                met={rvalues.Password.length >= 8} 
                            />
                            <PasswordGuideline 
                                text="Contains uppercase letter" 
                                met={/[A-Z]/.test(rvalues.Password)} 
                            />
                            <PasswordGuideline 
                                text="Contains lowercase letter" 
                                met={/[a-z]/.test(rvalues.Password)} 
                            />
                            <PasswordGuideline 
                                text="Contains special character (@ # \ /)" 
                                met={/[@#\\/]/.test(rvalues.Password)} 
                            />
                        </div>
                    )}

                    <div className="input-box">
                        <input
                            type="password"
                            placeholder=" "
                            value={rvalues.RepeatPassword}
                            onChange={(e) => setRValues({ ...rvalues, RepeatPassword: e.target.value })}
                            required
                        />
                        <FaLock className="icon" />
                        <label>Confirm Password</label>
                    </div>

                    <div className="terms-agreement">
                        <label className="checkbox-container">
                            <input type="checkbox" required />
                            <span className="checkmark"></span>
                            I agree to the <a href="/terms">terms & conditions</a>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        
                        className={`submit-btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? <div className="spinner"></div> : 'Create Account'}
                    </button>

                    {message && (
                        <div className={`message ${success ? 'success' : 'error'}`}>
                            {message}
                        </div>
                    )}
                </form>
            )}
        </div>
    );
}

export default Register;