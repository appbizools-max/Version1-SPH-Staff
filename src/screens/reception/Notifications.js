import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import { ChevronLeft, Bell, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  success: '#10b981',
  danger: '#ef4444',
  unread: '#eff6ff'
};
const Notifications = ({ navigation }) => {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const userIds = [user.uid];
      if (userData?.id && userData.id !== user.uid) {
        userIds.push(userData.id);
      }

      const q = query(
        collection(db, 'notifications'),
        where('userId', 'in', userIds)
      );
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));

      // Sort in memory by createdAt descending
      data.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return timeB - timeA;
      });

      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, userData]);

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const renderIcon = (type, metadata) => {
    if (type === 'leave_request') return <FileText size={20} color={COLORS.secondary} />;
    if (type === 'leave_status') {
      return metadata?.status === 'approved'
        ? <CheckCircle size={20} color={COLORS.success} />
        : <XCircle size={20} color={COLORS.danger} />;
    }
    return <Bell size={20} color={COLORS.primary} />;
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity onPress={() => markAsRead(item.id)} activeOpacity={0.7}>
        <Surface style={[styles.card, !item.isRead && styles.unreadCard]}>
          <View style={styles.iconContainer}>
            {renderIcon(item.type, item.metadata)}
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>
              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
            </Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={40} color={COLORS.muted} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  unreadCard: {
    backgroundColor: COLORS.unread,
    borderColor: COLORS.secondary + '30'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  body: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    alignSelf: 'center',
    marginLeft: 8
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' }
});

export default Notifications;
