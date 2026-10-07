import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export default function PredictionResults({ onBack }) {
  const [riskLabel, setRiskLabel] = useState("");
  const [color, setColor] = useState("gray");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [triageId, setTriageId] = useState(null);
  const [formattedRecommendations, setFormattedRecommendations] = useState([]);
  const [doctorId, setDoctorId] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // ✅ Safe data extraction with fallbacks
  const predictionResult = location.state?.predictionResult || location.state?.result || location.state?.prediction || location.state?.data;
  const triageData = location.state?.triageData || {};
  
  const probability = predictionResult?.probability || predictionResult?.prediction_probability || 0;
  const rawRecommendations = predictionResult?.recommendations || [];
  const binaryPrediction = predictionResult?.binary_prediction || predictionResult?.prediction || 0;
  const riskLevel = predictionResult?.risk_level || "Unknown";
  const interpretation = predictionResult?.interpretation || "";

  useEffect(() => {
    console.log("📍 PredictionResults - Location state:", location.state);
    console.log("📊 PredictionResults - Prediction data:", predictionResult);
    console.log("🏥 PredictionResults - Triage data:", triageData);

    // Extract patient ID and triage ID if available
    if (location.state?.patientId) {
      setPatientId(location.state.patientId);
    } else if (triageData?.patientId) {
      setPatientId(triageData.patientId);
    }

    if (triageData?.triageId) {
      setTriageId(triageData.triageId);
    }

    // Set risk label and color based on probability
    if (probability >= 0.6) {
      setRiskLabel("High Risk");
      setColor("#ef4444"); // red-500
    } else if (probability >= 0.4) {
      setRiskLabel("Moderate Risk");
      setColor("#f59e0b"); // amber-500
    } else {
      setRiskLabel("Low Risk");
      setColor("#10b981"); // green-500
    }

    // Format recommendations (remove markdown formatting)
    const cleanRecommendations = rawRecommendations.map(rec => {
      if (typeof rec !== 'string') return String(rec);
      
      return rec
        .replace(/^###\s*\d*\.?\s*\*{0,2}/g, '') // Remove ### and numbering
        .replace(/\*{2}(.*?)\*{2}/g, '$1') // Remove **bold**
        .replace(/^Goal:\*{0,2}\s*/g, 'Goal: ') // Clean up "Goal:**"
        .replace(/^Action:\*{0,2}\s*/g, 'Action: ') // Clean up "Action:**"
        .trim();
    }).filter(rec => rec.length > 5); // Filter out very short lines

    setFormattedRecommendations(cleanRecommendations.length > 0 ? cleanRecommendations : [
      "Maintain a balanced diet low in sodium and high in fruits and vegetables",
      "Engage in regular physical activity (at least 150 minutes per week)",
      "Monitor blood pressure regularly and maintain a healthy weight",
      "Limit alcohol consumption and avoid tobacco products",
      "Manage stress through relaxation techniques and adequate sleep"
    ]);
  }, [predictionResult, probability, location.state, rawRecommendations, triageData]);

  // Build gauge chart segments
  const gaugeData = [
    { name: "Risk", value: probability * 100 },
    { name: "Remaining", value: 100 - probability * 100 },
  ];

  const COLORS = [color, "#e5e7eb"];
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get("/me", {
          withCredentials: true
        });
        
        if (response.data.status === "success") {
          setDoctorId(response.data.user.id);
          console.log("Doctor ID:", response.data.user.id);
        }
      } catch (error) {
        console.error("Error fetching doctor data:", error);
      }
    };

    fetchCurrentUser();
  }, []);
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

  const handleDownloadPDF = () => {
    if (!predictionResult) {
      alert("No prediction data available to download");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Hypertension Risk Assessment Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Risk Category: ${riskLabel}`, 14, 30);
    doc.text(`Predicted Probability: ${(probability * 100).toFixed(2)}%`, 14, 38);
    doc.text(`Binary Prediction: ${binaryPrediction === 1 ? "At Risk" : "Not At Risk"}`, 14, 46);
    doc.text(`Risk Level: ${riskLevel}`, 14, 54);
    doc.text(`Interpretation: ${interpretation}`, 14, 62);
    doc.setFontSize(8);
doc.text(
  "Disclaimer: This hypertension risk prediction is generated using an AI-based decision support system and is intended to assist qualified medical professionals. The final clinical decision and responsibility remain with the attending doctor. This report should not be used as a sole basis for diagnosis or treatment without proper medical evaluation.",
  14,
  280,
  { maxWidth: 180 }
);
    
    // Add patient information if available
    if (patientId) {
      doc.text(`Patient ID: ${patientId}`, 14, 70);
    }
    if (triageId) {
      doc.text(`Triage ID: ${triageId}`, 14, 78);
    }
    
    doc.text("Personalized Recommendations:", 14, 86);

    const recs = formattedRecommendations.map((r, i) => [i + 1, r]);
    autoTable(doc, {
      startY: 90,
      head: [["#", "Recommendation"]],
      body: recs,
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 
        0: { cellWidth: 10 }, // Number column
        1: { cellWidth: 170 } // Recommendation column
      }
    });

    if (doctorNotes.trim()) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text("Doctor's Notes:", 14, finalY);
      doc.text(doctorNotes, 14, finalY + 8);
    }

    doc.save(`Hypertension_Report_Patient_${patientId || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleApproveAndSave = async () => {
    if (!doctorNotes.trim()) {
      alert("Please enter your notes before approving.");
      return;
    }

    if (!patientId) {
      alert("Patient ID not found. Cannot save record.");
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        doctorId: doctorId,
        patientId: patientId,
        triageId: triageId,
        prediction: binaryPrediction,
        probability: probability,
        risk_level: riskLevel,
        interpretation: interpretation,
        recommendations: formattedRecommendations,
        doctorNotes: doctorNotes,
        approved: 1,
        
      };

      console.log("💾 Saving prediction results:", saveData);

      const response = await axios.post(
        "http://localhost:8081/api/save-prediction", 
        saveData,
        { withCredentials: true }
      );
      
      if (response.data.status === "success") {
        setSaved(true);
        alert("Prediction and recommendations approved and saved successfully!");
        
        // Optionally navigate back after success
        setTimeout(() => {
          navigate("/doctordashboard");
        }, 2000);
      } else {
        throw new Error(response.data.message || "Failed to save prediction");
      }
      
    } catch (err) {
      console.error("❌ Error saving prediction:", err);
      alert(err.response?.data?.message || "Failed to save prediction record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  // ✅ Show loading/error state if no data
  if (!predictionResult) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4">No Prediction Data Found</h2>
            <p className="text-gray-600 mb-4">
              It seems the prediction data wasn't passed correctly to this page.
            </p>
            <div className="space-y-2 text-sm text-left bg-gray-50 p-4 rounded mb-4">
              <p><strong>Debug Info:</strong></p>
              <p>Location State: {JSON.stringify(location.state)}</p>
            </div>
            <Button onClick={handleBack} variant="default">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center p-6 min-h-screen bg-gray-50"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="w-full max-w-4xl shadow-xl rounded-2xl border border-gray-200">
        <CardHeader className="text-center pb-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Hypertension Risk Assessment</h2>
          <p className="text-lg text-gray-600">Detailed Prediction Results & Recommendations</p>
          {(patientId || triageId) && (
            <div className="flex justify-center gap-4 text-sm text-gray-500 mt-2">
              {patientId && <span>Patient ID: #{patientId}</span>}
              {triageId && <span>Triage ID: #{triageId}</span>}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Risk Summary */}
          <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
            <div className="flex justify-center mb-4">
              <ResponsiveContainer width={300} height={180}>
                <PieChart>
                  <Pie
                    data={gaugeData}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color }}>
              {riskLabel}
            </h3>
            <p className="text-3xl font-bold text-gray-800 mb-1">{(probability * 100).toFixed(1)}%</p>
            <p className="text-gray-600 text-sm">Probability of Hypertension Risk</p>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">{interpretation}</p>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>Binary Prediction: <strong>{binaryPrediction === 1 ? "At Risk" : "Not At Risk"}</strong></p>
              <p>Risk Level: <strong>{riskLevel}</strong></p>
            </div>
          </div>

          {/* Recommendations */}
          {formattedRecommendations.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                Personalized Health Recommendations
              </h3>
              <div className="space-y-4">
                {formattedRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor Notes */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Doctor's Clinical Notes</h3>
            <textarea
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              rows="5"
              placeholder="Add your professional assessment, diagnosis, treatment plan, or follow-up recommendations..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
            ></textarea>
            <p className="text-sm text-gray-500 mt-2">
              These notes will be saved with the patient's record and included in the PDF report.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button
              onClick={handleDownloadPDF}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-white font-semibold"
              size="lg"
            >
              📄 Download PDF Report
            </Button>

            {patientId && (
              <Button
                onClick={handleApproveAndSave}
                variant="default"
                className="bg-green-600 hover:bg-green-700 px-6 py-2 text-white font-semibold"
                disabled={saving || saved}
                size="lg"
              >
                {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "✅ Approve & Save Record"}
              </Button>
            )}

            <Button 
              onClick={handleBack} 
              variant="outline" 
              className="px-6 py-2 border-gray-300"
              size="lg"
            >
              ← Back to Assessment
            </Button>
          </div>

          {/* Status Messages */}
          {saved && (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 font-medium">
                ✅ Patient record successfully saved and approved!
              </p>
            </div>
          )}

          {!patientId && (
            <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-700 text-sm">
                ℹ️ Patient ID not available. Save functionality is disabled.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}