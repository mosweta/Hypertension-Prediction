import './style.css';
import { IoMail, IoLockClosed, IoArrowBack, IoReload } from "react-icons/io5";
import { FaUserPlus } from "react-icons/fa";
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState("LOGIN"); 
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [lvalues, setLValues] = useState({
    EmailAddress: '',
    Password: ''
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const otpInputRefs = useRef([]);

  useEffect(() => {
    axios.get('/me', { withCredentials: true })
      .then(res => {
        console.log("Full /me response:", res.data);
        
        if (res.data.user && res.data.user.roleName) {
          const { roleName } = res.data.user;
          console.log("Role detected:", roleName);
          
          if (roleName === "doctor") {
            navigate('/doctordashboard');
          } else if (roleName === "nurse") {
            navigate('/nurse-dashboard');
          } else {
            navigate('/patient-dashboard');
          }
        } else {
          console.log("No roleName found, checking roleId");
          const roleId = res.data.user?.roleId;
          if (roleId === 1) navigate('/doctordashboard');
          else if (roleId === 2) navigate('/test');
          else navigate('/');
        }
      })
      .catch((error) => {
        console.error("Auth check failed:", error);
      });
  }, [navigate]);

  // Focus OTP fields
  useEffect(() => {
    if ((step === "OTP" || step === "RESET_VERIFY") && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

 // 1. Combine OTP digits into one string
const getOtpString = () => otp.join("");

// 2. Handle OTP typing
const handleOtpChange = (index, value) => {
  if (!/^\d?$/.test(value)) return;

  const newOtp = [...otp];
  newOtp[index] = value;
  setOtp(newOtp);

  if (value && index < otp.length - 1) {
    otpInputRefs.current[index + 1]?.focus();
  }
};

// 3. Handle Backspace navigation
const handleOtpKeyDown = (index, e) => {
  if (e.key === "Backspace" && !otp[index] && index > 0) {
    otpInputRefs.current[index - 1]?.focus();
  }
};

// 4. Handle Paste (full OTP)
const handleOtpPaste = (e) => {
  e.preventDefault();

  const pasted = e.clipboardData
    .getData("text")
    .replace(/\D/g, "")
    .slice(0, otp.length);

  if (!pasted) return;

  const newOtp = [...otp];
  pasted.split("").forEach((digit, i) => {
    newOtp[i] = digit;
  });

  setOtp(newOtp);

  const focusIndex = pasted.length < otp.length ? pasted.length : otp.length - 1;
  otpInputRefs.current[focusIndex]?.focus();
};

// 5. Auto-submit when all digits filled (SAFE WAY)
useEffect(() => {
  if (otp.every(digit => digit !== "")) {
    handleVerifyOtp({ preventDefault: () => {} });
  }
}, [otp]);


  // LOGIN flow
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage("");
    try {
      const res = await axios.post('/login', lvalues);
      if (res.data.Status === "OTP_REQUIRED") {
        setMessage("OTP sent to your email");
        setStep("OTP");
        setResendIn(30);
        setOtp(["", "", "", "", "", ""]);
      } else if (res.data.Status === "Success") {
        navigate('/');
      } else if (res.data.Status === "Invalid_Password") {
        setMessage("Invalid password");
      } else if (res.data.Status === "Activate_Account") {
        setMessage("Please activate your account before logging in");
      } else {
        setMessage(res.data.Message || "Login failed");
      }
    } catch {
      setMessage("Error logging in. Please check username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage("");
    try {
      const res = await axios.post('/verify-otp', {
        EmailAddress: lvalues.EmailAddress,
        otp: getOtpString()
      }, { withCredentials: true });
      
      if (res.data.Status === "Success") {
        window.location.reload();
      } else {
        setMessage(res.data.Message || "Invalid OTP");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.Message || "Error verifying OTP";
      setMessage(errorMessage);
      console.error("OTP verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage("");
    try {
      const res = await axios.post('/verify-my-otp', {
        email: lvalues.EmailAddress,
        otp: getOtpString()
      });
      if (res.data.Status === "Success") {
        setMessage(res.data.message || "OTP verified");
        setStep("RESET_PASSWORD");
      } else {
        setMessage(res.data.Message || "Invalid OTP");
      }
    } catch {
      setMessage("Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setLoading(true); 
    setMessage("");
    try {
      const res = await axios.post('/resend-otp', { EmailAddress: lvalues.EmailAddress });
      if (res.data.Status === "OTP_REQUIRED") {
        setMessage("OTP resent to your email");
        setResendIn(30);
        setOtp(["", "", "", "", "", ""]);
      } else {
        setMessage(res.data.Message || "Could not resend OTP");
      }
    } catch {
      setMessage("Error resending OTP");
    } finally {
      setLoading(false);
    }
  };

  // OTP RESET FLOW
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage("");
    try {
      const res = await axios.post('/forgot-password-otp', { email: lvalues.EmailAddress });
      setMessage(res.data.message || "OTP sent to your email");
      setStep("RESET_VERIFY");
      setResendIn(30);
      setOtp(["", "", "", "", "", ""]);
    } catch {
      setMessage("Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage("");
    try {
      const res = await axios.post('/reset-password-otp', {
        email: lvalues.EmailAddress,
        otp: getOtpString(),
        newPassword
      });
      setMessage(res.data.message || "Password reset successful");
      setStep("LOGIN");
      setNewPassword("");
    } catch {
      setMessage("Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const StepIndicator = ({ currentStep }) => {
    const steps = {
      "LOGIN": 1,
      "OTP": 2,
      "RESET_REQUEST": 1,
      "RESET_VERIFY": 2,
      "RESET_PASSWORD": 3
    };

    const totalSteps = currentStep.includes("RESET") ? 3 : 2;

    return (
      <div className="step-indicator">
        {[...Array(totalSteps)].map((_, index) => (
          <div key={index} className={`step-dot ${index < steps[currentStep] ? 'active' : ''}`}></div>
        ))}
      </div>
    );
  };

  return (
    <section>
      <div className="login-box">
        <StepIndicator currentStep={step} />
        
        {/* LOGIN */}
        <form onSubmit={handleLogin} className={`form-step ${step === "LOGIN" ? "" : "hidden"}`}>
          <div className="form-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
          </div>

          <div className="input-box">
            <input 
              type="email" 
              required 
              
              value={lvalues.EmailAddress}
              onChange={e => setLValues({ ...lvalues, EmailAddress: e.target.value })} 
            />
            <IoMail className="icon" />
            <label>Email Address</label>
          </div>

          <div className="input-box">
            <input 
              type="password" 
              required 
            
              value={lvalues.Password}
              onChange={e => setLValues({ ...lvalues, Password: e.target.value })} 
            />
            <IoLockClosed className="icon" />
            <label>Password</label>
          </div>

          <div className="remember-forgot">
            <label className="checkbox-container">
              <input type="checkbox" />
              <span className="checkmark"></span>
              Remember Me
            </label>
            <a onClick={() => setStep("RESET_REQUEST")} className="forgot-link">
              Forgot password?
            </a>
          </div>

          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <div className="spinner"></div> : "Sign In"}
          </button>

          <div className="register-link">
            <p>Don't have an account? <a onClick={() => navigate("/register")}>Sign up here</a></p>
          </div>

          {message && <div className={`message ${message.includes("successful") ? 'success' : 'error'}`}>{message}</div>}
        </form>

        {/* OTP VERIFICATION */}
        <form onSubmit={handleVerifyOtp} className={`form-step ${step === "OTP" ? "" : "hidden"}`}>
          <div className="form-header">
            <h1>Two-Factor Authentication</h1>
            <p>Enter the 6-digit code sent to your email</p>
          </div>

          <div className="otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => otpInputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="otp-input"
                onPaste={handleOtpPaste}
              />
            ))}
          </div>

          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <div className="spinner"></div> : "Verify & Continue"}
          </button>

          <div className="resend-container">
            <button 
              type="button" 
              onClick={handleResend} 
              className="resend-btn"
              disabled={resendIn > 0 || loading}
            >
              <IoReload className="resend-icon" />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Code"}
            </button>
          </div>

          <button type="button" onClick={() => setStep("LOGIN")} className="back-btn">
            <IoArrowBack className="back-icon" />
            Back to Login
          </button>

          {message && <div className={`message ${message.includes("sent") ? 'success' : 'error'}`}>{message}</div>}
        </form>

        {/* PASSWORD RESET FLOW */}
        {/* RESET REQUEST */}
        <form onSubmit={handleRequestOTP} className={`form-step ${step === "RESET_REQUEST" ? "" : "hidden"}`}>
          <div className="form-header">
            <h1>Reset Your Password</h1>
            <p>Enter your email to receive a verification code</p>
          </div>

          <div className="input-box">
            <input 
              type="email" 
              required 
              placeholder=" "
              value={lvalues.EmailAddress}
              onChange={e => setLValues({ ...lvalues, EmailAddress: e.target.value })} 
            />
            <IoMail className="icon" />
            <label>Email Address</label>
          </div>

          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <div className="spinner"></div> : "Send Verification Code"}
          </button>

          <button type="button" onClick={() => setStep("LOGIN")} className="back-btn">
            <IoArrowBack className="back-icon" />
            Back to Login
          </button>

          {message && <div className={`message ${message.includes("sent") ? 'success' : 'error'}`}>{message}</div>}
        </form>

        {/* RESET VERIFY */}
        <form onSubmit={handleVerifyResetOtp} className={`form-step ${step === "RESET_VERIFY" ? "" : "hidden"}`}>
          <div className="form-header">
            <h1>Verify Your Identity</h1>
            <p>Enter the 6-digit code sent to your email</p>
          </div>

          <div className="otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => otpInputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="otp-input"
              />
            ))}
          </div>

          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <div className="spinner"></div> : "Verify Code"}
          </button>

          <div className="resend-container">
            <button 
              type="button" 
              onClick={handleResend} 
              className="resend-btn"
              disabled={resendIn > 0 || loading}
            >
              <IoReload className="resend-icon" />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Code"}
            </button>
          </div>

          <button type="button" onClick={() => setStep("RESET_REQUEST")} className="back-btn">
            <IoArrowBack className="back-icon" />
            Back
          </button>

          {message && <div className={`message ${message.includes("verified") ? 'success' : 'error'}`}>{message}</div>}
        </form>

        {/* RESET PASSWORD */}
        <form onSubmit={handleResetPassword} className={`form-step ${step === "RESET_PASSWORD" ? "" : "hidden"}`}>
          <div className="form-header">
            <h1>Create New Password</h1>
            <p>Enter your new password below</p>
          </div>

          <div className="input-box">
            <input 
              type="password" 
              required 
              placeholder=" "
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)} 
            />
            <IoLockClosed className="icon" />
            <label>New Password</label>
          </div>

          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <div className="spinner"></div> : "Reset Password"}
          </button>

          <button type="button" onClick={() => setStep("LOGIN")} className="back-btn">
            <IoArrowBack className="back-icon" />
            Back to Login
          </button>

          {message && <div className={`message ${message.includes("successful") ? 'success' : 'error'}`}>{message}</div>}
        </form>
      </div>
    </section>
  );
}