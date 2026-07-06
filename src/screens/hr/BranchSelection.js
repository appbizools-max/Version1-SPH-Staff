import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronLeft, MapPin, ChevronRight, Building } from 'lucide-react-native';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

const BranchSelection = ({ navigation }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'branch'));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const filteredBranches = branches.filter(b =>
    b.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBranchItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AttendanceList', { branchId: item.id, branchName: item.name })}
    >
      <Surface style={styles.branchCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{item.name}</Text>
          <Text style={styles.branchLocation}>{item.location || 'Spiritual Homeopathy Clinic'}</Text>
        </View>
        <ChevronRight size={20} color={COLORS.muted} />
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Branch</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={branches}
            renderItem={renderBranchItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: COLORS.muted }}>No branches found.</Text>
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
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  branchName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  branchLocation: { fontSize: 12, color: COLORS.muted },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
});

export default BranchSelection;
