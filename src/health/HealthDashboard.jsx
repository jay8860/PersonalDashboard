import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Heart,
  Activity,
  Moon,
  Upload,
  FileText,
  Plus,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  User,
  Brain,
  Search,
  Bell,
  Droplet,
  Zap,
  Thermometer,
  Wind,
  Footprints,
  Ruler,
  Scale,
  Timer,
  Move,
  Music,
  Ear,
  Trash2,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Loader2,
  X,
  CheckSquare,
  Square,
  Sun
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFiles, getHealthData, deleteRecord, getDeepAnalysis, deleteBulk, getDailyNotes, createDailyNote, getTimeline, createTimelineEntry, exportJsonBackupUrl, exportCsvBackupUrl, askCoach, getMeasurements, createMeasurementEntry } from './api';

// --- Configuration for Health Metrics ---
const metricConfig = {
  // Vitals
  heartRate: { label: 'Heart Rate', unit: 'bpm', icon: Activity, color: 'red' },
  restingHeartRate: { label: 'Resting HR', unit: 'bpm', icon: Heart, color: 'rose' },
  heartRateVariabilitySDNN: { label: 'HRV', unit: 'ms', icon: Activity, color: 'indigo' },
  walkingHeartRateAverage: { label: 'Walking HR', unit: 'bpm', icon: Activity, color: 'orange' },
  heartRateRecoveryOneMinute: { label: 'HR Recovery', unit: 'bpm', icon: Activity, color: 'emerald' },
  respiratoryRate: { label: 'Resp. Rate', unit: 'br/min', icon: Wind, color: 'blue' },
  vo2Max: { label: 'VO2 Max', unit: 'ml/kg', icon: Wind, color: 'emerald' },
  oxygenSaturation: { label: 'SpO2', unit: '%', icon: Droplet, color: 'cyan' },
  bodyTemperature: { label: 'Body Temp', unit: '°C', icon: Thermometer, color: 'orange' },
  bloodGlucose: { label: 'Blood Glucose', unit: 'mg/dL', icon: Droplet, color: 'rose' },

  // Activity
  stepCount: { label: 'Steps', unit: 'steps', icon: Footprints, color: 'yellow' },
  distanceWalkingRunning: { label: 'Distance', unit: 'km', icon: Move, color: 'lime' },
  flightsClimbed: { label: 'Flights', unit: 'floors', icon: TrendingUp, color: 'orange' },
  activeEnergyBurned: { label: 'Active Cal', unit: 'kcal', icon: Zap, color: 'red' },
  basalEnergyBurned: { label: 'Resting Cal', unit: 'kcal', icon: Zap, color: 'purple' },
  appleExerciseTime: { label: 'Exercise', unit: 'min', icon: Timer, color: 'green' },
  standTime: { label: 'Stand Time', unit: 'min', icon: User, color: 'blue' },
  dietaryEnergyConsumed: { label: 'Dietary Cal', unit: 'kcal', icon: Zap, color: 'amber' },
  dietaryWater: { label: 'Water', unit: 'ml', icon: Droplet, color: 'cyan' },

  // Body
  bodyMass: { label: 'Weight', unit: 'kg', icon: Scale, color: 'blue' },
  bodyMassIndex: { label: 'BMI', unit: '', icon: Scale, color: 'indigo' },
  leanBodyMass: { label: 'Lean Mass', unit: 'kg', icon: User, color: 'cyan' },
  bodyFatPercentage: { label: 'Body Fat', unit: '%', icon: Scale, color: 'orange' },
  height: { label: 'Height', unit: 'm', icon: Ruler, color: 'teal' },
  waistCircumference: { label: 'Waist', unit: 'cm', icon: Ruler, color: 'violet' },

  // Blood Pressure
  bloodPressureSystolic: { label: 'BP Systolic', unit: 'mmHg', icon: Droplet, color: 'rose' },
  bloodPressureDiastolic: { label: 'BP Diastolic', unit: 'mmHg', icon: Droplet, color: 'rose' },

  // Mobility
  walkingSpeed: { label: 'Walk Speed', unit: 'km/h', icon: Move, color: 'blue' },
  walkingStepLength: { label: 'Step Length', unit: 'cm', icon: Ruler, color: 'indigo' },
  walkingAsymmetryPercentage: { label: 'Asymmetry', unit: '%', icon: Activity, color: 'orange' },
  walkingDoubleSupportPercentage: { label: 'Dbl Support', unit: '%', icon: Activity, color: 'cyan' },

  // Environment
  environmentalAudioExposure: { label: 'Audio Exp', unit: 'dB', icon: Ear, color: 'yellow' },
  headphoneAudioExposure: { label: 'Headphone', unit: 'dB', icon: Music, color: 'pink' },
};

