import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { Text, Surface, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';
import { collection, query, onSnapshot, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { ChevronLeft, Search, X, RefreshCw, Filter, Calendar, RotateCcw, ChevronDown, CheckCircle2, Circle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
const { width: SCREEN_W } = Dimensions.get('window');
const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
};
const PATIENT_SOURCES = [
  'Walk-in',
  'Instagram',
  'Facebook',
  'Website',
  'Google',
  'Online',
  'Practo',
  'Referral',
  'Youtube'
];

const MONTHS = [
  { val: '1', label: 'January' },
  { val: '2', label: 'February' },
  { val: '3', label: 'March' },
  { val: '4', label: 'April' },
  { val: '5', label: 'May' },
  { val: '6', label: 'June' },
  { val: '7', label: 'July' },
  { val: '8', label: 'August' },
  { val: '9', label: 'September' },
  { val: '10', label: 'October' },
  { val: '11', label: 'November' },
  { val: '12', label: 'December' }
];

const parseHTMLDateToDateObj = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return null;
};

const parseGBDateToDateObj = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  return null;
};


const parseAnyDateObj = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal.toDate) return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);

  if (typeof dateVal === 'string') {
    if (dateVal.includes('T') && (dateVal.endsWith('Z') || dateVal.includes('+'))) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d;
    }
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else if (parts[2].length === 4) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
    }
  }

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  return null;
};

const safeDateDisplay = (dateObj) => {
  if (!dateObj) return null;
  if (typeof dateObj === 'object' && dateObj.toDate) {
    return dateObj.toDate().toLocaleString();
  }
  if (typeof dateObj === 'string' && dateObj.startsWith('Timestamp(seconds=')) {
    const match = dateObj.match(/seconds=(\d+)/);
    if (match && match[1]) {
      return new Date(parseInt(match[1], 10) * 1000).toLocaleString();
    }
  }
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) {
    return String(dateObj);
  }
  return d.toLocaleString();
};

const isBranchMatchHelper = (itemBranchId, itemBranchName, filterBranchId, branchesList) => {
  if (!filterBranchId || filterBranchId === 'all') return true;
  const selectedBranchName = branchesList.find(b => b.id === filterBranchId)?.name;

  const normalize = (val) => {
    if (!val) return '';
    const str = val.toLowerCase().trim();
    if (str.includes('kphb') || str.includes('kphp')) return 'kphp';
    if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
    if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilshuknagar';
    if (str.includes('nallagandla')) return 'nallagandla';
    return str.replace(/\s*branch\s*/i, '').trim();
  };

  const normId = normalize(itemBranchId);
  const normName = normalize(itemBranchName);
  const normFilterId = normalize(filterBranchId);
  const normFilterName = normalize(selectedBranchName);

  return normId === normFilterId || normId === normFilterName ||
    normName === normFilterId || normName === normFilterName ||
    itemBranchId === filterBranchId || itemBranchName === selectedBranchName;
};

const checkAmountRange = (amt, rangeStr) => {
  if (rangeStr === 'all') return true;
  switch (rangeStr) {
    case '500-1000': return amt >= 500 && amt <= 1000;
    case '1000-2000': return amt >= 1000 && amt <= 2000;
    case '2000-3000': return amt >= 2000 && amt <= 3000;
    case '3000-4000': return amt >= 3000 && amt <= 4000;
    case '4000-5000': return amt >= 4000 && amt <= 5000;
    case '5000+': return amt > 5000;
    default: return true;
  }
};

const RevenueDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [medicineForms, setMedicineForms] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [pendingPats, setPendingPats] = useState([]);

  // Collapsible breakdown states
  const [branchBreakdownExpanded, setBranchBreakdownExpanded] = useState(false);
  const [doctorBreakdownExpanded, setDoctorBreakdownExpanded] = useState(false);
  const [pendingDuesExpanded, setPendingDuesExpanded] = useState(false);

  // Filter States
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueBranchId, setRevenueBranchId] = useState('all');
  const [revenueDate, setRevenueDate] = useState(''); // YYYY-MM-DD
  const [revenueYear, setRevenueYear] = useState('all');
  const [revenueMonth, setRevenueMonth] = useState('all');
  const [revenueSource, setRevenueSource] = useState('all');
  const [revenueMethod, setRevenueMethod] = useState('all');
  const [revenueSplitType, setRevenueSplitType] = useState('all');
  const [revenueAmountRange, setRevenueAmountRange] = useState('all');
  const [revenueDoctor, setRevenueDoctor] = useState('all');

  // Date Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dropdown Picker Modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(''); // 'branch', 'year', 'month', 'source', 'method', 'splitType', 'amountRange', 'doctor'

  useEffect(() => {
    // Fetch Branches once (few records, so it's fast)
    const qBranches = query(collection(db, 'users'), where('role', '==', 'branch'));
    const unsubBranches = onSnapshot(qBranches, (snap) => {
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setBranches(list);
    });

    // Real-time listener for pending amounts
    const qPending = query(collection(db, 'allpatients'), where('pendingAmount', '>', 0));
    const unsubPending = onSnapshot(qPending, (snap) => {
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPendingPats(list);
    }, (error) => {
      console.error("Error listening to pending payments:", error);
    });

    const fetchData = async () => {
      try {
        const pSnap = await getDocs(query(collection(db, 'allpatients'), orderBy('createdAt', 'desc'), limit(5000)));
        const pData = [];
        pSnap.forEach(doc => pData.push({ id: doc.id, ...doc.data() }));
        setPatients(pData);

        const tSnap = await getDocs(query(collection(db, 'alltransactions'), orderBy('timestamp', 'desc'), limit(5000)));
        const tData = [];
        tSnap.forEach(doc => tData.push({ id: doc.id, ...doc.data() }));
        setTransactions(tData);

        const mfSnap = await getDocs(collection(db, 'alltransactions'));
        const mfData = [];
        mfSnap.forEach(doc => mfData.push({ id: doc.id, ...doc.data() }));
        setMedicineForms(mfData);

        const npSnap = await getDocs(query(collection(db, 'nutrition_plans'), orderBy('createdAt', 'desc'), limit(2000)));
        const npData = [];
        npSnap.forEach(doc => npData.push({ id: doc.id, ...doc.data() }));
        setNutritionPlans(npData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      unsubBranches();
      unsubPending();
    };
  }, []);

  const handleResetRevenueFilters = () => {
    setRevenueSearch('');
    setRevenueBranchId('all');
    setRevenueDate('');
    setRevenueYear('all');
    setRevenueMonth('all');
    setRevenueSource('all');
    setRevenueMethod('all');
    setRevenueSplitType('all');
    setRevenueAmountRange('all');
    setRevenueDoctor('all');
  };

  const filteredRevenuePatients = useMemo(() => {
    return patients.filter(patient => {
      if (patient.paymentStatus !== 'paid') return false;

      const matchesSearch = !revenueSearch.trim() ||
        (patient.fullName && String(patient.fullName).toLowerCase().includes(revenueSearch.toLowerCase())) ||
        (patient.phone && String(patient.phone).includes(revenueSearch.trim()));

      const matchesBranch = isBranchMatchHelper(patient.branchId, patient.branchName, revenueBranchId, branches);

      let matchesDate = true;
      let rawDateStr = patient.paymentCollectedAt || patient.appointmentDate || patient.completedAt || patient.createdAt || patient.date;

      if (rawDateStr) {
        let d = parseAnyDateObj(rawDateStr);

        if (d && !isNaN(d.getTime())) {
          if (revenueDate) {
            const filterDate = parseHTMLDateToDateObj(revenueDate);
            if (filterDate) {
              d.setHours(0, 0, 0, 0);
              filterDate.setHours(0, 0, 0, 0);
              if (d.getTime() !== filterDate.getTime()) matchesDate = false;
            }
          } else if (revenueYear !== 'all') {
            if (d.getFullYear() !== parseInt(revenueYear, 10)) {
              matchesDate = false;
            } else if (revenueMonth !== 'all') {
              if (d.getMonth() + 1 !== parseInt(revenueMonth, 10)) {
                matchesDate = false;
              }
            }
          }
        } else {
          if (revenueDate || revenueYear !== 'all') matchesDate = false;
        }
      } else {
        if (revenueDate || revenueYear !== 'all') matchesDate = false;
      }

      const matchesSource = revenueSource === 'all' || (patient.source || 'Walk-in') === revenueSource;
      const matchesMethod = revenueMethod === 'all' || patient.paymentMethod === revenueMethod;

      const docName = patient.doctor || patient.doctorName || patient.assignDoctor || 'N/A';
      const matchesDoctor = revenueDoctor === 'all' || docName === revenueDoctor;

      let matchesSplit = true;
      if (revenueSplitType !== 'all') {
        const hasMed = patient.itemsPaid?.medicine > 0;
        let rowType = 'Consultation';
        if (hasMed) {
          rowType = 'Consultation & Medicine Fee';
        }
        matchesSplit = rowType === revenueSplitType;
      }

      let matchesAmount = true;
      if (revenueAmountRange !== 'all') {
        const consAmt = Number(patient.itemsPaid?.consultation !== undefined ? patient.itemsPaid.consultation : (patient.paymentAmount || 0));
        const medAmt = Number(patient.itemsPaid?.medicine || 0);
        const dietAmt = Number(patient.itemsPaid?.dietPlan || 0);
        matchesAmount = checkAmountRange(consAmt, revenueAmountRange) || checkAmountRange(medAmt, revenueAmountRange) || checkAmountRange(dietAmt, revenueAmountRange);
      }

      return matchesSearch && matchesBranch && matchesDate && matchesSource && matchesMethod && matchesDoctor && matchesSplit && matchesAmount;
    });
  }, [patients, revenueSearch, revenueBranchId, branches, revenueDate, revenueYear, revenueMonth, revenueSource, revenueMethod, revenueDoctor, revenueSplitType, revenueAmountRange]);

  const filteredMedicineForms = useMemo(() => {
    return medicineForms.filter(form => {
      const matchesSearch = !revenueSearch.trim() ||
        (form.patientName && form.patientName.toLowerCase().includes(revenueSearch.toLowerCase())) ||
        (form.phone && form.phone.includes(revenueSearch.trim()));

      const matchesBranch = isBranchMatchHelper(form.branchId, form.branchName, revenueBranchId, branches);

      let matchesDate = true;
      let rawDateStr = form.createdAt || form.formDate;

      if (rawDateStr) {
        let d = parseAnyDateObj(rawDateStr);

        if (d && !isNaN(d.getTime())) {
          if (revenueDate) {
            const filterDate = parseHTMLDateToDateObj(revenueDate);
            if (filterDate) {
              d.setHours(0, 0, 0, 0);
              filterDate.setHours(0, 0, 0, 0);
              if (d.getTime() !== filterDate.getTime()) matchesDate = false;
            }
          } else if (revenueYear !== 'all') {
            if (d.getFullYear() !== parseInt(revenueYear, 10)) {
              matchesDate = false;
            } else if (revenueMonth !== 'all') {
              if (d.getMonth() + 1 !== parseInt(revenueMonth, 10)) {
                matchesDate = false;
              }
            }
          }
        } else {
          if (revenueDate || revenueYear !== 'all') matchesDate = false;
        }
      } else {
        if (revenueDate || revenueYear !== 'all') matchesDate = false;
      }

      const patientDoc = form.patientId ? patients.find(p => p.id === form.patientId) : null;
      const docName = form.doctor || form.doctorName || patientDoc?.doctor || patientDoc?.doctorName || '-';
      const matchesDoctor = revenueDoctor === 'all' || docName === revenueDoctor;

      let matchesSplit = true;
      if (revenueSplitType !== 'all') {
        matchesSplit = 'Consultation & Medicine Fee' === revenueSplitType;
      }

      let matchesAmount = true;
      if (revenueAmountRange !== 'all') {
        matchesAmount = checkAmountRange(Number(form.amountPaid) || 0, revenueAmountRange);
      }

      return matchesSearch && matchesBranch && matchesDate && matchesDoctor && matchesSplit && matchesAmount;
    });
  }, [medicineForms, branches, revenueSearch, revenueBranchId, revenueDate, revenueYear, revenueMonth, patients, revenueDoctor, revenueSplitType, revenueAmountRange]);

  const filteredPharmacyTransactions = useMemo(() => {
    return transactions.filter(tr => {
      if (tr.type === 'consultation') return false;
      const matchesSearch = !revenueSearch.trim() ||
        (tr.patientName && tr.patientName.toLowerCase().includes(revenueSearch.toLowerCase())) ||
        (tr.patientPhone && tr.patientPhone.includes(revenueSearch.trim()));

      const matchesBranch = isBranchMatchHelper(tr.branchId, tr.branchName, revenueBranchId, branches);

      let matchesDate = true;
      if (tr.timestamp) {
        let d = parseAnyDateObj(tr.timestamp);

        if (d && !isNaN(d.getTime())) {
          if (revenueDate) {
            const filterDate = parseHTMLDateToDateObj(revenueDate);
            if (filterDate) {
              d.setHours(0, 0, 0, 0);
              filterDate.setHours(0, 0, 0, 0);
              if (d.getTime() !== filterDate.getTime()) matchesDate = false;
            }
          } else if (revenueYear !== 'all') {
            if (d.getFullYear() !== parseInt(revenueYear, 10)) {
              matchesDate = false;
            } else if (revenueMonth !== 'all') {
              if (d.getMonth() + 1 !== parseInt(revenueMonth, 10)) {
                matchesDate = false;
              }
            }
          }
        } else {
          if (revenueDate || revenueYear !== 'all') matchesDate = false;
        }
      } else {
        if (revenueDate || revenueYear !== 'all') matchesDate = false;
      }

      const matchesSource = revenueSource === 'all' || (tr.source || 'Walk-in') === revenueSource;
      const matchesMethod = revenueMethod === 'all' || tr.method === revenueMethod;

      const patientDoc = tr.patientId ? patients.find(p => p.id === tr.patientId) : null;
      const docName = tr.doctor || tr.doctorName || tr.prescribedBy || patientDoc?.doctor || patientDoc?.doctorName || patientDoc?.assignDoctor || '-';
      const matchesDoctor = revenueDoctor === 'all' || docName === revenueDoctor;

      let matchesSplit = true;
      if (revenueSplitType !== 'all') {
        const rType = tr.type === 'nutrition' ? 'Diet Plan' : 'Consultation & Medicine Fee';
        matchesSplit = rType === revenueSplitType;
      }

      let matchesAmount = true;
      if (revenueAmountRange !== 'all') {
        matchesAmount = checkAmountRange(Number(tr.amount) || 0, revenueAmountRange);
      }

      return matchesSearch && matchesBranch && matchesDate && matchesSource && matchesMethod && matchesDoctor && matchesSplit && matchesAmount;
    });
  }, [transactions, revenueSearch, revenueBranchId, branches, revenueDate, revenueYear, revenueMonth, revenueSource, revenueMethod, patients, revenueDoctor, revenueSplitType, revenueAmountRange]);

  const filteredNutritionPlansForRevenue = [];






  const allHistoryTransactions = useMemo(() => {
    const list = [];

    const parseD = (raw) => {
      if (!raw) return null;
      if (raw.toDate) return raw.toDate();
      if (raw.seconds) return new Date(raw.seconds * 1000);
      return new Date(raw);
    };

    const paidItemsMap = new Map();
    const processedStandaloneDietPlans = new Set();

    const trackPaidItem = (key, itemsPaid) => {
      if (!key) return;
      if (!paidItemsMap.has(key)) paidItemsMap.set(key, { cons: false, med: false, diet: false });
      const entry = paidItemsMap.get(key);
      if (itemsPaid) {
        if (Number(itemsPaid.consultation || 0) > 0) entry.cons = true;
        if (Number(itemsPaid.medicine || 0) > 0) entry.med = true;
        if (Number(itemsPaid.dietPlan || 0) > 0) entry.diet = true;
      } else {
        entry.cons = true;
      }
    };

    // Consultations
    filteredRevenuePatients.forEach(p => {
      const hasMed = p.itemsPaid?.medicine > 0;
      const hasDiet = p.itemsPaid?.dietPlan > 0;
      const hasCons = p.itemsPaid?.consultation > 0 || (!p.itemsPaid?.consultation && !p.itemsPaid?.medicine && !p.itemsPaid?.dietPlan);

      const consAmt = (() => {
        if (p.paymentStatus !== 'paid') return 0;
        let amount = Number(p.paymentAmount || p.amountPaid || p.amount || p.totalAmount || p.consultationFee || 0);
        if (p.itemsPaid) {
          const cons = Number(p.itemsPaid.consultation || 0);
          const med = Number(p.itemsPaid.medicine || 0);
          const diet = Number(p.itemsPaid.dietPlan || 0);
          let other = 0;
          if (Array.isArray(p.itemsPaid.otherFees)) {
            other = p.itemsPaid.otherFees.reduce((acc, f) => acc + Number(f.amount || 0), 0);
          }
          const totalItems = cons + med + diet + other;
          if (totalItems > 0) amount = totalItems;
        }
        return amount;
      })();

      let rowType = 'Consultation';
      if (hasCons && hasMed && hasDiet) rowType = 'Consultation & Medicine Fee / Diet Plan';
      else if (hasCons && hasMed) rowType = 'Consultation & Medicine Fee';
      else if (hasCons && hasDiet) rowType = 'Consultation / Diet Plan';
      else if (!hasCons && hasMed && hasDiet) rowType = 'Medicine Fee / Diet Plan';
      else if (!hasCons && hasDiet) rowType = 'Diet Plan';
      else if (!hasCons && hasMed) rowType = 'Medicine Fee';

      const d = parseD(p.paymentCollectedAt || p.appointmentDate || p.createdAt || p.date);
      const timestamp = d ? d.getTime() : 0;
      let dateStr = safeDateDisplay(p.paymentCollectedAt || p.appointmentDate || p.createdAt || p.date) || "N/A";

      const k1 = p.id ? `${p.id}_${d ? d.toDateString() : ''}` : null;
      if (k1) trackPaidItem(k1, p.itemsPaid);
      const regId = p.registrationId || p.regId || p.regID;
      const k2 = regId ? `${regId}_${d ? d.toDateString() : ''}` : null;
      if (k2) trackPaidItem(k2, p.itemsPaid);

      list.push({
        id: `cons_${p.id}_${Math.random().toString(36).substring(7)}`,
        type: rowType,
        regId: p.registrationId || p.regId || p.regID || (p.id && p.id.startsWith('WK') ? p.id : null) || '-',
        patientName: p.fullName || p.patientName || '-',
        phone: p.phone || p.patientPhone || p.phoneNumber || p.contactNumber || p.contact || '-',
        branch: p.branchName || 'Main Branch',
        doctorName: p.doctor || p.doctorName || p.assignDoctor || '-',
        source: p.source || 'Walk-in',
        amount: consAmt,
        method: (() => {
          const m = (p.paymentMethod || '-').toUpperCase();
          if (m === 'SPLIT' || m === 'APP_SPLIT') return 'CASH/UPI';
          if (['ONLINE_RAZORPAY', 'ONLINE', 'APP', 'PHONEPE', 'GPAY', 'PAYTM', 'UPI'].includes(m)) return 'UPI';
          return m;
        })(),
        dateTime: dateStr,
        timestamp,
        status: p.paymentStatus === 'paid' ? 'PAID' : 'NOT PAID',
        duration: 0,
        itemsPaid: p.itemsPaid || null
      });
    });

    // Old Consultations (from transactions which fetches ALL transactions)
    transactions.forEach(tr => {
      if (tr.type !== 'consultation') return;

      const d = parseD(tr.timestamp);
      const k1 = `${tr.patientId}_${d ? d.toDateString() : ''}`;
      const regId = tr.registrationId || tr.regId || tr.regID || '-';
      const k2 = (regId !== '-') ? `${regId}_${d ? d.toDateString() : ''}` : null;

      if ((k1 && paidItemsMap.get(k1)?.cons) || (k2 && paidItemsMap.get(k2)?.cons)) return; // Already caught in patients loop

      const matchesSearch = !revenueSearch.trim() ||
        (tr.patientName && tr.patientName.toLowerCase().includes(revenueSearch.toLowerCase())) ||
        (tr.phone && tr.phone.includes(revenueSearch.trim())) ||
        (tr.patientPhone && tr.patientPhone.includes(revenueSearch.trim()));

      const matchesBranch = isBranchMatchHelper(tr.branchId, tr.branchName, revenueBranchId, branches);

      let matchesDate = true;
      if (d && !isNaN(d.getTime())) {
        if (revenueDate) {
          const filterDate = parseHTMLDateToDateObj(revenueDate);
          if (filterDate) { d.setHours(0, 0, 0, 0); filterDate.setHours(0, 0, 0, 0); if (d.getTime() !== filterDate.getTime()) matchesDate = false; }
        } else if (revenueYear !== 'all') {
          if (d.getFullYear() !== parseInt(revenueYear, 10)) matchesDate = false;
          else if (revenueMonth !== 'all') { if (d.getMonth() + 1 !== parseInt(revenueMonth, 10)) matchesDate = false; }
        }
      } else {
        if (revenueDate || revenueYear !== 'all') matchesDate = false;
      }

      if (!matchesSearch || !matchesBranch || !matchesDate) return;

      let fullDateTime = 'N/A';
      if (tr.timestamp) {
        if (tr.timestamp.toDate) fullDateTime = tr.timestamp.toDate().toLocaleString('en-IN');
        else fullDateTime = safeDateDisplay(tr.timestamp) || 'N/A';
      }

      const patientDoc = tr.patientId ? patients.find(p => p.id === tr.patientId) : null;

      list.push({
        id: `old_cons_${tr.id || Math.random()}`,
        type: 'Consultation',
        regId: regId !== '-' ? regId : (patientDoc?.registrationId || patientDoc?.regId || patientDoc?.regID || '-'),
        patientName: tr.patientName || tr.fullName || patientDoc?.fullName || '-',
        phone: tr.patientPhone || tr.phone || tr.phoneNumber || patientDoc?.phone || patientDoc?.patientPhone || patientDoc?.phoneNumber || '-',
        branch: tr.branchName || 'Main Branch',
        doctorName: tr.doctor || tr.doctorName || patientDoc?.doctor || patientDoc?.doctorName || patientDoc?.assignDoctor || '-',
        source: tr.source || 'Walk-in',
        amount: Number(tr.amount) || 0,
        method: (() => {
          let m = (tr.method || 'N/A').toUpperCase();
          const isSplit = tr.paymentId && typeof tr.paymentId === 'string' && tr.paymentId.includes('SPLIT');
          if (isSplit || m === 'SPLIT' || m === 'APP_SPLIT') return 'CASH/UPI';
          if (['ONLINE_RAZORPAY', 'ONLINE', 'APP', 'PHONEPE', 'GPAY', 'PAYTM', 'UPI'].includes(m)) return 'UPI';
          return m;
        })(),
        dateTime: fullDateTime,
        timestamp: tr.timestamp?.toMillis ? tr.timestamp.toMillis() : new Date(tr.timestamp).getTime() || 0,
        status: 'PAID',
        duration: 0,
        itemsPaid: tr.itemsPaid || null
      });
    });

    // Pharmacy
    filteredPharmacyTransactions.forEach(tr => {
      if (tr.type === 'consultation') return;
      const patientDoc = tr.patientId ? patients.find(p => p.id === tr.patientId) : null;

      const d = parseD(tr.timestamp);
      const k1 = `${tr.patientId}_${d ? d.toDateString() : ''}`;
      const regId = tr.registrationId || tr.regId || tr.regID || patientDoc?.registrationId || patientDoc?.regId || patientDoc?.regID || '-';
      const k2 = (regId !== '-') ? `${regId}_${d ? d.toDateString() : ''}` : null;

      if (tr.type === 'nutrition') {
        if ((k1 && paidItemsMap.get(k1)?.diet) || (k2 && paidItemsMap.get(k2)?.diet)) return;
        if (k1) processedStandaloneDietPlans.add(k1);
        if (k2) processedStandaloneDietPlans.add(k2);
      } else {
        if ((k1 && paidItemsMap.get(k1)?.med) || (k2 && paidItemsMap.get(k2)?.med)) return;
      }

      const timestamp = d ? d.getTime() : 0;
      let fullDateTime = safeDateDisplay(tr.timestamp) || 'N/A';

      list.push({
        id: `pharm_${tr.id || Math.random()}`,
        type: tr.type === 'nutrition' ? 'Diet Plan' : 'Consultation & Medicine Fee',
        regId: tr.registrationId || tr.regId || tr.regID || patientDoc?.registrationId || patientDoc?.regId || patientDoc?.regID || '-',
        patientName: tr.patientName || tr.fullName || patientDoc?.fullName || '-',
        phone: tr.patientPhone || tr.phone || tr.phoneNumber || patientDoc?.phone || patientDoc?.patientPhone || patientDoc?.phoneNumber || '-',
        branch: tr.branchName || 'Main Branch',
        doctorName: tr.doctor || tr.doctorName || tr.prescribedBy || patientDoc?.doctor || patientDoc?.doctorName || patientDoc?.assignDoctor || '-',
        source: tr.source || 'Walk-in',
        amount: (() => {
          let amt = Number(tr.amount) || 0;
          if (tr.type === 'nutrition') {
            return amt;
          }
          if (patientDoc && patientDoc.itemsPaid && patientDoc.itemsPaid.medicine !== undefined) {
            amt = Number(patientDoc.itemsPaid.medicine);
          } else {
            const isSplit = tr.paymentId && typeof tr.paymentId === 'string' && tr.paymentId.includes('SPLIT');
            const m = (tr.method || '-').toUpperCase();
            if (isSplit || m === 'SPLIT' || m === 'APP_SPLIT') {
              if (tr.itemsPaid) {
                const med = Number(tr.itemsPaid.medicine || 0);
                const diet = Number(tr.itemsPaid.dietPlan || 0);
                let other = 0;
                if (Array.isArray(tr.itemsPaid.otherFees)) {
                  other = tr.itemsPaid.otherFees.reduce((acc, f) => acc + Number(f.amount || 0), 0);
                }
                const tot = med + diet + other;
                if (tot > 0) amt = tot;
              }
            }
          }
          return amt;
        })(),
        method: (() => {
          let m = (tr.method || 'N/A').toUpperCase();
          const isSplit = tr.paymentId && typeof tr.paymentId === 'string' && tr.paymentId.includes('SPLIT');
          if (isSplit || m === 'SPLIT' || m === 'APP_SPLIT') return 'CASH/UPI';
          if (['ONLINE_RAZORPAY', 'ONLINE', 'APP', 'PHONEPE', 'GPAY', 'PAYTM', 'UPI'].includes(m)) return 'UPI';
          return m;
        })(),
        dateTime: fullDateTime,
        timestamp,
        status: 'PAID',
        duration: 0,
        itemsPaid: tr.type === 'nutrition' ? { dietPlan: Number(tr.amount) || 0 } : (tr.itemsPaid || null)
      });
    });

    // Medicine Forms
    filteredMedicineForms.forEach(form => {
      const patientDoc = form.patientId ? patients.find(p => p.id === form.patientId) : null;

      const d = parseD(form.createdAt || form.formDate);
      const k1 = `${form.patientId}_${d ? d.toDateString() : ''}`;
      const regId = form.registrationId || form.regId || form.regID || patientDoc?.registrationId || patientDoc?.regId || patientDoc?.regID || '-';
      const k2 = (regId !== '-') ? `${regId}_${d ? d.toDateString() : ''}` : null;

      const amt = Number(form.amountPaid) || 0;
      if (amt <= 0) return;

      if ((k1 && paidItemsMap.get(k1)?.med) || (k2 && paidItemsMap.get(k2)?.med)) return;

      const timestamp = d ? d.getTime() : 0;
      let fullDateTime = safeDateDisplay(form.createdAt || form.formDate) || 'N/A';

      list.push({
        id: `medform_${form.id || Math.random().toString(36).substring(7)}`,
        type: 'Consultation & Medicine Fee',
        regId: regId,
        patientName: form.patientName || patientDoc?.fullName || '-',
        phone: form.phone || patientDoc?.phone || '-',
        branch: form.branchName || 'Main Branch',
        doctorName: form.doctor || form.doctorName || patientDoc?.doctor || patientDoc?.doctorName || '-',
        source: patientDoc?.source || 'Walk-in',
        amount: Number(form.amountPaid) || 0,
        method: (form.paymentMethod || 'N/A').toUpperCase(),
        dateTime: fullDateTime,
        timestamp,
        status: 'PAID',
        duration: form.duration || 0,
        itemsPaid: { medicine: Number(form.amountPaid) || 0 }
      });
    });

    // Diet Plans (Nutrition Plans)
    filteredNutritionPlansForRevenue.forEach(plan => {
      const patientDoc = plan.patientId ? patients.find(p => p.id === plan.patientId) : null;

      const d = parseD(plan.paymentCollectedAt || plan.createdAt);
      const k1 = `${plan.patientId}_${d ? d.toDateString() : ''}`;
      const regId = plan.registrationId || plan.regId || plan.regID || patientDoc?.registrationId || patientDoc?.regId || patientDoc?.regID || '-';
      const k2 = (regId !== '-') ? `${regId}_${d ? d.toDateString() : ''}` : null;

      const amt = Number(plan.amountPaid || plan.amount) || 0;
      if (amt <= 0) return;

      if ((k1 && paidItemsMap.get(k1)?.diet) || (k2 && paidItemsMap.get(k2)?.diet)) return;
      if ((k1 && processedStandaloneDietPlans.has(k1)) || (k2 && processedStandaloneDietPlans.has(k2))) return;

      const timestamp = d ? d.getTime() : 0;
      let fullDateTime = safeDateDisplay(plan.paymentCollectedAt || plan.createdAt) || 'N/A';

      list.push({
        id: `dietplan_${plan.id || Math.random().toString(36).substring(7)}`,
        type: 'Diet Plan',
        regId: regId,
        patientName: plan.patientName || patientDoc?.fullName || '-',
        phone: plan.patientPhone || patientDoc?.phone || '-',
        branch: plan.branchName || 'Main Branch',
        doctorName: plan.doctorName || patientDoc?.doctor || patientDoc?.doctorName || '-',
        source: plan.source || plan.source || patientDoc?.source || 'Walk-in',
        amount: amt,
        method: (plan.paymentMethod || 'N/A').toUpperCase(),
        dateTime: fullDateTime,
        timestamp,
        status: 'PAID',
        duration: plan.duration || 0,
        itemsPaid: { dietPlan: amt }
      });
    });

    let finalTxList = list.filter(tr => Number(tr.amount) > 0);

    const groupedTx = new Map();
    finalTxList.forEach(tr => {
      let dateKey = 'unknown';
      if (tr.timestamp) {
        const d = new Date(tr.timestamp);
        dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }

      let patientPhone = tr.phone && tr.phone !== '-' ? String(tr.phone).trim() : (tr.patientName ? String(tr.patientName).trim() : '-');
      let normalizedPhone = patientPhone;
      if (normalizedPhone.length >= 10 && !isNaN(normalizedPhone.slice(-10))) {
        normalizedPhone = normalizedPhone.slice(-10);
      }

      const key = `${normalizedPhone}_${dateKey}`;

      if (!groupedTx.has(key)) {
        groupedTx.set(key, {
          ...tr,
          methods: new Set([(tr.method || 'N/A').toUpperCase()]),
          types: new Set([tr.type]),
          itemsPaid: tr.itemsPaid ? { ...tr.itemsPaid } : null
        });
      } else {
        const existing = groupedTx.get(key);
        existing.amount += Number(tr.amount || 0);
        existing.methods.add((tr.method || 'N/A').toUpperCase());
        existing.types.add(tr.type);
        if (tr.itemsPaid) {
          existing.itemsPaid = existing.itemsPaid || {};
          if (tr.itemsPaid.consultation) existing.itemsPaid.consultation = (existing.itemsPaid.consultation || 0) + Number(tr.itemsPaid.consultation);
          if (tr.itemsPaid.medicine) existing.itemsPaid.medicine = (existing.itemsPaid.medicine || 0) + Number(tr.itemsPaid.medicine);
          if (tr.itemsPaid.dietPlan) existing.itemsPaid.dietPlan = (existing.itemsPaid.dietPlan || 0) + Number(tr.itemsPaid.dietPlan);
          if (Array.isArray(tr.itemsPaid.otherFees)) {
            existing.itemsPaid.otherFees = [...(existing.itemsPaid.otherFees || []), ...tr.itemsPaid.otherFees];
          }
        }
      }
    });

    finalTxList = Array.from(groupedTx.values()).map(tr => {
      const tSet = tr.types;
      let combinedType = Array.from(tSet).join(' / ');
      if (tSet.has('Consultation') && tSet.has('Diet Plan')) combinedType = 'Consultation / Diet Plan';
      if (tSet.has('Consultation & Medicine Fee') && tSet.has('Diet Plan')) combinedType = 'Consultation & Medicine Fee / Diet Plan';
      if (tSet.has('Medicine Fee') && tSet.has('Diet Plan')) combinedType = 'Medicine Fee / Diet Plan';
      if (tSet.has('Consultation') && tSet.has('Medicine Fee') && tSet.has('Diet Plan')) combinedType = 'Consultation & Medicine Fee / Diet Plan';
      if (tSet.has('Consultation') && tSet.has('Consultation & Medicine Fee')) combinedType = 'Consultation & Medicine Fee';

      const methodsArr = Array.from(tr.methods).filter(m => m !== 'N/A');
      return {
        ...tr,
        type: combinedType,
        method: methodsArr.length > 0 ? methodsArr.join(' + ') : 'N/A'
      };
    });

    return finalTxList.sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredRevenuePatients, filteredPharmacyTransactions, filteredMedicineForms, filteredNutritionPlansForRevenue, patients]);





  // Calculations
  const paidPatients = useMemo(() => {
    return filteredRevenuePatients.filter(p => p.paymentStatus === 'paid');
  }, [filteredRevenuePatients]);

  const totalCollectedFees = useMemo(() => {
    return allHistoryTransactions.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [allHistoryTransactions]);

  const cashCollected = useMemo(() => {
    return allHistoryTransactions.filter(t => t.method === 'CASH').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allHistoryTransactions]);

  const upiCollected = useMemo(() => {
    return allHistoryTransactions.filter(t => {
      const m = (t.method || '').toUpperCase();
      return ['UPI', 'PHONEPE', 'GPAY', 'SPLIT', 'CASH/UPI', 'ONLINE_RAZORPAY', 'ONLINE', 'APP'].includes(m);
    }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allHistoryTransactions]);

  const cardCollected = useMemo(() => {
    return allHistoryTransactions.filter(t => (t.method || '').toUpperCase() === 'CARD').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allHistoryTransactions]);

  const pendingData = useMemo(() => {
    const pMap = {};
    const d = new Date();
    const currentMonth = d.getMonth();
    const currentYear = d.getFullYear();

    const normalizeBranchName = (val) => {
      if (!val) return 'Main Branch';
      const str = val.toLowerCase().trim();
      if (str.includes('kphb') || str.includes('kphp')) return 'KPHB Branch';
      if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'Chandanagar Branch';
      if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'Dilshuknagar Branch';
      if (str.includes('nallagandla')) return 'Nallagandla Branch';
      return val.trim();
    };

    pendingPats.forEach(item => {
      const pAmt = Number(item.pendingAmount || 0);
      if (pAmt > 0) {
        const bName = normalizeBranchName(item.branchName || item.branchId);
        if (!pMap[bName]) {
          pMap[bName] = { name: bName, count: 0, totalPending: 0, thisMonthPending: 0, uniquePats: new Set() };
        }
        pMap[bName].totalPending += pAmt;

        let patId = item.id;
        if (patId) pMap[bName].uniquePats.add(patId);

        const dateRaw = item.paymentCollectedAt || item.appointmentDate || item.createdAt || item.dateString;
        let dt = parseAnyDateObj(dateRaw);
        if (dt && dt.getMonth() === currentMonth && dt.getFullYear() === currentYear) {
          pMap[bName].thisMonthPending += pAmt;
        }
      }
    });

    return Object.values(pMap).map(p => ({
      name: p.name,
      count: p.uniquePats.size || 1,
      totalPending: p.totalPending,
      thisMonthPending: p.thisMonthPending
    })).sort((a, b) => b.totalPending - a.totalPending);
  }, [pendingPats]);

  const uniqueDoctors = useMemo(() => {
    const set = new Set();
    patients.forEach(p => {
      const d = p.doctor || p.doctorName || p.assignDoctor;
      if (d && d !== 'N/A' && d !== '-') set.add(d);
    });
    transactions.forEach(t => {
      const d = t.doctor || t.doctorName || t.prescribedBy;
      if (d && d !== 'N/A' && d !== '-') set.add(d);
    });
    medicineForms.forEach(m => {
      const d = m.doctor || m.doctorName;
      if (d && d !== 'N/A' && d !== '-') set.add(d);
    });
    nutritionPlans.forEach(n => {
      const d = n.doctorName;
      if (d && d !== 'N/A' && d !== '-') set.add(d);
    });
    return Array.from(set).sort();
  }, [patients, transactions, medicineForms, nutritionPlans]);

  const { splitCons, splitConsMed, splitDiet } = useMemo(() => {
    let splitCons = 0, splitConsMed = 0, splitDiet = 0;
    allHistoryTransactions.forEach(t => {
      if (t.itemsPaid) {
        splitCons += Number(t.itemsPaid.consultation || 0);
        splitConsMed += Number(t.itemsPaid.medicine || 0);
        splitDiet += Number(t.itemsPaid.dietPlan || 0);
      } else {
        if (t.type === 'Consultation') splitCons += Number(t.amount || 0);
        else if (t.type === 'Consultation & Medicine Fee' || t.type === 'Medicine Fee' || t.type === 'Pharmacy' || t.type === 'Medicine') splitConsMed += Number(t.amount || 0);
        else if (t.type === 'Diet Plan') splitDiet += Number(t.amount || 0);
      }
    });
    return { splitCons, splitConsMed, splitDiet };
  }, [allHistoryTransactions]);


  const subscriptionStats = useMemo(() => {
    const totalRev = filteredMedicineForms.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);
    const totalMonths = filteredMedicineForms.reduce((sum, f) => sum + (Number(f.duration) || 0), 0);
    const avg = totalMonths > 0 ? (totalRev / totalMonths) : 0;
    return { totalRev, totalMonths, avg };
  }, [filteredMedicineForms]);

  const branchWiseAvgRevenue = useMemo(() => {
    const branchStats = {};
    filteredMedicineForms.forEach(f => {
      const bId = f.branchId || 'unknown';
      const bName = f.branchName || 'Unknown Branch';
      if (!branchStats[bId]) {
        branchStats[bId] = { branchName: bName, revenue: 0, months: 0 };
      }
      branchStats[bId].revenue += (Number(f.amountPaid) || 0);
      branchStats[bId].months += (Number(f.duration) || 0);
    });

    return Object.entries(branchStats).map(([branchId, stats]) => {
      const avg = stats.months > 0 ? (stats.revenue / stats.months) : 0;
      return {
        branchId,
        branchName: stats.branchName,
        revenue: stats.revenue,
        months: stats.months,
        avg
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredMedicineForms]);

  const doctorWiseAvgRevenue = useMemo(() => {
    const docStats = {};
    filteredMedicineForms.forEach(f => {
      const docName = f.doctorName || 'Unknown Doctor';
      if (!docStats[docName]) {
        docStats[docName] = { revenue: 0, months: 0 };
      }
      docStats[docName].revenue += (Number(f.amountPaid) || 0);
      docStats[docName].months += (Number(f.duration) || 0);
    });

    return Object.entries(docStats).map(([doctorName, stats]) => {
      const avg = stats.months > 0 ? (stats.revenue / stats.months) : 0;
      return {
        doctorName,
        revenue: stats.revenue,
        months: stats.months,
        avg
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredMedicineForms]);

  // Modal selector items helper
  const getPickerItems = () => {
    if (pickerType === 'branch') {
      return [{ id: 'all', name: 'All Branches' }, ...branches];
    }
    if (pickerType === 'year') {
      return [
        { id: 'all', name: 'All Years' },
        { id: '2026', name: '2026' },
        { id: '2025', name: '2025' },
        { id: '2024', name: '2024' },
        { id: '2023', name: '2023' }
      ];
    }
    if (pickerType === 'month') {
      return [{ id: 'all', name: 'All Months' }, ...MONTHS.map(m => ({ id: m.val, name: m.label }))];
    }
    if (pickerType === 'source') {
      return [{ id: 'all', name: 'All Sources' }, ...PATIENT_SOURCES.map(s => ({ id: s, name: s }))];
    }
    if (pickerType === 'method') {
      return [
        { id: 'all', name: 'All Modes' },
        { id: 'cash', name: 'Cash' },
        { id: 'upi', name: 'UPI' },
        { id: 'card', name: 'Card' }
      ];
    }
    if (pickerType === 'splitType') {
      return [
        { id: 'all', name: 'All Split Types' },
        { id: 'Consultation', name: 'Consultation' },
        { id: 'Consultation & Medicine Fee', name: 'Consultation & Medicine Fee' },
        { id: 'Diet Plan', name: 'Diet Plan' }
      ];
    }
    if (pickerType === 'amountRange') {
      return [
        { id: 'all', name: 'All Ranges' },
        { id: '500-1000', name: '₹500 - ₹1000' },
        { id: '1000-2000', name: '₹1000 - ₹2000' },
        { id: '2000-3000', name: '₹2000 - ₹3000' },
        { id: '3000-4000', name: '₹3000 - ₹4000' },
        { id: '4000-5000', name: '₹4000 - ₹5000' },
        { id: '5000+', name: '₹5000+' }
      ];
    }
    if (pickerType === 'doctor') {
      return [
        { id: 'all', name: 'All Doctors' },
        { id: 'Prashanth', name: 'Prashanth' },
        { id: 'Jobeadh Parveez', name: 'Jobeadh Parveez' },
        { id: 'Dr. Padma Priya', name: 'Dr. Padma Priya' },
        { id: 'Rama Krishna', name: 'Rama Krishna' }
      ];
    }
    return [];
  };

  const getSelectedLabel = (type) => {
    if (type === 'branch') {
      return revenueBranchId === 'all' ? 'All Branches' : (branches.find(b => b.id === revenueBranchId)?.name || 'Select Branch');
    }
    if (type === 'year') {
      return revenueYear === 'all' ? 'All Years' : revenueYear;
    }
    if (type === 'month') {
      return revenueMonth === 'all' ? 'All Months' : (MONTHS.find(m => m.val === revenueMonth)?.label || 'Select Month');
    }
    if (type === 'source') {
      return revenueSource === 'all' ? 'All Sources' : revenueSource;
    }
    if (type === 'method') {
      return revenueMethod === 'all' ? 'All Modes' : (revenueMethod === 'cash' ? 'Cash' : revenueMethod === 'upi' ? 'UPI' : 'Card');
    }
    if (type === 'splitType') {
      return revenueSplitType === 'all' ? 'All Splits' : revenueSplitType;
    }
    if (type === 'amountRange') {
      return revenueAmountRange === 'all' ? 'All Ranges' : (revenueAmountRange === '500-1000' ? '₹500-₹1000' : revenueAmountRange === '1000-2000' ? '₹1000-₹2000' : revenueAmountRange === '2000-3000' ? '₹2000-₹3000' : revenueAmountRange === '3000-4000' ? '₹3000-₹4000' : revenueAmountRange === '4000-5000' ? '₹4000-₹5000' : '₹5000+');
    }
    if (type === 'doctor') {
      return revenueDoctor === 'all' ? 'All Doctors' : revenueDoctor;
    }
    return '';
  };

  const handleSelectPickerItem = (id) => {
    if (pickerType === 'branch') {
      setRevenueBranchId(id);
    } else if (pickerType === 'year') {
      setRevenueYear(id);
      setRevenueDate('');
    } else if (pickerType === 'month') {
      setRevenueMonth(id);
      setRevenueDate('');
      if (revenueYear === 'all') setRevenueYear(new Date().getFullYear().toString());
    } else if (pickerType === 'source') {
      setRevenueSource(id);
    } else if (pickerType === 'method') {
      setRevenueMethod(id);
    } else if (pickerType === 'splitType') {
      setRevenueSplitType(id);
    } else if (pickerType === 'amountRange') {
      setRevenueAmountRange(id);
    } else if (pickerType === 'doctor') {
      setRevenueDoctor(id);
    }
    setPickerVisible(false);
  };

  const openPickerModal = (type) => {
    setPickerType(type);
    setPickerVisible(true);
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return 'N/A';

    // Firestore Timestamp check
    if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      const d = dateVal.toDate();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    // Raw seconds check
    if (dateVal.seconds) {
      const d = new Date(dateVal.seconds * 1000);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    // Javascript Date check
    if (dateVal instanceof Date) {
      const dd = String(dateVal.getDate()).padStart(2, '0');
      const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
      const yyyy = dateVal.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    // Fallback string coercion check
    const dateStr = String(dateVal);
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  const renderTransactionItem = ({ item, index }) => {
    return (
      <Surface style={st.transactionCard}>
        <View style={st.cardHeader}>
          <View style={st.patientBadgeWrapper}>
            <Avatar.Text
              size={34}
              label={(item.patientName || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              style={{ backgroundColor: COLORS.secondary + '15' }}
              labelStyle={{ color: COLORS.secondary, fontSize: 11, fontWeight: '800' }}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={st.patientName} numberOfLines={1}>{item.patientName}</Text>
              <Text style={st.patientPhone} numberOfLines={1}>{item.phone} • {item.regId}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.collectedAmount}>₹{item.amount}</Text>
            <View style={[st.methodTag, { backgroundColor: item.method === 'CASH' ? '#fef3c7' : item.method === 'UPI' ? '#e0f2fe' : item.method === 'CARD' ? '#dcfce7' : '#f1f5f9' }]}>
              <Text style={[st.methodTagText, { color: item.method === 'CASH' ? '#b45309' : item.method === 'UPI' ? '#0369a1' : item.method === 'CARD' ? '#15803d' : '#475569' }]}>{item.method}</Text>
            </View>
          </View>
        </View>

        <View style={st.cardFooter}>
          <View style={{ flex: 1, paddingRight: 8, borderRightWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={st.footerDetailText}>Branch: <Text style={{ fontWeight: '700', color: COLORS.text }}>{item.branch}</Text></Text>
            <Text style={st.footerDetailText}>Doctor: <Text style={{ fontWeight: '700', color: COLORS.text }}>{item.doctorName}</Text></Text>
            <Text style={st.footerDetailText}>Source: <Text style={{ fontWeight: '700', color: COLORS.secondary }}>{item.source}</Text></Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={st.footerDetailText}>Type: <Text style={{ fontWeight: '700', color: COLORS.primary }}>{item.type}</Text></Text>
            <Text style={st.footerDetailText}>Status: <Text style={{ fontWeight: '700', color: item.status === 'PAID' ? COLORS.success : COLORS.danger }}>{item.status}</Text></Text>
            <Text style={st.footerDetailText}>Date: <Text style={{ fontWeight: '700', color: COLORS.text }}>{item.dateTime}</Text></Text>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Consultation Revenue</Text>
        <TouchableOpacity onPress={handleResetRevenueFilters} style={st.resetBtnHeader}>
          <RotateCcw size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={{ marginTop: 12, color: COLORS.muted, fontWeight: '600' }}>Loading financials...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* FlatList with header items to avoid scroll view conflict */}
          <FlatList
            data={allHistoryTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={st.listContent}
            ListHeaderComponent={
              <View>
                {/* ── STATS DASHBOARD ──────────────────────────────── */}
                <View style={st.statsContainer}>
                  {/* Total Revenue */}
                  <Surface style={[st.statsCard, { borderLeftColor: COLORS.primary, borderLeftWidth: 4 }]}>
                    <Text style={st.statsLabel}>Total Revenue</Text>
                    <Text style={[st.statsVal, { color: COLORS.primary }]}>₹{totalCollectedFees.toLocaleString('en-IN')}</Text>
                    <Text style={st.statsSub}>{allHistoryTransactions.length} Transactions</Text>
                  </Surface>

                  {/* Mode Breakdowns */}
                  <Surface style={[st.statsCard, { borderLeftColor: COLORS.warning, borderLeftWidth: 4 }]}>
                    <Text style={st.statsLabel}>By Mode</Text>
                    <View style={st.modeDetails}>
                      <View style={st.modeRow}><Text style={st.modeLabel}>Cash</Text><Text style={[st.modeVal, { color: COLORS.warning }]}>₹{cashCollected}</Text></View>
                      <View style={st.modeRow}><Text style={st.modeLabel}>UPI</Text><Text style={[st.modeVal, { color: COLORS.secondary }]}>₹{upiCollected}</Text></View>
                      <View style={st.modeRow}><Text style={st.modeLabel}>Card</Text><Text style={[st.modeVal, { color: COLORS.success }]}>₹{cardCollected}</Text></View>
                    </View>
                  </Surface>

                  {/* Revenue Split */}
                  <Surface style={[st.statsCard, { borderLeftColor: COLORS.purple, borderLeftWidth: 4, width: SCREEN_W - 32 }]}>
                    <Text style={st.statsLabel}>Revenue Split</Text>
                    <View style={st.modeDetails}>
                      <View style={st.modeRow}>
                        <Text style={st.modeLabel}>Consultation</Text>
                        <Text style={[st.modeVal, { color: COLORS.purple }]}>₹{splitCons.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={st.modeRow}>
                        <Text style={st.modeLabel}>Consultation & Medicine Fee</Text>
                        <Text style={[st.modeVal, { color: '#14b8a6' }]}>₹{splitConsMed.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={st.modeRow}>
                        <Text style={st.modeLabel}>Diet Plan</Text>
                        <Text style={[st.modeVal, { color: '#f43f5e' }]}>₹{splitDiet.toLocaleString('en-IN')}</Text>
                      </View>
                    </View>
                  </Surface>
                </View>



                {/* ── FILTERS BAR ──────────────────────────────── */}
                <Text style={st.sectionTitle}>Filter Records</Text>

                {/* Search box */}
                <Surface style={st.searchContainer}>
                  <Search size={18} color={COLORS.muted} style={{ marginLeft: 10 }} />
                  <TextInput
                    placeholder="Search patient name or phone..."
                    style={st.searchInput}
                    value={revenueSearch}
                    onChangeText={setRevenueSearch}
                    placeholderTextColor={COLORS.muted}
                  />
                  {revenueSearch ? (
                    <TouchableOpacity onPress={() => setRevenueSearch('')}>
                      <X size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                    </TouchableOpacity>
                  ) : null}
                </Surface>

                {/* Filters grid */}
                <View style={st.filtersGrid}>
                  {/* Branch Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('branch')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Branch</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('branch')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Date Select */}
                  <TouchableOpacity
                    style={st.filterDropdown}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Date</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>
                        {revenueDate ? formatDateDisplay(revenueDate) : 'Select Date'}
                      </Text>
                    </View>
                    <Calendar size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Year Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('year')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Year</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('year')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Month Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('month')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Month</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('month')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Source Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('source')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Source</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('source')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Payment Mode Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('method')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Mode</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('method')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Split Type Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('splitType')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Split Type</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('splitType')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Amount Range Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('amountRange')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Amount Range</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('amountRange')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>

                  {/* Doctor Select */}
                  <TouchableOpacity style={st.filterDropdown} onPress={() => openPickerModal('doctor')}>
                    <View style={st.dropdownLeft}>
                      <Text style={st.dropdownLabel}>Doctor</Text>
                      <Text style={st.dropdownSelected} numberOfLines={1}>{getSelectedLabel('doctor')}</Text>
                    </View>
                    <ChevronDown size={16} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>

                {/* Reset Filters button */}
                <TouchableOpacity style={st.resetBtn} onPress={handleResetRevenueFilters}>
                  <RotateCcw size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={st.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>

                {/* Date Picker Component */}
                {showDatePicker && (
                  <DateTimePicker
                    value={revenueDate ? parseHTMLDateToDateObj(revenueDate) || new Date() : new Date()}
                    mode="date"
                    display="default"
                    onValueChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        const y = selectedDate.getFullYear();
                        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const d = String(selectedDate.getDate()).padStart(2, '0');
                        setRevenueDate(`${y}-${m}-${d}`);
                        setRevenueYear('all');
                        setRevenueMonth('all');
                      }
                    }}
                    onDismiss={() => setShowDatePicker(false)}
                  />
                )}

                <Text style={[st.sectionTitle, { marginTop: 20 }]}>Transactions Logs ({filteredRevenuePatients.length})</Text>
              </View>
            }
            ListEmptyComponent={
              <Surface style={st.emptyStateCard}>
                <XCircle size={32} color={COLORS.danger} />
                <Text style={st.emptyStateText}>No collections matching your filters.</Text>
              </Surface>
            }
          />
        </View>
      )}

      {/* ── DROPDOWN PICKER SELECTOR MODAL ──────────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={st.pickerModalContent}>
            <View style={st.pickerHeader}>
              <Text style={st.pickerTitle}>
                {pickerType === 'branch' ? 'Filter Branch' : pickerType === 'year' ? 'Filter Year' : pickerType === 'month' ? 'Filter Month' : pickerType === 'source' ? 'Filter Source' : 'Filter Payment Mode'}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={getPickerItems()}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const currentVal = pickerType === 'branch' ? revenueBranchId : pickerType === 'year' ? revenueYear : pickerType === 'month' ? revenueMonth : pickerType === 'source' ? revenueSource : revenueMethod;
                const isSelected = currentVal === item.id;

                return (
                  <TouchableOpacity style={st.pickerItem} onPress={() => handleSelectPickerItem(item.id)}>
                    <Text style={[st.pickerItemText, isSelected && { color: COLORS.secondary, fontWeight: '700' }]}>{item.name}</Text>
                    {isSelected ? <CheckCircle2 size={18} color={COLORS.secondary} /> : <Circle size={18} color={COLORS.border} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ── CUSTOM ICONS ──
const XCircle = ({ size, color }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: color, fontSize: size * 0.6, fontWeight: '800', marginTop: -2 }}>×</Text>
  </View>
);

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  resetBtnHeader: { padding: 6, borderRadius: 10, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 12, marginTop: 8 },

  // Stats Grid
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  statsCard: {
    width: (SCREEN_W - 42) / 2,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    elevation: 2,
    justifyContent: 'space-between'
  },
  statsLabel: { fontSize: 10, fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  statsVal: { fontSize: 20, fontWeight: '900', marginVertical: 6 },
  statsSub: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  modeDetails: { marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 },
  channelDetails: { marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeLabel: { fontSize: 11, color: COLORS.text, fontWeight: '600', flex: 1 },
  modeVal: { fontSize: 11, fontWeight: '800' },
  emptyStatsText: { fontSize: 11, color: COLORS.muted, fontStyle: 'italic', marginTop: 4 },

  // Search box
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
    marginBottom: 10,
    elevation: 1
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 13,
    color: COLORS.text
  },

  // Filters Bar
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  filterDropdown: {
    width: (SCREEN_W - 40) / 2,
    height: 48,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1
  },
  dropdownLeft: { flex: 1, marginRight: 4 },
  dropdownLabel: { fontSize: 9, color: COLORS.muted, fontWeight: '600' },
  dropdownSelected: { fontSize: 12, color: COLORS.text, fontWeight: '700', marginTop: 1 },

  // Reset Filters Button
  resetBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
    elevation: 2
  },
  resetBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },

  // Transactions logs card list
  transactionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 8
  },
  patientBadgeWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  patientName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  patientPhone: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  collectedAmount: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  methodTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    alignSelf: 'flex-end'
  },
  methodTagText: { fontSize: 9, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerDetailText: { fontSize: 10, color: COLORS.muted, fontWeight: '500' },

  // Empty state
  emptyStateCard: {
    padding: 30,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    elevation: 1,
    alignItems: 'center',
    marginTop: 20
  },
  emptyStateText: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginTop: 10, textAlign: 'center' },

  // Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  pickerModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    padding: 20
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10
  },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  pickerItemText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },

  // Subscription metrics styles
  subscriptionMainCard: {
    width: SCREEN_W - 32,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    elevation: 3,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  subMainHeader: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  subMainLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subMainVal: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 4,
  },
  subMainFormula: {
    fontSize: 10,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    alignSelf: 'stretch',
  },
  subStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  subStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  subStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  subStatSub: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  collapsibleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  expandedContent: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  noDataText: {
    fontSize: 11,
    color: COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  breakdownItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  breakdownItemSub: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },
  breakdownItemAvg: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  breakdownItemLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
});

export default RevenueDashboard;



