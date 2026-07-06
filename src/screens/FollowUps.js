import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, Surface, ActivityIndicator, Avatar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ChevronRight, CalendarClock, Phone, MessageCircle, User, RefreshCw, CalendarPlus, X, Calendar, UserCheck } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const WhatsAppIcon = ({ size = 16, color = '#25d366' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.768.46 3.491 1.335 5.015L2 22l5.13-1.348a9.98 9.98 0 0 0 4.901 1.28c5.54 0 10.03-4.49 10.03-10.03C22.062 6.49 17.571 2 12.031 2zm6.182 14.18c-.272.766-1.356 1.394-1.922 1.49-.49.082-.99.04-2.884-.716-2.42-.968-3.958-3.414-4.08-3.576-.118-.162-.962-1.282-.962-2.444 0-1.162.612-1.73.83-1.964.218-.236.478-.294.636-.294.158 0 .316.002.454.008.146.006.342-.056.536.41.2.48.682 1.662.742 1.782.06.12.1.258.02.418-.08.16-.178.272-.294.408-.118.136-.248.304-.354.408-.12.118-.244.246-.104.484.14.238.622 1.026 1.334 1.66.92.818 1.694 1.07 1.932 1.19.238.12.378.102.518-.058.14-.16.6-1.012.76-1.356.16-.344.318-.288.536-.208.218.08 1.382.652 1.62.77.238.118.396.176.456.276.06.1.06.58-.212 1.346z" />
  </Svg>
);
import DateTimePicker from '@react-native-community/datetimepicker';

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
};

const normalizeDateToYYYYMMDD = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal.seconds) {
    const d = new Date(dateVal.seconds * 1000);
    return d.toISOString().split('T')[0];
  }
  if (typeof dateVal === 'string') {
    if (dateVal.includes('T')) return dateVal.split('T')[0];
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return dateVal;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return '';
};

