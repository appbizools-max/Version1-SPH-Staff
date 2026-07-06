import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Surface, RadioButton, Divider } from 'react-native-paper';
import { ChevronLeft, MapPin, Send, Package } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#1e293b',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

const ShippingForm = ({ navigation }) => {
  const { userData, user } = useAuth();
  const [shippingType, setShippingType] = useState('National');
  
  const [fromAddress, setFromAddress] = useState('');
  const [fromPincode, setFromPincode] = useState('');
  
  const [toAddress, setToAddress] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [toCountry, setToCountry] = useState('India');
  
  const [packageDetails, setPackageDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fromAddress || !fromPincode || !toAddress || !toPincode || !packageDetails) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'shipping_requests'), {
        userId: user.uid,
        staffName: userData?.name || 'Staff Member',
        branchId: userData?.branchId || '',
        shippingType,
        fromAddress,
        fromPincode,
        toAddress,
        toPincode,
        toCountry: shippingType === 'National' ? 'India' : toCountry,
        packageDetails,
        status: 'pending',
        provider: 'Shiprocket',
        createdAt: serverTimestamp()
      });
      
      Alert.alert('Success', 'Shipping request submitted to Shiprocket successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Shipping submission error:', error);
      Alert.alert('Error', 'Failed to submit shipping request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shiprocket Shipping</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>Shipping Type</Text>
          <RadioButton.Group onValueChange={newValue => setShippingType(newValue)} value={shippingType}>
            <View style={styles.radioRow}>
              <View style={styles.radioItem}>
                <RadioButton value="National" color="#f59e0b" />
                <Text style={styles.radioLabel}>National (India)</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="International" color="#f59e0b" />
                <Text style={styles.radioLabel}>International</Text>
              </View>
            </View>
          </RadioButton.Group>
        </Surface>

        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>From Address (Pickup)</Text>
          <TextInput
            mode="outlined"
            placeholder="Full Address"
            value={fromAddress}
            onChangeText={setFromAddress}
            multiline
            numberOfLines={2}
            style={styles.input}
            activeOutlineColor="#f59e0b"
            left={<TextInput.Icon icon={() => <MapPin size={20} color={COLORS.muted} />} />}
          />
          <View style={{ height: 12 }} />
          <TextInput
            mode="outlined"
            placeholder="Pincode"
            value={fromPincode}
            onChangeText={setFromPincode}
            keyboardType="number-pad"
            style={styles.input}
            activeOutlineColor="#f59e0b"
          />
        </Surface>

        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>To Address (Delivery)</Text>
          <TextInput
            mode="outlined"
            placeholder="Full Address"
            value={toAddress}
            onChangeText={setToAddress}
            multiline
            numberOfLines={2}
            style={styles.input}
            activeOutlineColor="#f59e0b"
            left={<TextInput.Icon icon={() => <MapPin size={20} color={COLORS.muted} />} />}
          />
          <View style={{ height: 12 }} />
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              placeholder="Pincode/Zip"
              value={toPincode}
              onChangeText={setToPincode}
              keyboardType="default"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              activeOutlineColor="#f59e0b"
            />
            {shippingType === 'International' && (
              <TextInput
                mode="outlined"
                placeholder="Country"
                value={toCountry}
                onChangeText={setToCountry}
                style={[styles.input, { flex: 1 }]}
                activeOutlineColor="#f59e0b"
              />
            )}
          </View>
        </Surface>

        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>Package Details</Text>
          <TextInput
            mode="outlined"
            placeholder="Weight, Dimensions, Contents (e.g., 2kg, Medicines)"
            value={packageDetails}
            onChangeText={setPackageDetails}
            multiline
            numberOfLines={3}
            style={styles.input}
            activeOutlineColor="#f59e0b"
            left={<TextInput.Icon icon={() => <Package size={20} color={COLORS.muted} />} />}
          />
        </Surface>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitBtn}
          icon={() => <Send size={20} color={COLORS.white} />}
        >
          Create Shipping Request
        </Button>
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
  scrollContent: { padding: 16 },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    elevation: 2,
    marginBottom: 16
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  radioItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  radioLabel: { fontSize: 14, color: COLORS.text },
  input: { backgroundColor: COLORS.white },
  row: { flexDirection: 'row' },
  submitBtn: {
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    marginTop: 8,
    marginBottom: 30
  }
});

export default ShippingForm;
