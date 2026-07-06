import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { ChevronLeft, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { createNotification } from '../../utils/notificationService';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  danger: '#ef4444',
  success: '#10b981',
};

const LeaveApprovals = ({ navigation }) => {
  const { userData } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      // Fetching all leave requests. If HR, fetch all. Otherwise filter by branch.
      let q;
      if (userData?.role && userData.role.toLowerCase() === 'hr') {
        q = query(collection(db, 'leave_requests'));
      } else {
        q = query(
          collection(db, 'leave_requests'),
          where('branchId', '==', userData?.branchId || '')
        );
      }
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort in memory to avoid Firestore index error
      const sortedData = data.sort((a, b) => {
        const timeA = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : 0);
        const timeB = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : 0);
        return timeB - timeA;
      });
      
      setLeaves(sortedData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleStatusUpdate = async (leaveId, newStatus, userId, staffName) => {
    try {
      await updateDoc(doc(db, 'leave_requests', leaveId), {
        status: newStatus,
        reviewedBy: userData.name,
        reviewedAt: new Date().toISOString()
      });
      
      // Notify the user who requested the leave
      if (userId) {
        await createNotification(
          userId,
          `Leave ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
          `Your leave request has been ${newStatus} by HR.`,
          'leave_status',
          { status: newStatus }
        );
      }
      
      Alert.alert('Success', `Leave request ${newStatus} successfully.`);
      fetchLeaves();
    } catch (error) {
      console.error('Error updating leave:', error);
      Alert.alert('Error', 'Failed to update leave status.');
    }
  };

  const renderLeaveItem = ({ item }) => {
    // Generate avatar initials
    const initials = item.staffName ? item.staffName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST';

    return (
      <Surface style={styles.leaveCard} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.staffName}>{item.staffName}</Text>
            <Text style={styles.staffRole}>{item.staffRole?.toUpperCase() || 'STAFF'}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: 
                item.status === 'approved' ? '#dcfce7' : 
                item.status === 'rejected' ? '#fef2f2' : 
                '#eff6ff'
            }
          ]}>
            <Text style={[
              styles.statusText,
              { 
                color: 
                  item.status === 'approved' ? '#166534' : 
                  item.status === 'rejected' ? '#991b1b' : 
                  '#1d4ed8'
              }
            ]}>
              {item.status === 'approved' ? 'ACCEPTED' : item.status === 'rejected' ? 'REJECTED' : 'PENDING'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color={COLORS.secondary} />
              <Text style={styles.dateText}>{item.startDate} to {item.endDate}</Text>
            </View>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{item.category || item.leaveType || 'General'}</Text>
            </View>
          </View>
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>"{item.reason}"</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleStatusUpdate(item.id, 'rejected', item.userId, item.staffName)}
              style={[styles.actionBtn, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}
            >
              <XCircle size={16} color={COLORS.danger} />
              <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleStatusUpdate(item.id, 'approved', item.userId, item.staffName)}
              style={[styles.actionBtn, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
            >
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </Surface>
    );
  };

  const filteredLeaves = leaves.filter(item => {
    if (activeTab === 'pending') {
      return item.status === 'pending';
    } else {
      return item.status === 'approved' || item.status === 'rejected';
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending ({leaves.filter(l => l.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History ({leaves.filter(l => l.status !== 'pending').length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredLeaves}
            renderItem={renderLeaveItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: COLORS.muted }}>
                  {activeTab === 'pending' ? 'No leave requests pending.' : 'No leave history found.'}
                </Text>
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
  content: { flex: 1, padding: 16 },
  listContent: { paddingBottom: 20 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.secondary,
  },
  leaveCard: { 
    padding: 16, 
    borderRadius: 16, 
    backgroundColor: COLORS.white, 
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary
  },
  staffName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  staffRole: { fontSize: 9, color: COLORS.muted, fontWeight: '700', marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardBody: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  dateText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  typeTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.secondary
  },
  reasonBox: { marginTop: 8 },
  reasonLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  reasonText: { fontSize: 13, color: COLORS.text, lineHeight: 18, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800'
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
});

export default LeaveApprovals;
