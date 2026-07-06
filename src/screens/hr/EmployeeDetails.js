import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Linking, Alert } from 'react-native';
import { Text, Surface, Avatar, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, Calendar, Clock, User, Phone, Briefcase, MapPin, Mail, Edit } from 'lucide-react-native';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

const EmployeeDetails = ({ route, navigation }) => {
  const { employeeId, employeeName, employeeRole, employeePhone } = route.params;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('active');
  const [toggling, setToggling] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);

  const formatJoiningDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      let d;
      if (dateVal.toDate && typeof dateVal.toDate === 'function') {
        d = dateVal.toDate();
      } else if (dateVal.seconds) {
        d = new Date(dateVal.seconds * 1000);
      } else {
        d = new Date(dateVal);
      }
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch (e) {
      return 'N/A';
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const userRef = doc(db, 'users', employeeId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setEmployeeData(data);
        setStatus(data.status || 'active');
      }
    } catch (e) {
      console.error('Error fetching employee details:', e);
    }
  };

  const handleToggleAccess = async () => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    const alertMsg = status === 'active'
      ? `Are you sure you want to remove access for ${employeeData?.name || employeeName}? They will no longer be able to log in to any branch.`
      : `Are you sure you want to restore access for ${employeeData?.name || employeeName}?`;

    Alert.alert(
      status === 'active' ? 'Revoke Access' : 'Restore Access',
      alertMsg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setToggling(true);
            try {
              const userRef = doc(db, 'users', employeeId);
              await updateDoc(userRef, { status: newStatus });
              setStatus(newStatus);
              Alert.alert('Success', `Access status updated to ${newStatus?.toUpperCase()}.`);
            } catch (error) {
              console.error('Error toggling staff access:', error);
              Alert.alert('Error', 'Failed to update access status.');
            } finally {
              setToggling(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteStaff = async () => {
    Alert.alert(
      'Delete Staff Profile',
      `Are you sure you want to permanently delete ${employeeData?.name || employeeName}? This action is irreversible and will mark their profile as deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setToggling(true);
            try {
              const userRef = doc(db, 'users', employeeId);
              await updateDoc(userRef, { status: 'deleted' });
              Alert.alert('Success', 'Staff profile permanently deleted.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error deleting staff profile:', error);
              Alert.alert('Error', 'Failed to delete staff profile.');
            } finally {
              setToggling(false);
            }
          }
        }
      ]
    );
  };

  const fetchCompleteLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'activity_logs'),
        where('userId', '==', employeeId)
      );

      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        if (docData.action === 'login' || docData.action === 'logout') {
          data.push({ id: doc.id, ...docData });
        }
      });

      // Sort descending by timestamp
      const sortedData = data.sort((a, b) => {
        const timeA = (a.timestamp && typeof a.timestamp.toDate === 'function') ? a.timestamp.toDate() : (a.timestamp ? new Date(a.timestamp) : 0);
        const timeB = (b.timestamp && typeof b.timestamp.toDate === 'function') ? b.timestamp.toDate() : (b.timestamp ? new Date(b.timestamp) : 0);
        return timeB - timeA;
      });

      setLogs(sortedData);
    } catch (error) {
      console.error('Error fetching employee logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
    fetchCompleteLogs();
  }, []);

  // Listen to navigation focus to refresh the page details when back from Edit Screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEmployeeData();
      fetchCompleteLogs();
    });
    return unsubscribe;
  }, [navigation]);

  const renderLogItem = ({ item }) => (
    <Surface style={styles.logItem}>
      <View style={styles.logTimeBox}>
        <Clock size={16} color={COLORS.muted} />
        <Text style={styles.logTime}>
          {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.logDate}>
          {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
        </Text>
        {item.location && (
          <TouchableOpacity
            style={styles.locationLink}
            onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`)}
          >
            <MapPin size={10} color={COLORS.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.address || 'View Map'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Chip
        mode="flat"
        style={[
          styles.actionChip,
          { backgroundColor: item.action === 'login' ? COLORS.primary + '15' : 'rgba(239, 68, 68, 0.15)' }
        ]}
        textStyle={{ color: item.action === 'login' ? COLORS.primary : '#ef4444', fontSize: 10, fontWeight: 'bold' }}
      >
        {item.action?.toUpperCase()}
      </Chip>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={styles.profileCard}>
          <Avatar.Text
            size={70}
            label={employeeData?.name ? employeeData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
            style={{ backgroundColor: COLORS.secondary }}
          />
          <Text style={styles.empName}>{employeeData?.name || employeeName}</Text>
          <Text style={styles.empRole}>
            {employeeData?.role?.toUpperCase()}
            {employeeData?.role === 'doctor' && ` (${employeeData.doctorType === 'head' ? 'HEAD' : 'EMPLOYEE'})`}
          </Text>

          <View style={[styles.statusBadge, {
            backgroundColor: status === 'active' ? '#10b98115' : status === 'inactive' ? '#f59e0b15' : '#71717a15',
            marginTop: 10
          }]}>
            <Text style={{
              fontSize: 10,
              fontWeight: '800',
              color: status === 'active' ? '#10b981' : status === 'inactive' ? '#f59e0b' : '#71717a',
              letterSpacing: 0.5
            }}>
              {status?.toUpperCase()} ACCESS
            </Text>
          </View>

          <View style={styles.detailsList}>
            {/* Phone */}
            <View style={styles.detailItemRow}>
              <Phone size={14} color={COLORS.muted} />
              <Text style={styles.detailLabelText}>Phone:</Text>
              <Text style={styles.detailValText}>{employeeData?.phone || employeePhone || 'No Phone'}</Text>
            </View>

            {/* Email */}
            {employeeData?.email ? (
              <View style={styles.detailItemRow}>
                <Mail size={14} color={COLORS.muted} />
                <Text style={styles.detailLabelText}>Email:</Text>
                <Text style={styles.detailValText}>{employeeData.email}</Text>
              </View>
            ) : null}

            {/* Branch */}
            {['staff', 'receptionist'].includes(employeeData?.role) && (
              <View style={styles.detailItemRow}>
                <MapPin size={14} color={COLORS.muted} />
                <Text style={styles.detailLabelText}>Branch:</Text>
                <Text style={styles.detailValText}>{employeeData.branchName || 'Not Assigned'}</Text>
              </View>
            )}

            {/* Joining Date */}
            {employeeData?.createdAt ? (
              <View style={styles.detailItemRow}>
                <Calendar size={14} color={COLORS.muted} />
                <Text style={styles.detailLabelText}>Joining Date:</Text>
                <Text style={styles.detailValText}>{formatJoiningDate(employeeData.createdAt)}</Text>
              </View>
            ) : null}

            {/* Salary */}
            {(employeeData?.role === 'staff' || (employeeData?.role === 'doctor' && employeeData?.doctorType === 'employee')) && (
              <>
                <View style={styles.detailItemRow}>
                  <Briefcase size={14} color={COLORS.muted} />
                  <Text style={styles.detailLabelText}>Base Salary:</Text>
                  <Text style={[styles.detailValText, { color: COLORS.secondary, fontWeight: '700' }]}>
                    Rs {Number(employeeData.salary || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Shift and timing */}
                <View style={styles.detailItemRow}>
                  <Clock size={14} color={COLORS.muted} />
                  <Text style={styles.detailLabelText}>Shift Type:</Text>
                  <Text style={styles.detailValText}>
                    {employeeData.shiftType === 'multi' ? 'Multi Strict' : 'Single Strict'}
                  </Text>
                </View>

                <View style={[styles.detailItemRow, { alignItems: 'flex-start' }]}>
                  <Calendar size={14} color={COLORS.muted} style={{ marginTop: 2 }} />
                  <Text style={styles.detailLabelText}>Timings:</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailValText}>
                      Shift 1: {employeeData.loginTime || '09:00 AM'} – {employeeData.logoutTime || '06:00 PM'}
                    </Text>
                    {employeeData.shiftType === 'multi' && (
                      <Text style={[styles.detailValText, { marginTop: 4 }]}>
                        Shift 2: {employeeData.loginTime2 || '04:00 PM'} – {employeeData.logoutTime2 || '09:00 PM'}
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </Surface>

        {/* Action Buttons */}
        <View style={{ marginBottom: 20 }}>
          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor="white"
            onPress={() => navigation.navigate('AddStaff', { editEmployeeId: employeeId })}
            style={{ borderRadius: 16, paddingVertical: 6, marginBottom: 12 }}
            labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
            icon={() => <Edit size={16} color="white" />}
          >
            Edit Profile Details
          </Button>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              mode="contained"
              buttonColor={status === 'active' ? '#f59e0b' : COLORS.secondary}
              textColor="white"
              onPress={handleToggleAccess}
              loading={toggling}
              disabled={toggling}
              style={{ flex: 1, borderRadius: 16, paddingVertical: 6 }}
              labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
            >
              {status === 'active' ? 'Suspend Access' : 'Restore Access'}
            </Button>

            <Button
              mode="contained"
              buttonColor="#ef4444"
              textColor="white"
              onPress={handleDeleteStaff}
              loading={toggling}
              disabled={toggling}
              style={{ flex: 1, borderRadius: 16, paddingVertical: 6 }}
              labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
            >
              Delete Profile
            </Button>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Surface style={styles.statBox}>
            <Text style={styles.statLabel}>Total Logs</Text>
            <Text style={styles.statValue}>{logs.length}</Text>
          </Surface>
          <Surface style={styles.statBox}>
            <Text style={styles.statLabel}>Days Present</Text>
            <Text style={styles.statValue}>
              {new Set(logs.map(l => l.timestamp?.toDate ? l.timestamp.toDate().toDateString() : null).filter(Boolean)).size}
            </Text>
          </Surface>
        </View>

        <Text style={styles.sectionTitle}>Attendance History</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No activity logs found for this user.</Text>
            }
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
    borderBottomColor: COLORS.border
  },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { padding: 20 },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    elevation: 4,
    marginBottom: 20
  },
  empName: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 16 },
  empRole: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  detailsList: {
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    width: 80,
  },
  detailValText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', elevation: 2 },
  statLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.secondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    marginBottom: 10,
    elevation: 1
  },
  logTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 90 },
  logTime: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  logDate: { fontSize: 13, color: COLORS.muted },
  actionChip: { height: 24, borderRadius: 6 },
  emptyText: { textAlign: 'center', marginTop: 20, color: COLORS.muted },
  locationLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 10, color: COLORS.secondary, fontWeight: '500' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
});

export default EmployeeDetails;