const FollowUps = ({ navigation }) => {
  const { userData } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followUpDateFilter, setFollowUpDateFilter] = useState(new Date());
  const [showFollowUpDatePicker, setShowFollowUpDatePicker] = useState(false);
  const [followUpFilterMode, setFollowUpFilterMode] = useState('all'); // 'all', 'today', 'tomorrow', 'custom', 'last_month', etc.
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [reschedulePatient, setReschedulePatient] = useState(null);
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());

  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    // 6 months back, current, 6 months forward
    for (let i = -6; i <= 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${monthNum}`, label });
    }
    return options;
  };

  useEffect(() => {
    let unsubPatients = null;

    // Branch matching helper
    const isBranchMatch = (data) => {
      if (!userData?.branchId) return true;
      if (userData?.role === 'doctor') return true;

      const normalizeBranch = (branch) => {
        if (!branch) return '';
        const str = branch.toLowerCase().trim();
        if (str.includes('kphb')) return 'kphb';
        if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
        if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilshuknagar';
        if (str.includes('nallagandla')) return 'nallagandla';
        return str.replace(/\\s*branch\\s*/i, '').trim();
      };

      const normVal = normalizeBranch(data.branchId);
      const normName = normalizeBranch(data.branchName);
      const normUserId = normalizeBranch(userData.branchId);
      const normUserName = normalizeBranch(userData.branchName);

      return normVal === normUserId || normVal === normUserName ||
             normName === normUserId || normName === normUserName ||
             data.branchId === userData.branchId || data.branchId === userData.branchName ||
             data.branchName === userData.branchName || data.branchName === userData.branchId;
    };

    // Subscribe to followups collection
    const patientsRef = collection(db, 'followups');
    const qPatients = query(patientsRef);

    unsubPatients = onSnapshot(qPatients, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Skip if followUpInterval is explicitly 'No Follow-up'
        if (data.followUpInterval === 'No Follow-up') return;
        const matchResult = !data.branchId || isBranchMatch(data);
        if (userData?.role === 'doctor' || matchResult) {
          list.push({ id: doc.id, ...data, _source: 'followups' });
        }
      });
      setPatients(list);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching patients follow-ups:', error);
      setLoading(false);
    });

    return () => {
      if (unsubPatients) unsubPatients();
    };
  }, [userData]);

  const handleCall = (phone) => {
    Alert.alert(
      'Call Patient',
      `Call ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {} }
      ]
    );
  };

  const handleWhatsApp = (phone) => {
    Alert.alert(
      'WhatsApp Patient',
      `Message ${phone} on WhatsApp?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => {} }
      ]
    );
  };

  const handleReschedule = async (newDate) => {
    if (!reschedulePatient) return;
    const newDateStr = newDate.toISOString().split('T')[0];
    try {
      const followUpRef = doc(db, 'followups', reschedulePatient.id);
      await updateDoc(followUpRef, {
        followUpDate: newDateStr,
      });
      if (reschedulePatient.patientId) {
        try {
          await updateDoc(doc(db, 'allpatients', reschedulePatient.patientId), {
            followUpDate: newDateStr
          });
        } catch (err) {}
      }
      Alert.alert('Rescheduled', `Follow-up rescheduled to ${newDate.toLocaleDateString('en-GB')}`);
    } catch (err) {
      console.error('Error rescheduling follow-up:', err);
      Alert.alert('Error', 'Failed to reschedule follow-up.');
    } finally {
      setReschedulePatient(null);
    }
  };

  const filteredPatients = React.useMemo(() => {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const todayStr = todayObj.toISOString().split('T')[0];

    const tomorrowObj = new Date(todayObj);
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    const customStr = followUpDateFilter.toISOString().split('T')[0];

    return patients.filter(p => {
      const fDateStr = normalizeDateToYYYYMMDD(p.followUpDate);
      if (!fDateStr) return false;

      if (followUpFilterMode === 'today') {
        return fDateStr === todayStr;
      } else if (followUpFilterMode === 'tomorrow') {
        return fDateStr === tomorrowStr;
      } else if (followUpFilterMode === 'custom') {
        return fDateStr === customStr;
      } else if (followUpFilterMode === 'last_month') {
        const firstOfLastMonth = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
        const lastOfLastMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 0, 23, 59, 59);
        const fTime = new Date(fDateStr + 'T00:00:00').getTime();
        return fTime >= firstOfLastMonth.getTime() && fTime <= lastOfLastMonth.getTime();
      } else if (followUpFilterMode === 'last_2_months') {
        const limitDate = new Date(todayObj);
        limitDate.setMonth(limitDate.getMonth() - 2);
        const fTime = new Date(fDateStr + 'T00:00:00').getTime();
        return fTime >= limitDate.getTime() && fTime <= todayObj.getTime() + 24*60*60*1000;
      } else if (followUpFilterMode === 'last_4_months') {
        const limitDate = new Date(todayObj);
        limitDate.setMonth(limitDate.getMonth() - 4);
        const fTime = new Date(fDateStr + 'T00:00:00').getTime();
        return fTime >= limitDate.getTime() && fTime <= todayObj.getTime() + 24*60*60*1000;
      } else if (followUpFilterMode === 'upcoming_month') {
        const firstOfNextMonth = new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 1);
        const lastOfNextMonth = new Date(todayObj.getFullYear(), todayObj.getMonth() + 2, 0, 23, 59, 59);
        const fTime = new Date(fDateStr + 'T00:00:00').getTime();
        return fTime >= firstOfNextMonth.getTime() && fTime <= lastOfNextMonth.getTime();
      } else if (followUpFilterMode === 'select_month') {
        return fDateStr.startsWith(selectedMonth);
      }
      return true; // Show all
    });
  }, [patients, followUpFilterMode, followUpDateFilter, selectedMonth]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronRight size={24} color={COLORS.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Ups</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContainer}
          >
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('today')}
              style={[styles.filterChip, followUpFilterMode === 'today' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'today' && styles.filterChipTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('tomorrow')}
              style={[styles.filterChip, followUpFilterMode === 'tomorrow' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'tomorrow' && styles.filterChipTextActive]}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('last_month')}
              style={[styles.filterChip, followUpFilterMode === 'last_month' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'last_month' && styles.filterChipTextActive]}>Last Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('last_2_months')}
              style={[styles.filterChip, followUpFilterMode === 'last_2_months' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'last_2_months' && styles.filterChipTextActive]}>Last 2 Months</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('last_4_months')}
              style={[styles.filterChip, followUpFilterMode === 'last_4_months' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'last_4_months' && styles.filterChipTextActive]}>Last 4 Months</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('upcoming_month')}
              style={[styles.filterChip, followUpFilterMode === 'upcoming_month' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'upcoming_month' && styles.filterChipTextActive]}>Upcoming Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === '') {
                  const today = new Date();
                  const year = today.getFullYear();
                  const monthNum = String(today.getMonth() + 1).padStart(2, '0');
                  setSelectedMonth(`${year}-${monthNum}`);
                }
                setFollowUpFilterMode('select_month');
                setShowMonthPicker(true);
              }}
              style={[styles.filterChip, followUpFilterMode === 'select_month' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'select_month' && styles.filterChipTextActive]}>Select Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('custom')}
              style={[styles.filterChip, followUpFilterMode === 'custom' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'custom' && styles.filterChipTextActive]}>Select Date</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowUpFilterMode('all')}
              style={[styles.filterChip, followUpFilterMode === 'all' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, followUpFilterMode === 'all' && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
          </ScrollView>

          {followUpFilterMode === 'custom' && (
            <TouchableOpacity
              onPress={() => setShowFollowUpDatePicker(true)}
              style={styles.datePickerButton}
            >
              <CalendarClock size={16} color={COLORS.secondary} />
              <Text style={styles.datePickerText}>
                {followUpDateFilter.toLocaleDateString('en-GB')}
              </Text>
            </TouchableOpacity>
          )}

          {followUpFilterMode === 'select_month' && (
            <TouchableOpacity
              onPress={() => setShowMonthPicker(true)}
              style={styles.datePickerButton}
            >
              <CalendarClock size={16} color={COLORS.secondary} />
              <Text style={styles.datePickerText}>
                {selectedMonth ? getMonthOptions().find(o => o.value === selectedMonth)?.label : 'Select Month'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Month Picker Modal */}
        <Modal
          visible={showMonthPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                {getMonthOptions().map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalOption,
                      selectedMonth === opt.value && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedMonth(opt.value);
                      setFollowUpFilterMode('select_month');
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedMonth === opt.value && styles.modalOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMonthPicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {showFollowUpDatePicker && (
          <DateTimePicker
            value={followUpDateFilter}
            mode="date"
            display="default"
            onValueChange={(event, selectedDate) => {
              setShowFollowUpDatePicker(false);
              if (selectedDate) {
                setFollowUpDateFilter(selectedDate);
              }
            }}
            onDismiss={() => setShowFollowUpDatePicker(false)}
          />
        )}

        {/* Follow Ups List */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : filteredPatients.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <User size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No follow-ups for this filter.</Text>
          </Surface>
        ) : (
          filteredPatients.map(patient => (
            <Surface key={patient.id} style={styles.patientCard}>
              <View style={styles.cardHeader}>
                <Avatar.Text
                  size={40}
                  label={(patient.patientName || patient.fullName) ? (patient.patientName || patient.fullName).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'P'}
                  style={{ backgroundColor: '#f59e0b15' }}
                  labelStyle={{ color: '#f59e0b', fontWeight: '800', fontSize: 12 }}
                />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.patientName || patient.fullName}</Text>
                  <View style={{ backgroundColor: '#fef3c7', borderColor: '#fcd34d', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 }}>
                    <Text style={{ color: '#b45309', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 }}>{patient.followUpInterval || 'Follow-up'}</Text>
                  </View>
                  <Text style={styles.doctorText}>
                    {patient.doctor ? (patient.doctor.startsWith('Dr.') || patient.doctor.startsWith('Dr ') ? patient.doctor : `Dr. ${patient.doctor}`) : 'Unassigned'}
                  </Text>
                  <Text style={styles.followUpDateText}>Follow-up: {patient.followUpDate}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PatientDetails', { patientId: patient.id })}
                >
                  <ChevronRight size={20} color={COLORS.muted} />
                </TouchableOpacity>
              </View>

              {!!patient.phone && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleCall(patient.phone)}
                    style={styles.actionButton}
                  >
                    <Phone size={14} color="#10b981" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleWhatsApp(patient.phone)}
                    style={[styles.actionButton, styles.whatsappButton]}
                  >
                    <WhatsAppIcon size={14} color="#25d366" />
                    <Text style={[styles.actionButtonText, styles.whatsappButtonText]}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setReschedulePatient(patient);
                      setRescheduleDate(patient.followUpDate ? new Date(patient.followUpDate) : new Date());
                      setShowReschedulePicker(true);
                    }}
                    style={[styles.actionButton, { backgroundColor: '#eff6ff' }]}
                  >
                    <RefreshCw size={14} color={COLORS.secondary} />
                    <Text style={[styles.actionButtonText, { color: COLORS.secondary }]}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('RegisterPatient', { prefillPatient: patient });
                    }}
                    style={[styles.actionButton, { backgroundColor: '#f0fdf4' }]}
                  >
                    <CalendarPlus size={14} color={COLORS.primary} />
                    <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Book</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Surface>
          ))
        )}

        {showReschedulePicker && (
          <DateTimePicker
            value={rescheduleDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onValueChange={(event, selectedDate) => {
              setShowReschedulePicker(false);
              if (selectedDate) {
                setRescheduleDate(selectedDate);
                handleReschedule(selectedDate);
              } else {
                setReschedulePatient(null);
              }
            }}
            onDismiss={() => {
              setShowReschedulePicker(false);
              setReschedulePatient(null);
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  content: { padding: 16 },
  filterSection: { marginBottom: 16 },
  filterTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  filterChipTextActive: { color: 'white' },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  datePickerText: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginLeft: 8 },
  patientCard: { padding: 16, borderRadius: 16, backgroundColor: COLORS.white, elevation: 2, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  patientInfo: { flex: 1, marginLeft: 12 },
  patientName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  doctorText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  followUpDateText: { fontSize: 11, color: COLORS.secondary, fontWeight: '700', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexWrap: 'wrap' },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexGrow: 1, justifyContent: 'center' },
  actionButtonText: { fontSize: 12, color: '#10b981', fontWeight: '700', marginLeft: 4 },
  whatsappButton: { backgroundColor: '#ecfdf5' },
  whatsappButtonText: { color: '#25d366' },
  emptyCard: { padding: 32, borderRadius: 16, backgroundColor: COLORS.white, elevation: 2, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: COLORS.muted, fontWeight: '600', marginTop: 12 },
  filterChipsContainer: { paddingRight: 16, gap: 8, paddingVertical: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    maxHeight: '70%'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center'
  },
  modalOptionTextActive: {
    color: COLORS.white,
    fontWeight: '700'
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    textAlign: 'center'
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  filterModalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12 },
  pickerWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  pickerItemActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  pickerItemText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  pickerItemTextActive: { color: COLORS.white },
  modalActionButtons: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 16 },
  confirmBtn: { flex: 1, borderRadius: 12 },
  cancelBtn: { flex: 1, borderRadius: 12, borderColor: COLORS.border },
});

export default FollowUps;
