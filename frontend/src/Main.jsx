import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import your pages/components
import App from "./App.jsx";
// import UserLogin from "./pages/user/UserLogin.jsx";
// import UserRegister from "./pages/user/UserRegister.jsx";
// import UserDashboard from "./pages/user/UserDashboard.jsx";
// import UserAppointments from "./pages/user/UserAppointments.jsx";

// import DoctorLogin from "./pages/doctor/DoctorLogin.jsx";
// import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
// import DoctorAppointments from "./pages/doctor/DoctorAppointments.jsx";

// import AdminLogin from "./pages/admin/AdminLogin.jsx";
// import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
// import AdminDoctors from "./pages/admin/AdminDoctors.jsx";
// import AdminAppointments from "./pages/admin/AdminAppointments.jsx";

// import NotFound from "./pages/NotFound.jsx";

// import "./index.css";
import"./style.css";
import Login from "./Login.jsx";
import Register from "./Register.jsx";

import HypertensionPredictor from "./DoctorDashboard.jsx";
import Test from "./test.jsx";
import PatientDashboard from "./PatientDashboard.jsx";
import PredictionResults from "./PatientPrediction.jsx";
import DoctorDashboard from "./DoctorDashboard.jsx";
import StatsCards from "./StatsCards.jsx";
import PatientTable from "./PatientTable.jsx";
import NurseDashboard from "./nurseDashboard.jsx";
import Index from "./index.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Landing or Home */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        
        <Route path="/doctordashboard" element={<DoctorDashboard/>}/>
        <Route path="/hypertension-predictor" element={<HypertensionPredictor />} />

<Route path= "/test" element={<Test />} />
<Route path="/patient-dashboard" element={<PatientDashboard  />} />
<Route path="/patient-prediction" element={<PredictionResults />} />
<Route path="/stats-cards" element={<StatsCards />} />
<Route path="/patient-table" element={<PatientTable patients={[]} loading={false} onPredict={() => {}} currentPage={1} totalPages={1} onPageChange={() => {}} />} />
<Route path="/nurse-dashboard" element={<NurseDashboard />} />
        {/* <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/user/appointments" element={<UserAppointments />} />

        
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/appointments" element={<DoctorAppointments />} />

        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/doctors" element={<AdminDoctors />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />

        
        <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
