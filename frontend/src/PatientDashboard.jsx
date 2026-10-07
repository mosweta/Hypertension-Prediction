import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Download, TrendingUp, Calendar, FileText, User, Activity } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8081';

const PatientDashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  // Fetch current user (patient) ID
  useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      console.log("🟡 Fetching current user from /me endpoint");
      const response = await axios.get("/me", {
        withCredentials: true
      });
      
      console.log("✅ /me response:", response.data);
      
      if (response.data.status === "success") {
        // ✅ FIX: Use response.data.user.id (lowercase)
        const userId = response.data.user.id;
        console.log("🎯 Setting patientId:", userId);
        setPatientId(userId);
      } else {
        console.error("❌ /me returned error status");
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      console.error("Error response:", error.response?.data);
    }
  };

  fetchCurrentUser();
}, []);
useEffect(() => {
  const fetchDetails = async () => {
    try {
      console.log("🟡 Fetching current user from /me endpoint");
      const response = await axios.get("/api/patient/me", {
        withCredentials: true
      });
      
      console.log("✅ /my data:", response.data);
      
      if (response.data.status === "success") {
        // ✅ FIX: Use response.data.user.id (lowercase)
        const details= response.data;
        console.log("🎯 Setting details:", details);
        setDetails(details);
      } else {
        console.error("❌ /me returned error status");
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      console.error("Error response:", error.response?.data);
    }
  };

  fetchDetails();
}, []);

  // Fetch data when patientId is available
  useEffect(() => {
    if (patientId) {
      console.log("Patient ID available, fetching data...");
      fetchPatientPredictions();
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientPredictions = async () => {
  try {
    setLoading(true);
    console.log("Fetching predictions for patient:", patientId);
    
    // ✅ FIX: withCredentials should be in config object, not data
    const response = await axios.post('/api/patient/predictions', {
      patientId: patientId
    }, {
      withCredentials: true  // This goes in the third parameter (config)
    });
    
    console.log("Predictions response:", response.data);
    setPredictions(response.data.predictions || []);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    // Set empty array on error
    setPredictions([]);
  } finally {
    setLoading(false);
  }
};

  const fetchPatientData = async () => {
  try {
    if (!patientId) return;

    const response = await axios.post("/api/patient/details", 
      { patientId: patientId }, // Send as object
      { withCredentials: true }
    );
    
    if (response.data.status === "success") {
      setPatientData(response.data.patient);
    }
  } catch (err) {
    console.error("Error getting patient details:", err);
  }
};
  const RISK_COLORS = {
  'Low Risk': '#10b981', // green
  'Moderate Risk': '#f59e0b', // amber
  'High Risk': '#ef4444' // red
  };

  // ... rest of your functions (getRiskColor, getRiskBadge, exportToPDF, etc.)
  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskBadge = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return <Badge className="bg-red-500">High Risk</Badge>;
      case 'moderate': return <Badge className="bg-amber-500">Moderate Risk</Badge>;
      case 'low': return <Badge className="bg-green-500">Low Risk</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
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
  const exportToPDF = async (prediction = null) => {
    setExportLoading(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text('Hypertension Risk Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      
      if (patientData) {
        doc.text(`Patient: ${patientData.fName} ${patientData.lName}`, 14, 38);
        doc.text(`Patient ID: #${patientData.userId}`, 14, 46);
      }

      if (prediction) {
        // Single prediction export
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text('Prediction Details', 14, 60);
        
        doc.setFontSize(10);
        const details = [
          ['Date', new Date(prediction.created_at).toLocaleDateString()],
          ['Risk Level', prediction.risk_level],
          ['Risk Probability', `${(prediction.risk_probability * 100).toFixed(1)}%`],
          
        ];
        
        autoTable(doc, {
          startY: 65,
          head: [['Field', 'Value']],
          body: details,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] }
        });

        // Recommendations
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Health Recommendations', 14, finalY);
        
        const recs = Array.isArray(prediction.recommendations) 
          ? prediction.recommendations 
          : JSON.parse(prediction.recommendations || '[]');
        
        const recommendationRows = recs.map((rec, i) => [i + 1, rec]);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['#', 'Recommendation']],
          body: recommendationRows,
          theme: 'grid',
          styles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 170 } },
          headStyles: { fillColor: [16, 185, 129] }
        });

        if (prediction.doctor_notes) {
          const notesY = doc.lastAutoTable.finalY + 10;
          doc.setFontSize(14);
          doc.text("Doctor's Notes", 14, notesY);
          doc.setFontSize(10);
          doc.text(prediction.doctor_notes, 14, notesY + 8);
        }
      } else {
        // All predictions export
        doc.setFontSize(16);
        doc.text('Prediction History', 14, 60);
        doc.setFontSize(8);
doc.text(
          "Disclaimer: This hypertension risk prediction is generated using an AI-based decision support system and is intended to assist qualified medical professionals. The final clinical decision and responsibility remain with the attending doctor.",
          14,
          280,
          { maxWidth: 180 }
        );
        
        const historyData = predictions.map(pred => [
          new Date(pred.created_at).toLocaleDateString(),
          pred.risk_level,
          `${(pred.risk_probability * 100).toFixed(1)}%`,
          pred.binary_prediction ? 'At Risk' : 'Not At Risk'
        ]);
        
        autoTable(doc, {
          startY: 65,
          head: [['Date', 'Risk Level', 'Probability']],
          body: historyData,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] }
        });
      }
      
      doc.save(`hypertension-report-${patientData?.userId || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to generate PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const chartData = predictions
    .slice()
    .reverse()
    .map(pred => ({
      date: new Date(pred.created_at).toLocaleDateString(),
      probability: pred.risk_probability * 100,
      riskLevel: pred.risk_level,
      binary: pred.binary_prediction
    }));

  const riskDistribution = [
    { name: 'Low Risk', value: predictions.filter(p => p.risk_level?.toLowerCase() === 'low').length },
    { name: 'Moderate Risk', value: predictions.filter(p => p.risk_level?.toLowerCase() === 'moderate').length },
    { name: 'High Risk', value: predictions.filter(p => p.risk_level?.toLowerCase() === 'high').length }
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor your hypertension risk and progress</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => exportToPDF()} 
              disabled={exportLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export All'}
            </Button>
                    <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleLogout()}
                              
                            >
                              <Download className="w-4 h-4 mr-1" />
                                Logout
                            </Button>
          </div>
        </div>

        {/* Patient Info Card */}
        {patientData && (
          <Card className="mb-6 bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {patientData.fName} {patientData.lName}
                    </h3>
                    <p className="text-gray-600">Patient ID: #{patientData.userId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Predictions</p>
                  <p className="text-2xl font-bold text-gray-900">{predictions.length}</p>
                </div>
                
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Progress
            </TabsTrigger>
          </TabsList>
          {/* Latest Health Assessment */}
          {predictions[0] && (
            <Card className="bg-white/90 border-l-4 border-blue-600 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Latest Health Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Risk Level</p>
                    <p className="text-xl font-bold">
                      {predictions[0].risk_level}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Probability</p>
                    <p className="text-xl font-bold">
                      {(predictions[0].risk_probability * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    {getRiskBadge(predictions[0].risk_level)}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700">
                    Key Recommendation:
                  </p>
                  <p className="text-gray-600">
                    {Array.isArray(predictions[0].recommendations)
                      ? predictions[0].recommendations[0]
                      : 'Follow healthy lifestyle guidelines and monitor BP regularly.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Latest Risk</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {predictions[0] ? `${(predictions[0].risk_probability * 100).toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  {predictions[0] && getRiskBadge(predictions[0].risk_level)}
                </CardContent>
              </Card>
              {/* AI Disclaimer */}
              <Card className="bg-yellow-50 border-yellow-300">
                <CardContent className="p-4">
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    ⚠️ <strong>AI Disclaimer:</strong> The hypertension risk scores displayed here are generated using an AI model 
                    based on historical and clinical data. These results are for informational purposes only and 
                    should NOT replace professional medical diagnosis or treatment decisions. Always consult a qualified healthcare provider.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Risk Trend</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {predictions.length > 1 ? 
                          (predictions[0].risk_probability > predictions[1].risk_probability ? '↑' : '↓') : 
                          '→'
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">vs previous assessment</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Assessments</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{predictions.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Total predictions</p>
                </CardContent>
                
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Last Update</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {predictions[0] ? 
                          new Date(predictions[0].created_at).toLocaleDateString() : 
                          'No data'
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Progress Chart */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Risk Progress Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis label={{ value: 'Risk %', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="probability" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riskDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                      <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      dataKey="value"
                      nameKey="name"
                      >
                      {riskDistribution.map((entry, index) => (
                      <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.name] || '#6b7280'}
                      />
                      ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                      </PieChart>
                      </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No prediction data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Prediction History</CardTitle>
              </CardHeader>
              <CardContent>
                {predictions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No predictions yet</h3>
                    <p className="text-gray-600">Your prediction history will appear here after assessments.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {predictions.map((prediction, index) => (
                      <div key={prediction.predictionId} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Assessment #{predictions.length - index}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {new Date(prediction.created_at).toLocaleDateString()} at{' '}
                              {new Date(prediction.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {getRiskBadge(prediction.risk_level)}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => exportToPDF(prediction)}
                              disabled={exportLoading}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Export
                            </Button>
                             {/* <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleLogout()}
                              
                            >
                              <Download className="w-4 h-4 mr-1" />
                                Logout
                            </Button> */}
                          </div>
                          
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Risk Probability</p>
                            <p className="text-2xl font-bold" style={{ color: getRiskColor(prediction.risk_level) }}>
                              {(prediction.risk_probability * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Status</p>
                            <p className="text-lg font-semibold">
                              {prediction.binary_prediction ? 'At Risk' : 'Not At Risk'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Reviewed By</p>
                            <p className="text-lg font-semibold">Dr. #{prediction.doctorId}</p>
                          </div>
                        </div>

                        {prediction.doctor_notes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-2">Doctor's Notes</p>
                            <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{prediction.doctor_notes}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Recommendations</p>
                          <div className="space-y-2">
                            {(Array.isArray(prediction.recommendations) 
                              ? prediction.recommendations 
                              : JSON.parse(prediction.recommendations || '[]')
                            ).map((rec, i) => (
                              <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  {i + 1}
                                </span>
                                <p className="text-gray-700 leading-relaxed">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Detailed Progress Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {predictions.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No progress data</h3>
                    <p className="text-gray-600">Progress charts will appear here after multiple assessments.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Risk Trend Chart */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Risk Probability Trend</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Risk Probability']} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="probability" 
                            name="Risk Probability"
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Monthly Comparison */}
                    {predictions.length > 1 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Risk Level Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar 
                              dataKey="probability" 
                              name="Risk %" 
                              fill="#3b82f6" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientDashboard;