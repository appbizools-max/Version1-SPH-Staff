import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Surface, Searchbar, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { ChevronLeft, Calendar, Clock, User, ChevronRight } from 'lucide-react-native';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

const AttendanceList = ({ route, navigation }) => {
  const { userData } = useAuth();
  const branchId = route.params?.branchId || userData.branchId;
  const branchName = route.params?.branchName || userData.branchName;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayLogins, setTodayLogins] = useState({});
  const [statusFilter, setStatusFilter] = useState('active');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // 1. Fetch branch staff
      const q = query(
        collection(db, 'users'),
        where('branchId', '==', branchId)
      );
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        // Only include staff roles (excluding receptionists and head doctors)
        if (['doctor', 'staff'].includes(d.role)) {
          if (d.role === 'doctor' && d.doctorType === 'head') return;
          const status = d.status || 'active';
          data.push({ id: doc.id, ...d, status });
        }
      });
      setEmployees(data);

      // 2. Fetch today's real-time logins/logouts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const logsQ = query(
        collection(db, 'activity_logs'),
        where('timestamp', '>=', today)
      );
      const logsSnapshot = await getDocs(logsQ);
      const logins = {};
      logsSnapshot.forEach((doc) => {
        const log = doc.data();
        if (log.userId) {
          const time = log.timestamp?.toDate?.() || new Date(log.timestamp);
          const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          
          if (!logins[log.userId]) {
            logins[log.userId] = { checkInTime: null, checkOutTime: null, photoUrl: null };
          }

          if (log.action === 'login') {
            if (!logins[log.userId].checkInTime) {
              logins[log.userId].checkInTime = timeStr;
              logins[log.userId].photoUrl = log.photoUrl;
            }
          } else if (log.action === 'logout') {
            logins[log.userId].checkOutTime = timeStr;
          }
        }
      });
      setTodayLogins(logins);
    } catch (error) {
      console.error('Error fetching employees or activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [branchId]);

  const filteredEmployees = employees.filter(emp => {
    return emp.status === statusFilter;
  });

  const renderEmployeeItem = ({ item }) => {
    const checkInData = todayLogins[item.id];
    const isPresent = !!(checkInData && checkInData.checkInTime);
    const checkInTime = isPresent ? checkInData.checkInTime : null;
    const checkOutTime = isPresent ? checkInData.checkOutTime : null;
    const photoUrl = isPresent ? checkInData.photoUrl : null;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('EmployeeDetails', {
          employeeId: item.id,
          employeeName: item.name,
          employeeRole: item.role,
          employeePhone: item.phone
        })}
      >
        <Surface style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: item.role === 'doctor' ? COLORS.primary + '20' : COLORS.secondary + '20' }]}>
                <User size={16} color={item.role === 'doctor' ? COLORS.primary : COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userRole}>{item.role?.toUpperCase()}</Text>
              </View>
            </View>
            {photoUrl && (
              <Image source={{ uri: photoUrl }} style={styles.attendanceSelfie} />
            )}
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[styles.statusBadge, { backgroundColor: isPresent ? '#10b98115' : '#ef444415' }]}>
                <Text style={[styles.statusText, { color: isPresent ? '#10b981' : '#ef4444' }]}>
                  {isPresent ? 'PRESENT' : 'ABSENT'}
                </Text>
              </View>
              {isPresent && (
                <View style={{ alignItems: 'flex-end', marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: COLORS.muted, fontWeight: '600' }}>
                    In: {checkInTime}
                  </Text>
                  {checkOutTime ? (
                    <Text style={{ fontSize: 10, color: COLORS.muted, fontWeight: '600', marginTop: 2 }}>
                      Out: {checkOutTime}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={{ fontSize: 12, color: COLORS.muted }}>{branchName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Branch Stats Overview */}
        {(() => {
          const activeStaff = employees.filter(emp => emp.status === 'active');
          const totalActive = activeStaff.length;
          const presentCount = activeStaff.filter(emp => !!todayLogins[emp.id]).length;
          const absentCount = totalActive - presentCount;

          return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
              <Surface style={styles.miniOverviewCard}>
                <Text style={styles.miniCardVal}>{totalActive}</Text>
                <Text style={styles.miniCardLabel}>Total Staff</Text>
              </Surface>
              <Surface style={[styles.miniOverviewCard, { borderTopColor: '#10b981' }]}>
                <Text style={[styles.miniCardVal, { color: '#10b981' }]}>{presentCount}</Text>
                <Text style={styles.miniCardLabel}>Present</Text>
              </Surface>
              <Surface style={[styles.miniOverviewCard, { borderTopColor: '#ef4444' }]}>
                <Text style={[styles.miniCardVal, { color: '#ef4444' }]}>{absentCount}</Text>
                <Text style={styles.miniCardLabel}>Absent</Text>
              </Surface>
            </View>
          );
        })()}

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'active' && styles.filterTabActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterTabText, statusFilter === 'active' && styles.filterTabTextActive]}>
              Active ({employees.filter(emp => emp.status === 'active').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'inactive' && styles.filterTabActive]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text style={[styles.filterTabText, statusFilter === 'inactive' && styles.filterTabTextActive]}>
              Suspended ({employees.filter(emp => emp.status === 'inactive').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'deleted' && styles.filterTabActive]}
            onPress={() => setStatusFilter('deleted')}
          >
            <Text style={[styles.filterTabText, statusFilter === 'deleted' && styles.filterTabTextActive]}>
              Deleted ({employees.filter(emp => emp.status === 'deleted').length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: COLORS.muted }}>No employees found in this branch.</Text>
              </View>
            }
          />
        )}
      </View>
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
  content: { flex: 1, paddingVertical: 16, paddingHorizontal: 24 },
  searchBar: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchInput: { fontSize: 14 },
  listContent: { paddingBottom: 20 },
  logCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  userRole: { fontSize: 9, color: COLORS.muted, fontWeight: '700' },
  attendanceSelfie: { width: 36, height: 36, borderRadius: 8, marginRight: 8, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterTabActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b'
  },
  filterTabTextActive: {
    color: COLORS.white
  },
  miniOverviewCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 3,
    borderTopColor: COLORS.secondary,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  miniCardVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text
  },
  miniCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    marginTop: 2,
    textAlign: 'center'
  },
});

export default AttendanceList;