// --- Main App Component ---
function App({ embedded = false, portalOffset = 0, portalIsDark = false }) {
  const [theme, setTheme] = useState(() => (embedded ? (portalIsDark ? 'dark' : 'light') : localStorage.getItem('phd_theme') || 'light'));
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResult, setUploadedResult] = useState(null);
  const [uploadedResults, setUploadedResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendTimeframe, setTrendTimeframe] = useState('Week');
  const [healthMetrics, setHealthMetrics] = useState({});
  const [ecgHistory, setEcgHistory] = useState([]);
  const [cdaHistory, setCdaHistory] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [averageSummary, setAverageSummary] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [dailyNoteInput, setDailyNoteInput] = useState('');
  const [dailyNotes, setDailyNotes] = useState([]);
  const [timelineEntries, setTimelineEntries] = useState([]);
  const [measurementEntries, setMeasurementEntries] = useState([]);
  const [measurementForm, setMeasurementForm] = useState({
    eventDate: '',
    dateText: '',
    measurementText: ''
  });
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState('');
  const [isAskingCoach, setIsAskingCoach] = useState(false);
  const [timelineForm, setTimelineForm] = useState({
    eventDate: '',
    dateText: '',
    category: 'Illness',
    title: '',
    details: ''
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingTimeline, setIsSavingTimeline] = useState(false);
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);
  const fileInputRef = useRef(null);

  const groupHistoryByDate = (history) => {
    const groups = {};
    history.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  useEffect(() => {
    fetchHistory();
    fetchNotes();
    fetchTimeline();
    fetchMeasurements();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (embedded) {
      setTheme(portalIsDark ? 'dark' : 'light');
      return;
    }

    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('phd_theme', theme);
  }, [embedded, portalIsDark, theme]);

  const fetchHistory = async () => {
    try {
      const data = await getHealthData();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchNotes = async () => {
    try {
      const data = await getDailyNotes(20);
      setDailyNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  };

  const fetchTimeline = async () => {
    try {
      const data = await getTimeline(50);
      setTimelineEntries(data);
    } catch (err) {
      console.error("Failed to fetch timeline", err);
    }
  };

  const fetchMeasurements = async () => {
    try {
      const data = await getMeasurements(50);
      setMeasurementEntries(data);
    } catch (err) {
      console.error("Failed to fetch measurements", err);
    }
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleBulkDeleteStart = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    try {
      await deleteBulk(selectedIds);
      fetchHistory();
      setSelectedIds([]);
    } catch (err) {
      alert("Failed to delete records: " + err.message);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (ids) => {
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteRecord(id);
      fetchHistory();
      if (uploadedResult && uploadedResult.id === id) closeResults();
    } catch (err) {
      alert("Failed to delete record: " + err.message);
    }
  };

  const uploadSelectedFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadErrors([]);
    try {
      const response = await uploadFiles(files, (progress) => {
        setUploadProgress(progress);
      });

      const results = response.results || [];
      const errors = response.errors || [];

      if (results.length > 0) {
        setUploadedResults(results);
        setUploadedResult(results[0]);

        // Immediate state update for responsive UI
        results.forEach(res => {
          if (res.type === 'medical_report') setMedicalHistory(prev => [res.result, ...prev]);
          if (res.type === 'electrocardiogram') setEcgHistory(prev => [res.result, ...prev]);
          if (res.type === 'cda_document') setCdaHistory(prev => [res.result, ...prev]);
        });
      }

      if (errors.length > 0) {
        setUploadErrors(errors);
      }

      fetchHistory();
    } catch (err) {
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message;
      setUploadErrors([{ file: 'Upload', error: errorMsg }]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = async (event) => {
    await uploadSelectedFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragActive(false);
    await uploadSelectedFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const openResult = (item) => {
    setUploadedResults([]);
    setUploadedResult(item);
  };

  const closeResults = () => {
    setUploadedResult(null);
    setUploadedResults([]);
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(averageSummary);
      setCopyLabel('Copied');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    } catch (err) {
      setCopyLabel('Copy failed');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    }
  };

  const toggleTheme = () => {
    if (embedded) return;
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleExport = (type, table) => {
    const url = type === 'json' ? exportJsonBackupUrl() : exportCsvBackupUrl(table);
    window.open(url, '_blank');
  };

  const handleSaveNote = async () => {
    const text = dailyNoteInput.trim();
    if (!text) return;
    setIsSavingNote(true);
    try {
      await createDailyNote(text);
      setDailyNoteInput('');
      fetchNotes();
    } catch (err) {
      alert("Failed to save note: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleTimelineChange = (field, value) => {
    setTimelineForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTimeline = async () => {
    if (!timelineForm.title.trim()) {
      alert("Please add a short title.");
      return;
    }
    setIsSavingTimeline(true);
    try {
      await createTimelineEntry({
        eventDate: timelineForm.eventDate || null,
        dateText: timelineForm.dateText?.trim(),
        category: timelineForm.category,
        title: timelineForm.title.trim(),
        details: timelineForm.details.trim()
      });
      setTimelineForm({ eventDate: '', dateText: '', category: 'Illness', title: '', details: '' });
      fetchTimeline();
    } catch (err) {
      alert("Failed to save timeline entry: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingTimeline(false);
    }
  };

  const handleMeasurementChange = (field, value) => {
    setMeasurementForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMeasurement = async () => {
    if (!measurementForm.measurementText.trim()) {
      alert("Please add your measurements.");
      return;
    }
    setIsSavingMeasurement(true);
    try {
      await createMeasurementEntry({
        eventDate: measurementForm.eventDate || null,
        dateText: measurementForm.dateText?.trim(),
        measurementText: measurementForm.measurementText.trim()
      });
      setMeasurementForm({ eventDate: '', dateText: '', measurementText: '' });
      fetchMeasurements();
    } catch (err) {
      alert("Failed to save measurements: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingMeasurement(false);
    }
  };

  const timelineFeed = useMemo(() => {
    const notes = (dailyNotes || []).map(note => ({
      id: `note-${note.id}`,
      type: 'note',
      date: note.created_at,
      title: 'Daily Note',
      category: 'Note',
      details: note.note_text
    }));

    const events = (timelineEntries || []).map(entry => ({
      id: `event-${entry.id}`,
      type: 'event',
      date: entry.event_date || entry.created_at,
      dateText: entry.date_text,
      title: entry.title,
      category: entry.category || 'Other',
      details: entry.details
    }));

    const measurements = (measurementEntries || []).map(entry => ({
      id: `measure-${entry.id}`,
      type: 'measurement',
      date: entry.event_date || entry.created_at,
      dateText: entry.date_text,
      title: 'Body Measurements',
      category: 'Measurements',
      details: entry.measurement_text
    }));

    return [...events, ...notes, ...measurements].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [dailyNotes, timelineEntries, measurementEntries]);

  const handleAskCoach = async () => {
    const question = coachQuestion.trim();
    if (!question) return;
    setIsAskingCoach(true);
    setCoachAnswer('');
    try {
      const response = await askCoach({
        question,
        metrics: healthMetrics,
        medicalHistory,
        ecgHistory,
        cdaHistory,
        dailyNotes: dailyNotes.slice(0, 10),
        timeline: timelineEntries.slice(0, 20),
        bodyMeasurements: measurementEntries.slice(0, 10)
      });
      setCoachAnswer(response.answer || 'No response received.');
    } catch (err) {
      setCoachAnswer(err.response?.data?.error || err.message || 'Failed to get response.');
    } finally {
      setIsAskingCoach(false);
    }
  };

  // Process history to get the latest health data and clinical history
  useEffect(() => {
    if (history.length > 0) {
      // 1. Extract Reports
      const reports = history.filter(item => item.type === 'medical_report' && item.data).map(item => item.data);
      const uniqueReports = [];
      const seenSummaries = new Set();
      reports.forEach(r => { if (!seenSummaries.has(r.summary)) { uniqueReports.push(r); seenSummaries.add(r.summary); } });
      setMedicalHistory(uniqueReports);

      // 2. Extract ECGs
      const ecgs = history.filter(item => item.type === 'electrocardiogram' && item.data).map(item => item.data);
      setEcgHistory(ecgs);

      // 3. Extract CDAs
      const cdas = history.filter(item => item.type === 'cda_document' && item.data).map(item => item.data);
      setCdaHistory(cdas);

      // 4. Extract standard Apple Health metrics from the latest upload
      const latestAppleHealth = history.find(item => item.type === 'apple_health');
      if (latestAppleHealth && latestAppleHealth.data) {
        processHealthData(latestAppleHealth.data);
      }
    }
  }, [history]);

  // Comprehensive Deep Analysis Trigger
  useEffect(() => {
    const fetchDeepAnalysis = async () => {
      if (Object.keys(healthMetrics).length > 0) {
        setIsAnalyzing(true);
        try {
          const latestNote = dailyNotes[0] || null;
          const result = await getDeepAnalysis(healthMetrics, medicalHistory, ecgHistory, cdaHistory, latestNote, timelineEntries, measurementEntries);
          setDeepAnalysis(result);
        } catch (e) {
          console.error("Deep analysis failed", e);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    if (activeTab === 'insights' && !deepAnalysis && history.length > 0) {
      console.log("Deep Analysis Trigger: Conditions met. history:", history.length, "metrics:", Object.keys(healthMetrics).length);
      fetchDeepAnalysis();
    }
  }, [activeTab, healthMetrics, medicalHistory, history, deepAnalysis, dailyNotes, timelineEntries, measurementEntries]);

  // --- AI Insight Generator ---
  const generateInsights = (metrics, medHistory = []) => {
    const insights = [];
    const suggestions = [];

    // 1. Heart Rate Analysis
    if (metrics.heartRate) {
      if (metrics.heartRate > 100) {
        insights.push({ icon: AlertCircle, title: "Elevated Heart Rate", desc: "Your average HR is high today. Consider verifying with manual measurement or resting.", color: "rose" });
        suggestions.push("Avoid caffeine and heavy meals.");
      } else if (metrics.heartRate < 60 && metrics.heartRate > 40) {
        insights.push({ icon: CheckCircle2, title: "Athlete's Heart", desc: "Resting HR indicates excellent cardiovascular fitness.", color: "emerald" });
      }
    }

    // 2. Steps / Activity
    if (metrics.stepCount) {
      if (metrics.stepCount < 3000) {
        insights.push({ icon: AlertCircle, title: "Low Activity", desc: "Step count is below recommended 5,000 daily minimum.", color: "rose" });
        suggestions.push("Take a 15-minute walk after dinner.");
      } else if (metrics.stepCount > 8000) {
        insights.push({ icon: CheckCircle2, title: "Active Day", desc: "You've met the daily activity goal!", color: "emerald" });
        suggestions.push("Great job! Stay hydrated.");
      }
    }

    // 3. Sleep
    if (metrics.sleepBreakdown) {
      const totalHours = metrics.sleepBreakdown.total / 60;
      if (totalHours < 6) {
        insights.push({ icon: AlertCircle, title: "Sleep Debt", desc: "Less than 6 hours of sleep detected.", color: "rose" });
        suggestions.push("Try to sleep 30 mins earlier tonight.");
      } else if (metrics.sleepBreakdown.deep / 60 < 1) {
        suggestions.push("Deep sleep is low. Avoid screens before bed.");
      }
    }

    // 4. Medical Report Integration (Holistic Picture)
    if (medHistory.length > 0) {
      const latestReport = medHistory[0];
      const findings = (latestReport.concerns || []).join(" ").toLowerCase();

      if (latestReport.concerns && latestReport.concerns.length > 0) {
        insights.push({ icon: FileText, title: "Report Sync", desc: `Coaching adjusted for: ${latestReport.concerns[0]}`, color: "purple" });

        // CROSS-METRIC RULES

        // Rule: Vitamin D + Steps
        if (findings.includes("vitamin d")) {
          if (metrics.stepCount < 5000) {
            insights.push({ icon: Sparkles, title: "Outdoor Motivation", desc: "Vitamin D is low and activity is minimal. Aim for a 20-min sun-walk.", color: "yellow" });
            suggestions.push("Combine walks with morning sunlight for Vitamin D synthesis.");
          } else {
            insights.push({ icon: CheckCircle2, title: "Sun Exposure", desc: "Great job staying active despite Vitamin D deficiency report.", color: "emerald" });
          }
        }

        // Rule: Gastritis/Upset Stomach + Activity
        if (findings.includes("gastritis") || findings.includes("upset stomach") || findings.includes("stomach")) {
          insights.push({ icon: AlertCircle, title: "Digestive Care", desc: "Report indicates stomach sensitivity. Keep meals light.", color: "orange" });
          if (metrics.stepCount > 10000) {
            suggestions.push("Highly active today; ensure you are not straining your stomach area.");
          }
          suggestions.push("Drink small sips of water throughout the day for gastritis.");
        }

        // Rule: Sleep + Stress/Fatigue
        if (findings.includes("fatigue") || findings.includes("tired")) {
          if (metrics.sleepBreakdown && metrics.sleepBreakdown.total / 60 < 7) {
            insights.push({ icon: Moon, title: "Recovery Needed", desc: "Report mentions fatigue and sleep is < 7h. Prioritize rest.", color: "indigo" });
          }
        }
      }
    }

    // Default messages if everything is normal or missing
    if (insights.length === 0) {
      insights.push({ icon: CheckCircle2, title: "Balanced Metrics", desc: "Your vitals are within normal range today.", color: "emerald" });
    }
    if (suggestions.length === 0) {
      suggestions.push("Maintain a consistent sleep schedule.");
      suggestions.push("Drink 2L of water daily.");
    }

    return { insights, suggestions };
  };

  const [aiInsights, setAiInsights] = useState({ insights: [], suggestions: [] });
  const [dailyDate, setDailyDate] = useState("Today");

  const highlightStyles = {
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', title: 'text-rose-800', desc: 'text-rose-700/80' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', title: 'text-emerald-800', desc: 'text-emerald-700/80' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', title: 'text-indigo-800', desc: 'text-indigo-700/80' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-100', title: 'text-purple-800', desc: 'text-purple-700/80' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', title: 'text-yellow-800', desc: 'text-yellow-700/80' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-100', title: 'text-orange-800', desc: 'text-orange-700/80' }
  };

  const insightColorClass = {
    rose: 'text-rose-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    indigo: 'text-indigo-400',
    blue: 'text-blue-400'
  };

  const activityMetricKeys = new Set([
    'stepCount',
    'distanceWalkingRunning',
    'activeEnergyBurned',
    'basalEnergyBurned',
    'flightsClimbed',
    'appleExerciseTime',
    'standTime',
    'dietaryEnergyConsumed',
    'dietaryWater'
  ]);

  const trendConfigs = [
    { key: 'stepCount', label: 'Steps', unit: 'steps', color: '#3b82f6', primary: true },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', primary: true },
    { key: 'sleep', label: 'Sleep', unit: 'h', color: '#6366f1', primary: true },
    { key: 'activeEnergyBurned', label: 'Active Calories', unit: 'kcal', color: '#f97316', primary: true },
    { key: 'bodyMass', label: 'Weight', unit: 'kg', color: '#0ea5e9', primary: true },

    { key: 'restingHeartRate', label: 'Resting HR', unit: 'bpm', color: '#f43f5e' },
    { key: 'heartRateVariabilitySDNN', label: 'HRV', unit: 'ms', color: '#8b5cf6' },
    { key: 'respiratoryRate', label: 'Resp. Rate', unit: 'br/min', color: '#06b6d4' },
    { key: 'vo2Max', label: 'VO2 Max', unit: 'ml/kg', color: '#10b981' },
    { key: 'oxygenSaturation', label: 'SpO2', unit: '%', color: '#22d3ee' },
    { key: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL', color: '#fb7185' },
    { key: 'bloodPressureSystolic', label: 'BP Systolic', unit: 'mmHg', color: '#f59e0b' },
    { key: 'bloodPressureDiastolic', label: 'BP Diastolic', unit: 'mmHg', color: '#f59e0b' },
    { key: 'walkingHeartRateAverage', label: 'Walking HR', unit: 'bpm', color: '#f97316' },
    { key: 'heartRateRecoveryOneMinute', label: 'HR Recovery', unit: 'bpm', color: '#22c55e' },
    { key: 'bodyFatPercentage', label: 'Body Fat', unit: '%', color: '#f59e0b' },
    { key: 'distanceWalkingRunning', label: 'Distance', unit: 'km', color: '#84cc16' },
    { key: 'appleExerciseTime', label: 'Exercise', unit: 'min', color: '#22c55e' },
    { key: 'standTime', label: 'Stand Time', unit: 'min', color: '#0ea5e9' },
    { key: 'dietaryEnergyConsumed', label: 'Dietary Cal', unit: 'kcal', color: '#f97316' },
    { key: 'dietaryWater', label: 'Water', unit: 'ml', color: '#38bdf8' }
  ];

  const getMetricValue = (day, key) => {
    if (!day || day[key] === undefined || day[key] === null) return null;
    const raw = day[key];
    if (typeof raw === 'object') {
      if (activityMetricKeys.has(key)) return raw.sum;
      return raw.sum / raw.count;
    }
    return raw;
  };

  const normalizeTrendValue = (key, value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    if (key === 'sleep') return Math.round((value / 60) * 10) / 10;
    if (activityMetricKeys.has(key)) return Math.round(value);
    return Math.round(value * 10) / 10;
  };

  const formatTrendLabel = (dateStr, timeframe) => {
    if (!dateStr) return '';
    if (timeframe === 'Year') {
      return new Date(dateStr + "-01").toLocaleDateString(undefined, { month: 'short' });
    }
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const buildTrendSeries = (metricKey) => {
    if (!historicalData || historicalData.length === 0) return [];
    const source = [...historicalData];

    if (trendTimeframe === 'Year') {
      const groups = {};
      source.forEach(day => {
        const month = day.date.substring(0, 7);
        const raw = getMetricValue(day, metricKey);
        if (raw === null) return;
        if (!groups[month]) groups[month] = [];
        groups[month].push(raw);
      });

      return Object.entries(groups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, values]) => {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          return {
            name: formatTrendLabel(month, 'Year'),
            value: normalizeTrendValue(metricKey, avg)
          };
        });
    }

    const windowSize = trendTimeframe === 'Week' ? 7 : 30;
    const windowed = source.slice(-windowSize);
    return windowed.map(day => {
      const raw = getMetricValue(day, metricKey);
      return {
        name: formatTrendLabel(day.date, trendTimeframe),
        value: normalizeTrendValue(metricKey, raw)
      };
    });
  };

  const metricMeta = {
    sleep: { label: 'Sleep', unit: 'h' },
    ...metricConfig
  };

  const formatMetricValue = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1);
  };

  const buildAverageSummary = () => {
    if (!historicalData || historicalData.length === 0) {
      return 'Upload an Apple Health export (XML) to generate monthly and yearly averages.';
    }

    const sorted = [...historicalData].sort((a, b) => a.date.localeCompare(b.date));
    const endDate = new Date(sorted[sorted.length - 1].date);
    const ranges = [
      { label: 'Last 30 days', days: 30 },
      { label: 'Last 365 days', days: 365 }
    ];

    const metricKeys = ['sleep', ...new Set(trendConfigs.map(t => t.key)), ...Object.keys(metricConfig).filter(k => !trendConfigs.some(t => t.key === k))];

    const lines = [];
    lines.push('Health Metrics Averages');
    lines.push(`Data window ends on ${endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`);
    lines.push('Missing days are ignored (no zero padding).');

    ranges.forEach(range => {
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (range.days - 1));

      const rangeDays = sorted.filter(day => {
        const d = new Date(day.date);
        return d >= startDate && d <= endDate;
      });

      lines.push('');
      lines.push(`${range.label} (${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`);

      metricKeys.forEach(key => {
        const values = rangeDays
          .map(day => getMetricValue(day, key))
          .filter(val => val !== null && val !== undefined && !Number.isNaN(val));

        if (values.length === 0) return;

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const normalized = normalizeTrendValue(key, avg);
        const formatted = formatMetricValue(normalized);
        if (formatted === null) return;

        const label = metricMeta[key]?.label || key;
        const unit = metricMeta[key]?.unit ? ` ${metricMeta[key].unit}` : '';
        lines.push(`- ${label}: ${formatted}${unit} (from ${values.length} days)`);
      });
    });

    return lines.join('\n');
  };

  useEffect(() => {
    setAverageSummary(buildAverageSummary());
  }, [historicalData]);

  useEffect(() => {
    const next = generateInsights(healthMetrics, medicalHistory);
    setAiInsights(next);
  }, [healthMetrics, medicalHistory]);

  const processHealthData = (data) => {
    const parseDate = (dStr) => dStr ? new Date(dStr.replace(' +', '+')) : new Date();
    const formatTime = (dObj) => dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // NEW: Handle Historical Data from backend
    if (data.history) {
      setHistoricalData(data.history);
      const todayKey = new Date().toISOString().split('T')[0];
      setDailyDate(new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }

    const newMetrics = {};
    const metricsToUse = data.metrics || data;

    Object.keys(metricConfig).forEach(key => {
      if (metricsToUse[key] !== undefined && metricsToUse[key] !== null) {
        const raw = metricsToUse[key];
        const val = typeof raw === 'object' ? (raw.sum / raw.count) : raw;
        if (val !== undefined && val !== null && !Number.isNaN(val)) {
          newMetrics[key] = typeof val === 'number' ? Math.round(val) : val;
          newMetrics[`${key}_context`] = "Latest";
        }
      }
    });

    if (newMetrics.bloodPressureSystolic && newMetrics.bloodPressureDiastolic) {
      newMetrics.bp = `${newMetrics.bloodPressureSystolic}/${newMetrics.bloodPressureDiastolic}`;
    }

    setHealthMetrics(prev => ({ ...prev, ...newMetrics }));
  };




  const latestMedicalReport = medicalHistory[0] || null;
  const latestReportVitals = latestMedicalReport?.vitals || [];
  const sidebarTopInset = embedded ? portalOffset + 12 : 24;
  const sidebarHeight = embedded ? `calc(100vh - ${portalOffset + 36}px)` : undefined;

  return (
    <div
      className="min-h-screen bg-[#f8fafc] font-sans"
      style={embedded ? { minHeight: `calc(100vh - ${portalOffset}px)` } : undefined}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept=".xml,.csv,.xlsx,.xls,.pdf,.txt,.heic,.heif,image/*,application/pdf,text/plain"
      />

      {/* Sidebar - Modern Floating Style */}
      <nav
        className="fixed left-6 top-6 bottom-6 w-24 lg:w-72 bg-white rounded-[3rem] shadow-2xl z-30 border border-slate-100 flex flex-col p-8 transition-all duration-500 overflow-hidden"
        style={embedded ? { top: sidebarTopInset, bottom: 'auto', height: sidebarHeight } : undefined}
      >
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 shrink-0">
            <Activity className="text-white w-6 h-6" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-slate-900 hidden lg:block">HealthAI</span>
        </div>

        <div className="flex-1 space-y-3">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
            { id: 'reports', icon: ClipboardList, label: 'Reports' },
            { id: 'insights', icon: Sparkles, label: 'AI Coach' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center gap-4 p-5 rounded-3xl transition-all duration-300 ${activeTab === item.id
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
            >
              <item.icon size={24} className={activeTab === item.id ? 'animate-pulse' : ''} />
              <span className="font-bold text-lg hidden lg:block">{item.label}</span>
              {activeTab === item.id && <motion.div layoutId="active" className="ml-auto w-2 h-2 bg-white rounded-full hidden lg:block" />}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          {embedded ? (
            <div className="w-full flex items-center gap-4 p-5 text-slate-400 rounded-3xl font-bold">
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
              <span className="hidden lg:block text-lg">Portal Theme</span>
            </div>
          ) : (
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-4 p-5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-3xl transition-all font-bold"
            >
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
              <span className="hidden lg:block text-lg">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          )}
          <button
            onClick={() => handleExport('json')}
            className="w-full flex items-center gap-4 p-5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-3xl transition-all font-bold"
          >
            <FileText size={24} />
            <span className="hidden lg:block text-lg">Backup JSON</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`ml-36 lg:ml-[22rem] mr-6 pb-20 ${embedded ? 'pt-6' : 'pt-10'}`}>
        <div className="max-w-6xl mx-auto">

          {/* Top Bar */}
          <header className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Daily Pulse</h2>
              <p className="text-slate-400 font-medium mt-1 italic">Welcome back, Jayant • {dailyDate}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search data..." className="bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-6 w-64 outline-none focus:border-blue-500 shadow-sm transition-all" />
              </div>

              {/* Progress Container */}
              {isUploading && (
                <div className="flex flex-col items-end gap-1 min-w-[200px]">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                    <Loader2 className="animate-spin" size={14} />
                    <span>{uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : 'Processing AI...'}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1 shadow-inner">
                    <motion.div
                      layout
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                {isUploading ? "Please Wait..." : "Upload Files"}
              </button>
            </div>
          </header>

          {uploadErrors.length > 0 && (
            <div className="mb-10 rounded-[2rem] border border-rose-100 bg-rose-50 px-6 py-5">
              <div className="flex items-center gap-3 text-rose-700 font-black mb-3">
                <AlertCircle size={18} />
                Some files failed to upload
              </div>
              <div className="space-y-2">
                {uploadErrors.map((err, i) => (
                  <div key={i} className="text-sm font-bold text-rose-700/80">
                    {err.file}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Stats Row */}
                <div className="lg:col-span-8 grid grid-cols-1 gap-6">
                  <div className="glass-card p-10 rounded-[3rem]">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Monthly & Yearly Averages</h3>
                        <p className="text-slate-400 text-sm font-medium">Copyable summary based on uploaded Apple Health data.</p>
                      </div>
                      <button
                        onClick={handleCopySummary}
                        className="px-5 py-2 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                      >
                        {copyLabel}
                      </button>
                    </div>
                    <textarea
                      className="w-full h-64 md:h-72 rounded-2xl border border-slate-100 p-5 text-sm font-medium text-slate-700 bg-white shadow-inner resize-none"
                      value={averageSummary}
                      readOnly
                    />
                  </div>

                  {/* Chart Card */}
                  <div className="glass-card p-10 rounded-[3rem]">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Health Trends</h3>
                        <p className="text-slate-400 text-sm font-medium">Long-term tracking from all health uploads</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                          {['Week', 'Month', 'Year'].map(t => (
                            <button
                              key={t}
                              onClick={() => setTrendTimeframe(t)}
                              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${trendTimeframe === t ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {historicalData.length === 0 && (
                      <div className="text-center py-12 text-slate-400 font-bold">
                        Upload an Apple Health export (XML) to see full trends.
                      </div>
                    )}
                    {historicalData.length > 0 && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {trendConfigs.filter(t => t.primary).map((trend) => {
                            const series = buildTrendSeries(trend.key);
                            const hasData = series.some(point => point.value !== null && point.value !== undefined);
                            if (!hasData) return null;
                            const latestPoint = [...series].reverse().find(point => point.value !== null && point.value !== undefined);
                            const latestValue = latestPoint ? latestPoint.value : '--';
                            return (
                              <div key={trend.key} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <p className="text-xs uppercase font-black text-slate-400 tracking-widest">{trend.label}</p>
                                    <h4 className="text-2xl font-black text-slate-900">{latestValue} <span className="text-sm text-slate-400">{trend.unit}</span></h4>
                                  </div>
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: trend.color }} />
                                </div>
                                <div className="h-40">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={series}>
                                      <defs>
                                        <linearGradient id={`trend-${trend.key}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={trend.color} stopOpacity={0.25} />
                                          <stop offset="95%" stopColor={trend.color} stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={6} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                      <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', padding: '12px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                      />
                                      <Area type="monotone" dataKey="value" stroke={trend.color} strokeWidth={3} fill={`url(#trend-${trend.key})`} connectNulls />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {trendConfigs.filter(t => !t.primary).map((trend) => {
                            const series = buildTrendSeries(trend.key);
                            const hasData = series.some(point => point.value !== null && point.value !== undefined);
                            if (!hasData) return null;
                            const latestPoint = [...series].reverse().find(point => point.value !== null && point.value !== undefined);
                            const latestValue = latestPoint ? latestPoint.value : '--';
                            return (
                              <div key={trend.key} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <p className="text-xs uppercase font-black text-slate-400 tracking-widest">{trend.label}</p>
                                    <h4 className="text-2xl font-black text-slate-900">{latestValue} <span className="text-sm text-slate-400">{trend.unit}</span></h4>
                                  </div>
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: trend.color }} />
                                </div>
                                <div className="h-40">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={series}>
                                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={6} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                      <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', padding: '12px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                      />
                                      <Line type="monotone" dataKey="value" stroke={trend.color} strokeWidth={2.5} dot={false} connectNulls />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {latestMedicalReport && (
                    <div className="glass-card p-10 rounded-[3rem]">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                          <ClipboardList size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-2xl text-slate-800">Latest Report Summary</h4>
                          <p className="text-slate-400 text-sm font-bold">AI extracted from your most recent report</p>
                        </div>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed mb-6">
                        {latestMedicalReport.summary || "Summary unavailable."}
                      </p>

                      {latestReportVitals.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {latestReportVitals.slice(0, 6).map((v, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="font-bold text-slate-600">{v.name}</span>
                              <span className="font-black text-slate-900">{v.value} <span className="text-xs text-slate-400 font-black">{v.unit}</span></span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ResultPanel title="Concerns" items={latestMedicalReport.concerns || []} color="rose" icon={AlertCircle} />
                        <ResultPanel title="Positives" items={latestMedicalReport.positives || []} color="emerald" icon={CheckCircle2} />
                      </div>

                      {medicalHistory.length > 1 && (
                        <div className="mt-8">
                          <h5 className="text-sm uppercase tracking-widest font-black text-slate-400 mb-4">Other Recent Reports</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {medicalHistory.slice(1, 3).map((rep, idx) => (
                              <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Report {idx + 2}</p>
                                <p className="text-sm font-bold text-slate-700">{rep.summary || "Summary unavailable."}</p>
                                {rep.concerns && rep.concerns.length > 0 && (
                                  <p className="text-xs font-bold text-rose-500 mt-2">Top concern: {rep.concerns[0]}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New: Clinical Findings from Reports */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {cdaHistory.length > 0 && (
                      <div className="glass-card p-10 rounded-[3rem]">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                            <ShieldCheck size={28} />
                          </div>
                          <div>
                            <h4 className="font-black text-xl text-slate-800">Latest Lab Observations</h4>
                            <p className="text-slate-400 text-sm font-bold">From structured clinical exports</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {cdaHistory[0]?.observations.slice(0, 4).map((obs, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                              <span className="font-bold text-slate-600 truncate mr-4">{obs.name}</span>
                              <span className="font-black text-emerald-600 shrink-0">{obs.value} <span className="text-[10px] text-slate-400 font-black">{obs.unit}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {medicalHistory.length > 0 && (
                      <div className="glass-card p-10 rounded-[3rem]">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                            <ClipboardList size={28} />
                          </div>
                          <div>
                            <h4 className="font-black text-xl text-slate-800">Key Report Highlights</h4>
                            <p className="text-slate-400 text-sm font-bold">AI extracted from clinical notes</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {medicalHistory.slice(0, 1).map(h =>
                            (h.highlights || []).slice(0, 3).map((high, i) => (
                              <div key={i} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${high.color === 'rose' ? 'bg-rose-500' : high.color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                <div>
                                  <p className="font-black text-sm text-slate-800 leading-tight">{high.title}</p>
                                  <p className="text-xs text-slate-500 font-medium mt-1">{high.desc.substring(0, 60)}...</p>
                                </div>
                              </div>
                            ))
                          )}
                          {medicalHistory.length > 0 && !(medicalHistory[0].highlights) && (
                            <p className="text-slate-400 text-sm italic">Highlighting historical report data...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-4 space-y-8">
                  {/* AI Quick Insight */}
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden group">
                    <Sparkles className="absolute top-[-20px] right-[-20px] w-40 h-40 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                      <div className="bg-white/20 backdrop-blur-xl w-14 h-14 rounded-2xl flex items-center justify-center mb-8">
                        <Brain className="text-white" size={28} />
                      </div>
                      <h3 className="text-3xl font-black mb-4 leading-tight">AI Health Summary</h3>
                      <p className="text-indigo-100 text-sm font-medium mb-8 leading-relaxed opacity-80">
                        Daily analysis for {dailyDate}.
                      </p>

                      <div className="space-y-6">
                        {aiInsights.insights.slice(0, 2).map((insight, idx) => (
                          <InsightItem key={idx} icon={insight.icon} title={insight.title} desc={insight.desc} />
                        ))}
                        {aiInsights.insights.length === 0 && (
                          <div className="text-center text-indigo-200 text-sm">No significant alerts today.</div>
                        )}
                      </div>

                      <button onClick={() => setActiveTab('insights')} className="w-full mt-10 py-5 bg-white text-indigo-600 rounded-[1.5rem] font-black text-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group/btn">
                        Open Health Report
                        <ChevronRight className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="glass-card p-8 rounded-[3.5rem]">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-slate-900">Recent Records</h3>
                      <button onClick={() => setActiveTab('reports')} className="text-blue-600 font-bold text-sm hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {history.length > 0 ? history.slice(0, 4).map((item, idx) => (
                        <div key={idx} onClick={() => { openResult(item); }} className="flex items-center justify-between p-5 bg-white border border-slate-50 rounded-3xl hover:border-blue-200 transition-all cursor-pointer shadow-sm group">
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                              {item.type.includes('apple') ? <Activity size={22} className="text-blue-500" /> : <ClipboardList size={22} className="text-indigo-500" />}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-sm capitalize">{item.type.replace('_', ' ')}</p>
                              <p className="text-xs text-slate-400 font-bold mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(item.id); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-10">
                          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Search size={24} />
                          </div>
                          <p className="text-slate-400 text-sm font-medium italic">Discovery starts here. Upload a record!</p>
                        </div>
                      )}
                    </div>
                  </div >

                  {/* Timeline & Notes */}
                  <div className="glass-card p-8 rounded-[3.5rem]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-900">Timeline & Notes</h3>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Latest</span>
                    </div>
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {timelineFeed.length > 0 ? timelineFeed.map(item => (
                        <div key={item.id} className="p-4 bg-white border border-slate-50 rounded-3xl shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black text-slate-400">
                              {item.date
                                ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : (item.dateText || 'Date unknown')}
                            </p>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${item.type === 'note' ? 'bg-blue-50 text-blue-600' : item.type === 'measurement' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {item.type === 'note' ? 'Note' : item.type === 'measurement' ? 'Measurements' : item.category}
                            </span>
                          </div>
                          <p className="font-black text-sm text-slate-800 mb-1">{item.title}</p>
                          {item.details && <p className="text-xs font-bold text-slate-500">{item.details}</p>}
                        </div>
                      )) : (
                        <div className="text-center text-slate-400 text-sm font-bold">No notes or timeline entries yet.</div>
                      )}
                    </div>
                  </div>
                </div >
              </motion.div >
            )
            }

            {
              activeTab === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-12 rounded-[3rem]"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">Health History</h3>
                      <p className="text-slate-400 font-bold mt-2">Grouped by date of upload</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {history.length > 0 && (
                        <button
                          onClick={handleBulkDeleteStart}
                          disabled={selectedIds.length === 0}
                          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm border transition-all ${selectedIds.length > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' : 'bg-slate-50 text-slate-300 border-slate-50 cursor-not-allowed'}`}
                        >
                          <Trash2 size={18} />
                          Delete Selected ({selectedIds.length})
                        </button>
                      )}

                      <button
                        onClick={() => handleSelectAll(history.map(x => x.id))}
                        className="flex items-center gap-2 bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm border border-slate-100 hover:bg-slate-100 transition-all"
                      >
                        {selectedIds.length === history.length && history.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                        {selectedIds.length === history.length && history.length > 0 ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                  </div>

                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`mb-12 rounded-[3rem] border-2 border-dashed p-10 text-center transition-all ${isDragActive ? 'border-blue-500 bg-blue-50/40' : 'border-slate-100 bg-slate-50/40'}`}
                  >
                    <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                      <Upload size={26} />
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 mb-2">Bulk Upload Medical Files</h4>
                    <p className="text-slate-400 font-bold text-sm mb-6">
                      Drag & drop multiple files or select them together. Supported: PDF, TXT, images, XML, CSV, Excel.
                    </p>
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-blue-600 transition-all"
                    >
                      <Plus size={18} />
                      Select Files
                    </button>
                  </div>

                  <div className="mb-12 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div>
                        <h4 className="text-2xl font-black text-slate-900">Export Backup</h4>
                        <p className="text-slate-400 text-sm font-bold">Download your data as JSON or CSV.</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleExport('json')}
                          className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all"
                        >
                          Export JSON (Full)
                        </button>
                        <button
                          onClick={() => handleExport('csv', 'health_data')}
                          className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          CSV: Health Data
                        </button>
                        <button
                          onClick={() => handleExport('csv', 'daily_notes')}
                          className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          CSV: Daily Notes
                        </button>
                        <button
                          onClick={() => handleExport('csv', 'medical_timeline')}
                          className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          CSV: Timeline
                        </button>
                        <button
                          onClick={() => handleExport('csv', 'body_measurements')}
                          className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          CSV: Measurements
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                          <Brain size={22} />
                        </div>
                        <div>
                          <h4 className="text-2xl font-black text-slate-900">How are you feeling today?</h4>
                          <p className="text-slate-400 text-sm font-bold">Daily symptoms / mood check‑in</p>
                        </div>
                      </div>
                      <textarea
                        value={dailyNoteInput}
                        onChange={(e) => setDailyNoteInput(e.target.value)}
                        placeholder="Example: Feeling feverish with sore throat. Slept poorly, low energy..."
                        className="w-full h-32 rounded-2xl border border-slate-100 p-4 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={handleSaveNote}
                          disabled={isSavingNote}
                          className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                          {isSavingNote ? 'Saving...' : 'Save Today’s Note'}
                        </button>
                      </div>

                      {dailyNotes.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <p className="text-xs uppercase tracking-widest font-black text-slate-400">Recent Notes</p>
                          {dailyNotes.slice(0, 3).map((note) => (
                            <div key={note.id} className="p-4 rounded-2xl bg-white border border-slate-100">
                              <p className="text-xs font-black text-slate-400 mb-2">
                                {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-sm font-bold text-slate-700">{note.note_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                          <ClipboardList size={22} />
                        </div>
                        <div>
                          <h4 className="text-2xl font-black text-slate-900">Medical Timeline</h4>
                          <p className="text-slate-400 text-sm font-bold">Add surgeries, episodes, medications, etc.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Date (optional)</label>
                          <input
                            type="date"
                            value={timelineForm.eventDate}
                            onChange={(e) => handleTimelineChange('eventDate', e.target.value)}
                            className="w-full mt-2 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Category</label>
                          <select
                            value={timelineForm.category}
                            onChange={(e) => handleTimelineChange('category', e.target.value)}
                            className="w-full mt-2 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option>Illness</option>
                            <option>Surgery</option>
                            <option>Medication</option>
                            <option>Allergy</option>
                            <option>Episode</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Title</label>
                        <input
                          type="text"
                          value={timelineForm.title}
                          onChange={(e) => handleTimelineChange('title', e.target.value)}
                          placeholder="e.g., Tonsillitis treatment, Knee surgery"
                          className="w-full mt-2 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Approx Date / Year (optional)</label>
                        <input
                          type="text"
                          value={timelineForm.dateText}
                          onChange={(e) => handleTimelineChange('dateText', e.target.value)}
                          placeholder="e.g., 2018, Winter 2020, Around March 2022"
                          className="w-full mt-2 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Details</label>
                        <textarea
                          value={timelineForm.details}
                          onChange={(e) => handleTimelineChange('details', e.target.value)}
                          placeholder="Add symptoms, medications, doctor notes, etc."
                          className="w-full mt-2 h-24 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={handleSaveTimeline}
                          disabled={isSavingTimeline}
                          className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
                        >
                          {isSavingTimeline ? 'Saving...' : 'Add to Timeline'}
                        </button>
                      </div>

                      {timelineEntries.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <p className="text-xs uppercase tracking-widest font-black text-slate-400">Recent Timeline</p>
                          {timelineEntries.slice(0, 4).map((entry) => (
                            <div key={entry.id} className="p-4 rounded-2xl bg-white border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black text-slate-400">
                                  {entry.event_date
                                    ? new Date(entry.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                    : (entry.date_text || 'Date unknown')}
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                                  {entry.category || 'Other'}
                                </span>
                              </div>
                              <p className="text-sm font-black text-slate-800">{entry.title}</p>
                              {entry.details && <p className="text-xs font-bold text-slate-500 mt-1">{entry.details}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-12 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                        <Ruler size={22} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900">Body Measurements</h4>
                        <p className="text-slate-400 text-sm font-bold">Add long‑form notes or bullet points (date optional).</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Date (optional)</label>
                        <input
                          type="date"
                          value={measurementForm.eventDate}
                          onChange={(e) => handleMeasurementChange('eventDate', e.target.value)}
                          className="w-full mt-2 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Approx Date / Year (optional)</label>
                        <input
                          type="text"
                          value={measurementForm.dateText}
                          onChange={(e) => handleMeasurementChange('dateText', e.target.value)}
                          placeholder="e.g., 2021, Summer 2020"
                          className="w-full mt-2 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Measurements (free‑form)</label>
                      <textarea
                        value={measurementForm.measurementText}
                        onChange={(e) => handleMeasurementChange('measurementText', e.target.value)}
                        placeholder="- Chest: 96 cm\n- Waist: 78 cm\n- Hips: 92 cm\n- Body fat: 18%\nOther notes..."
                        className="w-full mt-2 h-32 rounded-2xl border border-slate-100 p-3 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={handleSaveMeasurement}
                        disabled={isSavingMeasurement}
                        className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-emerald-600 transition-all disabled:opacity-50"
                      >
                        {isSavingMeasurement ? 'Saving...' : 'Save Measurements'}
                      </button>
                    </div>

                    {measurementEntries.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-xs uppercase tracking-widest font-black text-slate-400">Recent Measurements</p>
                        {measurementEntries.slice(0, 3).map((entry) => (
                          <div key={entry.id} className="p-4 rounded-2xl bg-white border border-slate-100">
                            <p className="text-xs font-black text-slate-400 mb-2">
                              {entry.event_date
                                ? new Date(entry.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : (entry.date_text || 'Date unknown')}
                            </p>
                            <p className="text-sm font-bold text-slate-700 whitespace-pre-line">{entry.measurement_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-16">
                    {Object.entries(groupHistoryByDate(history)).map(([date, items]) => (
                      <div key={date}>
                        <div className="flex items-center gap-4 mb-8">
                          <h4 className="text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-4">{date}</h4>
                          <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {items.map((item, idx) => (
                            <div
                              key={item.id}
                              onClick={() => openResult(item)}
                              className={`group relative bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 ${selectedIds.includes(item.id) ? 'border-blue-600 bg-blue-50/20' : 'border-slate-50 hover:border-blue-200'}`}
                            >
                              <div
                                onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                                className={`absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white border cursor-pointer hover:border-blue-400 ${selectedIds.includes(item.id) ? 'border-blue-600 text-blue-600 shadow-xl shadow-blue-500/20' : 'border-slate-200 text-slate-300 hover:text-blue-400'}`}
                              >
                                {selectedIds.includes(item.id) ? <CheckSquare size={20} strokeWidth={3} /> : <Square size={20} strokeWidth={2} />}
                              </div>

                              <div className="flex items-center gap-4 mb-6">
                                <div className={`p-4 rounded-2xl ${item.type === 'medical_report' ? 'bg-indigo-50 text-indigo-600' :
                                  item.type === 'electrocardiogram' ? 'bg-rose-50 text-rose-600' :
                                    item.type === 'cda_document' ? 'bg-emerald-50 text-emerald-600' :
                                      'bg-blue-50 text-blue-600'
                                  }`}>
                                  {item.type === 'medical_report' ? <ClipboardList size={26} /> :
                                    item.type === 'electrocardiogram' ? <Heart size={26} fill="currentColor" /> :
                                      item.type === 'cda_document' ? <ShieldCheck size={26} /> :
                                        <Activity size={26} />}
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 px-3 py-1 rounded-full">{item.type.replace('_', ' ')}</span>
                              </div>
                              <h4 className="font-black text-xl text-slate-800 mb-2 capitalize">
                                {item.type === 'electrocardiogram' ? (item.data.metadata.classification) :
                                  item.type === 'cda_document' ? (item.data.title) :
                                    item.type.replace('_', ' ')}
                              </h4>
                              <p className="text-slate-400 font-bold text-sm mb-8">{new Date(item.created_at).toLocaleTimeString()}</p>
                              <div className="flex items-center justify-between gap-2 text-blue-600 font-black text-sm">
                                <span className="flex items-center gap-2 group-hover:gap-4 transition-all">View Detail <ChevronRight size={16} /></span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteRecord(item.id); }}
                                  className="p-3 bg-rose-50 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <div className="text-center py-40 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-100">
                        <Search size={80} className="mx-auto text-slate-200 mb-6" />
                        <h4 className="text-2xl font-black text-slate-900 mb-2">No Records Yet</h4>
                        <p className="text-slate-400 font-bold max-w-sm mx-auto">Upload your medical reports to start your AI health journey.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            }

            {
              activeTab === 'insights' && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-blue-50">
                      <div className="flex items-center gap-4 mb-6 text-blue-600">
                        <Brain size={28} />
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ask the AI Coach</h3>
                      </div>
                      <p className="text-slate-400 text-sm font-bold mb-4">
                        Ask questions based on your history, reports, notes, and metrics.
                      </p>
                      <textarea
                        value={coachQuestion}
                        onChange={(e) => setCoachQuestion(e.target.value)}
                        placeholder="Example: Should I worry about low HRV this month?"
                        className="w-full h-28 rounded-3xl border border-slate-100 p-4 text-sm font-medium text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={handleAskCoach}
                          disabled={isAskingCoach}
                          className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                          {isAskingCoach ? 'Thinking...' : 'Ask Coach'}
                        </button>
                      </div>
                      {coachAnswer && (
                        <div className="mt-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                          <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-line">{coachAnswer}</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-blue-50">
                      <div className="flex items-center gap-6 mb-10 text-blue-600">
                        <Sparkles size={40} />
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">Deep Health Analysis</h3>
                      </div>

                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6">
                          <Loader2 className="animate-spin text-blue-600" size={60} />
                          <p className="text-slate-400 font-bold animate-pulse">Synthesizing comprehensive picture from all history...</p>
                        </div>
                      ) : deepAnalysis ? (
                        <div className="space-y-12">
                          <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                            <h4 className="text-xl font-black text-slate-900 mb-6 border-b border-slate-200 pb-4">Synthesis Summary</h4>
                            <p className="text-slate-700 text-lg leading-relaxed font-medium">{deepAnalysis.summary}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {deepAnalysis.highlights.map((h, i) => {
                              const styles = highlightStyles[h.color] || highlightStyles.indigo;
                              return (
                                <div key={i} className={`${styles.bg} p-8 rounded-[2.5rem] border ${styles.border}`}>
                                  <h5 className={`font-black ${styles.title} mb-2`}>{h.title}</h5>
                                  <p className={`${styles.desc} font-bold text-sm`}>{h.desc}</p>
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-8">
                            <h4 className="text-xl font-black text-slate-900 border-l-4 border-slate-900 pl-4">Priority Actions</h4>
                            <div className="grid grid-cols-1 gap-4">
                              {deepAnalysis.actions.map((a, i) => (
                                <div key={i} className="flex gap-4 p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
                                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black">{i + 1}</div>
                                  <p className="font-bold text-slate-700 leading-relaxed">{a}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20">
                          <Brain className="mx-auto text-slate-200 mb-6" size={80} />
                          <p className="text-slate-400 font-bold text-xl">Waiting for metrics to generate deep coaching...</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-10 rounded-[4rem] text-white shadow-2xl">
                    <h4 className="text-xl font-black mb-8 border-b border-white/10 pb-4">Quick Observations</h4>
                    <div className="space-y-6">
                      {aiInsights.insights.map((insight, idx) => {
                        const colorClass = insightColorClass[insight.color] || 'text-slate-200';
                        return (
                          <div key={idx} className="flex gap-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                            <div className={`${colorClass} mt-1`}><insight.icon size={20} /></div>
                            <div>
                              <p className="font-black text-sm">{insight.title}</p>
                              <p className="text-xs text-slate-400 font-bold">{insight.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                      {aiInsights.insights.length === 0 && <p className="text-slate-500 font-bold text-sm italic">All basic vitals in range.</p>}
                    </div>
                  </div>
                </motion.div>
              )
            }
          </AnimatePresence >

          {/* Modal Overlay for Results */}
          < AnimatePresence >
            {uploadedResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden"
                >
                  <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-5">
                      <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-500/20"><Brain className="text-white" size={28} /></div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900">Health IQ Insight</h2>
                        <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Artificial Intelligence Engine v1.5</p>
                      </div>
                    </div>
                    <button onClick={closeResults} className="bg-white border border-slate-100 p-4 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"><X size={24} /></button>
                  </div>

                  <div className="p-12 max-h-[75vh] overflow-y-auto">
                    {uploadedResults.length > 1 && (
                      <div className="mb-10 flex gap-3 overflow-x-auto pb-2">
                        {uploadedResults.map((res, idx) => {
                          const isActive = uploadedResult && (uploadedResult.id === res.id);
                          return (
                            <button
                              key={`${res.id}-${idx}`}
                              onClick={() => setUploadedResult(res)}
                              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}
                            >
                              {res.type.replace('_', ' ')}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {uploadedResult.type === 'medical_report' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-10">
                          <div className="bg-blue-600 text-white p-8 rounded-[3rem] shadow-2xl shadow-blue-500/10">
                            <h4 className="font-black text-xl mb-4 flex items-center gap-2 underline decoration-blue-400 decoration-4 underline-offset-8">Executive Summary</h4>
                            <p className="text-blue-50/90 leading-relaxed text-lg font-medium">{(uploadedResult.data || uploadedResult.result).summary}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ResultPanel title="Concerns" items={(uploadedResult.data || uploadedResult.result).concerns} color="rose" icon={AlertCircle} />
                            <ResultPanel title="Positives" items={(uploadedResult.data || uploadedResult.result).positives} color="emerald" icon={CheckCircle2} />
                          </div>
                        </div>

                        <div className="space-y-8">
                          <h4 className="text-xl font-black text-slate-900 border-l-4 border-slate-900 pl-4">Next Steps</h4>
                          <div className="space-y-4">
                            {(uploadedResult.data || uploadedResult.result).nextSteps.map((s, i) => (
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100"
                              >
                                <p className="text-slate-700 font-bold leading-relaxed">{s}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {uploadedResult.type === 'electrocardiogram' && (
                      <ECGWaveform data={uploadedResult.data || uploadedResult.result} />
                    )}

                    {uploadedResult.type === 'cda_document' && (
                      <div className="space-y-12">
                        <div className="flex items-center gap-6 mb-8">
                          <div className="bg-emerald-50 p-5 rounded-3xl text-emerald-600">
                            <ShieldCheck size={40} />
                          </div>
                          <div>
                            <h2 className="text-4xl font-black text-slate-900">{(uploadedResult.data || uploadedResult.result).title}</h2>
                            <p className="text-slate-400 font-bold text-lg">Structured Clinical Data Export</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(uploadedResult.data || uploadedResult.result).observations.map((obs, i) => (
                            <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-xl">
                              <p className="text-slate-400 text-[10px] font-black uppercase mb-1">{new Date(obs.date).toLocaleDateString()}</p>
                              <p className="text-lg font-black text-slate-800">{obs.name}</p>
                              <p className="text-2xl font-black text-emerald-600 mt-2">{obs.value} <span className="text-sm text-slate-400">{obs.unit}</span></p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {uploadedResult.type === 'apple_health' && (
                      <div className="text-center py-20 px-10">
                        <div className="animate-float mb-10">
                          <CheckCircle2 className="mx-auto text-emerald-500 stroke-[3px]" size={100} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Data Synchronized!</h3>
                        <p className="text-slate-400 font-medium text-lg mb-10">Your health metrics have been analyzed and integrated into your dashboard.</p>
                        <button onClick={closeResults} className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:scale-105 transition-all shadow-2xl">Confirm & View</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence >

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {deleteConfirmOpen && (
              <motion.div
                key="delete-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
              >
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center scale-100 animate-in fade-in zoom-in duration-200">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Delete {selectedIds.length} Records?</h3>
                  <p className="text-slate-500 font-medium mb-8">This action cannot be undone.</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkDeleteConfirm}
                      className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div >
      </main >
    </div >
  );
}

function VitalsCard({ icon: Icon, label, value, unit, color, context = "--" }) {
  const colors = {
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    orange: 'bg-orange-50 text-orange-600',
    lime: 'bg-lime-50 text-lime-600',
    green: 'bg-green-50 text-green-600',
    teal: 'bg-teal-50 text-teal-600',
    violet: 'bg-violet-50 text-violet-600',
    pink: 'bg-pink-50 text-pink-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="glass-card p-6 rounded-[2.5rem] hover:shadow-xl transition-all border border-slate-50">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]} shadow-sm`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
          <span className="text-[8px] font-bold text-slate-300 uppercase">{context}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
        <span className="text-xs font-bold text-slate-300 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function InsightItem({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-5">
      <div className="bg-white/20 h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/10 group-hover:scale-110 transition-transform"><Icon size={24} className="text-white" /></div>
      <div>
        <p className="font-black text-lg text-white leading-tight mb-1">{title}</p>
        <p className="text-sm text-indigo-100/70 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ResultPanel({ title, items = [], color, icon: Icon }) {
  const c = color === 'rose' ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900';
  const dot = color === 'rose' ? 'bg-rose-400' : 'bg-emerald-400';

  return (
    <div className={`p-8 rounded-[2.5rem] border ${c}`}>
      <h4 className="font-black text-xl mb-6 flex items-center gap-3">
        <Icon className={color === 'rose' ? 'text-rose-600' : 'text-emerald-600'} size={24} />
        {title}
      </h4>
      {items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-4 text-sm font-bold opacity-80 leading-relaxed px-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${dot}`}></span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-bold text-slate-400 px-2">No items available.</p>
      )}
    </div>
  );
}

const ECGWaveform = ({ data }) => {
  if (!data || !data.samples) return null;
  const chartData = data.samples.slice(0, 1000).map((val, idx) => ({ idx, val }));

  return (
    <div className="bg-slate-900 rounded-[3rem] p-10 text-white overflow-hidden relative">
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div>
          <h3 className="text-3xl font-black flex items-center gap-4">
            <div className="bg-rose-500 p-2.5 rounded-2xl text-white shadow-xl shadow-rose-500/20">
              <Heart size={24} fill="currentColor" />
            </div>
            ECG Rhythm: {data.metadata.classification}
          </h3>
          <p className="text-slate-400 font-bold mt-2">{data.metadata.date} • {data.leadName} • {data.metadata.hz}Hz</p>
        </div>
      </div>

      <div className="h-80 w-full mb-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <Line
              type="monotone"
              dataKey="val"
              stroke="#F43F5E"
              strokeWidth={2}
              dot={false}
              animationDuration={1500}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
              itemStyle={{ color: '#F43F5E' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Lead Name</p>
          <p className="text-xl font-black">{data.leadName}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Sample Rate</p>
          <p className="text-xl font-black">{data.metadata.hz} Hz</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Unit</p>
          <p className="text-xl font-black">{data.metadata.unit}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Symptoms</p>
          <p className="text-xl font-black text-slate-400">None Recorded</p>
        </div>
      </div>
      <div className="absolute top-[-50px] right-[-50px] w-96 h-96 bg-rose-600/10 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
};

export default App;
