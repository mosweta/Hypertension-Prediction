import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';
// Kenyan poverty thresholds
// const KENYAN_POVERTY_LINES = {
//   RURAL: 5995,
//   URBAN: 12000,
//   NAIROBI: 15000,
//   MOMBASA: 13000,
//   KISUMU: 12000,
//   OTHER_URBAN: 11000
// };

export default function HypertensionPredictor() {
  const navigate = useNavigate();
  const location = useLocation();
  const patient = location.state?.patient || null;

  // const [householdInfo, setHouseholdInfo] = useState({
  //   residence: "",
  //   householdSize: "",
  //   monthlyIncome: ""
  // });

  const [inputs, setInputs] = useState({
    RIAGENDR: "",
    RIDAGEYR: "",
    DMDEDUC2: "",
    INDFMPIR: "",
    BMXWT: "",
    BMXHT: "",
    BMXWAIST: "",
    DRQSPREP: "",
    salt_frequency_ordinal: "",
    active: "",
    //has_diabetes: ""
  });

  const [engineered, setEngineered] = useState({ BMI: "" });
  const [errors, setErrors] = useState({});
  const [householdErrors, setHouseholdErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [householdTouched, setHouseholdTouched] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nurseId, setNurseId] = useState(null);

  // Get nurse ID from session on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get("/me", {
          withCredentials: true
        });
        
        if (response.data.status === "success") {
          setNurseId(response.data.user.id);
          console.log("Nurse ID:", response.data.user.id);
        }
      } catch (error) {
        console.error("Error fetching nurse data:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Auto-fill gender and age from patient data
  useEffect(() => {
    if (patient) {
      // Auto-fill gender
      if (patient.Gender) {
        const genderValue = patient.Gender.toLowerCase() === 'male' ? '1' : '0';
        setInputs(prev => ({ ...prev, RIAGENDR: genderValue }));
      }

      // Auto-fill age if patient has DateOfBirth
      if (patient.DateOfBirth) {
        const calculateAge = (birthDate) => {
          const today = new Date();
          const dob = new Date(birthDate);
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          return age;
        };

        try {
          const age = calculateAge(patient.DateOfBirth);
          if (age >= 18 && age <= 120) {
            setInputs(prev => ({ ...prev, RIDAGEYR: age.toString() }));
          }
        } catch (error) {
          console.error('Error calculating age from DateOfBirth:', error);
        }
      }
    }
  }, [patient]);

  // // --- Calculate INDFMPIR dynamically ---
  // useEffect(() => {
  //   const { residence, householdSize, monthlyIncome } = householdInfo;
  //   if (residence && householdSize && monthlyIncome) {
  //     const size = parseInt(householdSize);
  //     const income = parseFloat(monthlyIncome);
  //     if (!isNaN(size) && !isNaN(income) && size > 0) {
  //       let povertyLine = KENYAN_POVERTY_LINES.RURAL;
  //       switch (residence) {
  //         case "1": povertyLine = KENYAN_POVERTY_LINES.NAIROBI; break;
  //         case "2": povertyLine = KENYAN_POVERTY_LINES.MOMBASA; break;
  //         case "3": povertyLine = KENYAN_POVERTY_LINES.KISUMU; break;
  //         case "4": povertyLine = KENYAN_POVERTY_LINES.OTHER_URBAN; break;
  //         case "5": povertyLine = KENYAN_POVERTY_LINES.RURAL; break;
  //         default: povertyLine = KENYAN_POVERTY_LINES.RURAL;
  //       }
  //       const ipr = income / (povertyLine * size);
  //       setInputs(prev => ({ ...prev, INDFMPIR: parseFloat(ipr.toFixed(2)) }));
  //     }
  //   } else {
  //     setInputs(prev => ({ ...prev, INDFMPIR: "" }));
  //   }
  // }, [householdInfo]);

  // --- Calculate BMI dynamically ---
  useEffect(() => {
    const w = parseFloat(inputs.BMXWT);
    const h = parseFloat(inputs.BMXHT);
    if (!isNaN(w) && !isNaN(h) && w >= 20 && w <= 300 && h >= 100 && h <= 250) {
      const BMI = w / ((h / 100) ** 2);
      setEngineered({ BMI: parseFloat(BMI.toFixed(2)) });
    } else {
      setEngineered({ BMI: "" });
    }
  }, [inputs.BMXWT, inputs.BMXHT]);

  // --- Validation ---
  const validateField = (name, value) => {
    if (value === "" || value === null || value === undefined)
      return "This field is required";
    switch (name) {
      case "RIDAGEYR":
        return value < 18 || value > 120 ? "Age must be 18–120" : "";
      case "INDFMPIR":
        return value < 0 || value > 10 ? "Income ratio must be 0–10" : "";
      case "BMXWT":
        return value < 20 || value > 300 ? "Weight must be 20–300kg" : "";
      case "BMXHT":
        return value < 100 || value > 250 ? "Height must be 100–250cm" : "";
      case "BMXWAIST":
        return value < 50 || value > 200 ? "Waist must be 50–200cm" : "";
      default:
        return "";
    }
  };

  // const validateHouseholdField = (name, value) => {
  //   if (!value) return "This field is required";
  //   if (name === "householdSize") {
  //     const size = parseInt(value);
  //     if (isNaN(size) || size < 1 || size > 20)
  //       return "Household size must be 1–20";
  //   }
  //   if (name === "monthlyIncome") {
  //     const income = parseFloat(value);
  //     if (isNaN(income) || income < 0) return "Income cannot be negative";
  //   }
  //   return "";
  // };

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Prevent changing gender if it's auto-filled from patient data
    if (name === "RIAGENDR" && patient?.Gender) {
      return;
    }
    setInputs(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  // const handleHouseholdChange = (field, value) => {
  //   setHouseholdInfo(prev => ({ ...prev, [field]: value }));
  //   setHouseholdErrors(prev => ({ ...prev, [field]: "" }));
  // };

  // const handleHouseholdBlur = (field, value) => {
  //   setHouseholdTouched(prev => ({ ...prev, [field]: true }));
  //   setHouseholdErrors(prev => ({
  //     ...prev,
  //     [field]: validateHouseholdField(field, value)
  //   }));
  // };

  const isFormValid = () => {
    const allHealthValid = Object.keys(inputs).every(
      k => inputs[k] !== "" && validateField(k, inputs[k]) === ""
    );
    // const allHouseholdValid = Object.keys(householdInfo).every(
    //   k =>
    //     householdInfo[k] !== "" &&
    //     validateHouseholdField(k, householdInfo[k]) === ""
    // );
    return !!engineered.BMI && !!nurseId;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const triageData = {
      // Patient information
      patientId: patient?.userId,
      nurseId: nurseId,
      
      // Demographic data
      RIAGENDR: parseInt(inputs.RIAGENDR),
      is_male: inputs.RIAGENDR === "1" ? 1 : 0,
      RIDAGEYR: parseInt(inputs.RIDAGEYR),
      DMDEDUC2: parseInt(inputs.DMDEDUC2),
      INDFMPIR: parseFloat(inputs.INDFMPIR),
      
      // Physical measurements
      BMXWT: parseFloat(inputs.BMXWT),
      BMXHT: parseFloat(inputs.BMXHT),
      BMXWAIST: parseFloat(inputs.BMXWAIST),
      BMI: parseFloat(engineered.BMI),
      
      // Lifestyle factors
      DRQSPREP: parseInt(inputs.DRQSPREP),
      DBD100: parseInt(inputs.salt_frequency_ordinal),
      active: parseInt(inputs.active),
      //has_diabetes: parseInt(inputs.has_diabetes),
      
      // Household information
      // residence: householdInfo.residence,
      // householdSize: parseInt(householdInfo.householdSize),
      // monthlyIncome: parseFloat(householdInfo.monthlyIncome),
      
      // Timestamp
      createdAt: new Date().toISOString()
    };

    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.post(
        "/api/triage", 
        triageData,
        { withCredentials: true }
      );
      
      if (response.data.status === "success") {
        setResult({ 
          success: true, 
          message: "Triage data saved successfully!",
          triageId: response.data.triageId 
        });
        
        // Optionally navigate to another page or clear form
        setTimeout(() => {
          navigate("/nurse-dashboard", { 
            state: { 
              message: "Triage data saved successfully!",
              patient: patient
            } 
          });
        }, 2000);
      }
      
    } catch (err) {
      console.error("Error saving triage data:", err);
      setResult({ 
        error: err.response?.data?.message || "Failed to save triage data. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  };

  // Add patient info display at the top
  const PatientInfoBanner = () => {
    if (!patient) return null;
    return (
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Patient Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Name:</strong> {patient.fName} {patient.lName}
          </div>
          <div>
            <strong>ID:</strong> #{patient.userId}
          </div>
          <div>
            <strong>Gender:</strong> {patient.Gender || 'Not specified'}
          </div>
          <div>
            <strong>DOB:</strong> {patient.DateOfBirth ? new Date(patient.DateOfBirth).toLocaleDateString() : 'Not provided'}
          </div>
        </div>
      </div>
    );
  };

  // --- IPR Interpretation ---
  const getIPRInterpretation = (ipr) => {
    if (!ipr) return "";
    const value = parseFloat(ipr);
    if (value < 1) return "❌ Below poverty line";
    if (value < 1.5) return "⚠️ Near poverty line";
    if (value < 3) return "✅ Moderate income";
    return "💎 Comfortable income";
  }

  // --- Form Components ---
  const FormField = ({ label, name, type = "text", value, onChange, onBlur, disabled = false }) => (
    <label className="flex flex-col">
      <span className="text-sm text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className={`p-2 border rounded-lg ${errors[name] ? "border-red-500" : "border-gray-300"} ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
      />
      {errors[name] && <span className="text-red-500 text-xs mt-1">{errors[name]}</span>}
    </label>
  );

  const SelectField = ({ label, name, options, disabled = false }) => (
    <label className="flex flex-col">
      <span className="text-sm text-gray-700 mb-1">{label}</span>
      <select
        name={name}
        value={inputs[name]}
        onChange={handleChange}
        disabled={disabled}
        className={`p-2 border rounded-lg ${errors[name] ? "border-red-500" : "border-gray-300"} ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
      >
        <option value="">Select...</option>
        {options.map(([v, t]) => (
          <option key={v} value={v}>{t}</option>
        ))}
      </select>
      {errors[name] && <span className="text-red-500 text-xs mt-1">{errors[name]}</span>}
    </label>
  );

  // --- UI ---
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-cyan-100">
      <Card className="p-6 w-full max-w-2xl shadow-xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-blue-800">
            🩺 Patient Triage Data Collection
          </h1>
          <p className="text-sm text-center text-gray-500">
            Collect patient data for hypertension risk assessment
          </p>
          {nurseId && (
            <p className="text-xs text-center text-green-600">
              Nurse ID: {nurseId}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Patient Info Banner */}
          <PatientInfoBanner />
          
          {/* Household Section
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">🏠 Household Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Residence */}
              {/* <label className="flex flex-col">
                <span className="text-sm text-gray-700 mb-1">Area of Residence *</span>
                <select
                  value={householdInfo.residence}
                  onChange={(e) => handleHouseholdChange("residence", e.target.value)}
                  onBlur={(e) => handleHouseholdBlur("residence", e.target.value)}
                  className={`p-2 border rounded-lg ${householdErrors.residence ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="">Select your area...</option>
                  <option value="1">Nairobi</option>
                  <option value="2">Mombasa</option>
                  <option value="3">Kisumu</option>
                  <option value="4">Other Urban Area</option>
                  <option value="5">Rural Area</option>
                </select>
                {householdErrors.residence && (
                  <span className="text-red-500 text-xs mt-1">{householdErrors.residence}</span>
                )}
              </label> */}

              {/* Household Size */}
              {/* <FormField
                label="Household Size *"
                name="householdSize"
                type="text"
                value={householdInfo.householdSize}
                onChange={(e) => handleHouseholdChange("householdSize", e.target.value)}
                onBlur={(e) => handleHouseholdBlur("householdSize", e.target.value)}
              /> */}

              {/* Monthly Income */}
              {/* <FormField
                label="Monthly Household Income (KSh) *"
                name="monthlyIncome"
                type="number"
                value={householdInfo.monthlyIncome}
                onChange={(e) => handleHouseholdChange("monthlyIncome", e.target.value)}
                onBlur={(e) => handleHouseholdBlur("monthlyIncome", e.target.value)}
              /> */}

              {/* IPR */}
              {/* <label className="flex flex-col">
                <span className="text-sm text-gray-700 mb-1">Income-Poverty Ratio</span>
                <input
                  type="text"
                  value={inputs.INDFMPIR || "Fill above fields"}
                  readOnly
                  className="p-2 border rounded-lg bg-gray-100 font-semibold"
                />
              </label>
            </div>
            {inputs.INDFMPIR && (
              <p className="mt-2 text-sm text-gray-700">
                Interpretation: {getIPRInterpretation(inputs.INDFMPIR)}
              </p>
            )}
          </div> */} 

          {/* Health Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-800 mb-3">💊 Health Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gender field - auto-filled and disabled */}
              <SelectField 
                label="Gender" 
                name="RIAGENDR" 
                options={[["1","Male"],["0","Female"]]} 
                disabled={!!patient?.Gender} 
              />
              
              {patient?.Gender && (
                <div className="text-sm text-blue-600 flex items-center">
                  ✓ Gender auto-filled from patient record
                </div>
              )}
              
              <FormField label="Age (years)" disabled={!!patient.DateOfBirth} name="RIDAGEYR" type="number" min="18" max="120" value={inputs.RIDAGEYR} onChange={handleChange}/>
              <SelectField label="Income to Poverty Ratio" name="INDFMPIR" value={inputs.INDFMPIR || "Fill above fields"} options={[["0.8","Low Income"],["1.5","Moderate Income"],["3","High Income"],["4","Very High Income"]]} />
              <SelectField label="Education Level" name="DMDEDUC2" options={[["1","Primary"],["2","Secondary"],["3","College"],["4","University"],["5","Postgraduate"]]} />
              <FormField label="Weight (kg)" name="BMXWT" type="number" min="20" max="300" value={inputs.BMXWT} onChange={handleChange}/>
              <FormField label="Height (cm)" name="BMXHT" type="number" min="100" max="250" value={inputs.BMXHT} onChange={handleChange}/>
              <FormField label="Waist (cm)" name="BMXWAIST" type="number" min="50" max="200" value={inputs.BMXWAIST} onChange={handleChange}/>

              <SelectField label="Salt added while cooking?" name="DRQSPREP" options={[[1,"Very often"],[2,"Often"],[3,"Sometimes"],[4,"Rarely"],[5,"Never"]]} />
              <SelectField label="Table salt added?" name="salt_frequency_ordinal" options={[[1,"Very often"],[2,"Often"],[3,"Sometimes"],[4,"Rarely"],[5,"Never"]]} />
              <SelectField label="Physical activity weekly?" name="active" options={[["1","Yes"],["0","No"]]} />
              {/* <SelectField label="Do you have diabetes?" name="has_diabetes" options={[["1","Yes"],["0","No"]]} /> */}
            </div>
          </div>

          {/* BMI Display */}
          {engineered.BMI && (
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">
                Auto-calculated BMI:{" "}
                <strong className="text-green-700">{engineered.BMI}</strong>
                {engineered.BMI >= 30 ? " (Obese)" :
                 engineered.BMI >= 25 ? " (Overweight)" :
                 engineered.BMI < 18.5 ? " (Underweight)" :
                 " (Normal)"}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
              className={`${!isFormValid() ? "opacity-50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} min-w-[200px]`}
            >
              {loading ? "💾 Saving Data..." : "💾 Save Triage Data"}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-6 text-center p-4 rounded-lg border ${
                result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              {result.error ? (
                <p className="text-red-500">{result.error}</p>
              ) : result.success ? (
                <div>
                  <p className="text-lg font-semibold text-green-700">
                    ✅ {result.message}
                  </p>
                  {result.triageId && (
                    <p className="text-sm text-gray-600 mt-2">
                      Triage ID: {result.triageId}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Redirecting to dashboard...
                  </p>
                </div>
              ) : null}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}