import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Upload, AlertCircle, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  text: '#0f172a',
  background: '#f8fafc',
  border: '#e2e8f0',
  error: '#ef4444',
};

const CleaningLockScreen = () => {
  const { userData } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Required", "Camera permission is needed to take photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Required", "Gallery permission is needed to select photos.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsMultipleSelection: true,
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets) {
        setSelectedPhotos(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error("Image pick error:", error);
    }
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert("No Photos", "Please select or take at least one photo.");
      return;
    }

    setUploading(true);
    try {
      const branchId = userData?.branchId || userData?.branchName || 'unknown_branch';
      const branchName = userData?.branchName || 'Unknown';
      const todayStr = getTodayStr();
      const uploadedUrls = [];

      for (const photo of selectedPhotos) {
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() { resolve(xhr.response); };
          xhr.onerror = function(e) { console.log(e); reject(new TypeError("Network request failed")); };
          xhr.responseType = "blob";
          xhr.open("GET", photo.uri, true);
          xhr.send(null);
        });
        
        const ext = photo.uri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const storageRef = ref(storage, `cleaning_photos/${branchId}/${todayStr}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }

      await addDoc(collection(db, 'cleaning_logs'), {
        branchName: branchName,
        branchId: branchId,
        uploadedBy: userData?.uid || 'unknown',
        uploadedByName: userData?.name || 'Unknown Staff',
        date: todayStr,
        photoUrls: uploadedUrls,
        timestamp: serverTimestamp()
      });

      // Notification to HR
      await addDoc(collection(db, 'notifications'), {
        targetRole: 'hr',
        title: 'Cleaning Photos Uploaded',
        message: `${branchName} uploaded their required clinic cleaning photos.`,
        type: 'clinic_cleaning',
        read: false,
        timestamp: serverTimestamp()
      });

      // The useCleaningLock hook will automatically detect the new cleaning_logs entry and unlock the app.
      
    } catch (err) {
      console.error(err);
      Alert.alert("Upload Failed", "Could not upload photos. Please try again.");
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBackground} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningHeader}>
          <View style={styles.iconCircle}>
            <AlertCircle size={56} color={COLORS.error} />
          </View>
          <Text style={styles.title}>ACCESS BLOCKED</Text>
          <Text style={styles.subtitle}>
            Your branch missed the mandatory Clinic Cleaning Photo upload. The app is completely locked until photographic proof is provided.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Upload Evidence Now</Text>
            <Text style={styles.sectionSub}>Required to unlock application</Text>
          </View>
          
          <View style={styles.photoGrid}>
            {selectedPhotos.map((photo, idx) => (
              <View key={idx} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(idx)}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickImage(false)}>
              <ImageIcon size={24} color={COLORS.primary} />
              <Text style={styles.addPhotoText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickImage(true)}>
              <Camera size={24} color={COLORS.primary} />
              <Text style={styles.addPhotoText}>Camera</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, (uploading || selectedPhotos.length === 0) && { opacity: 0.6 }]} 
            onPress={handleUpload} 
            disabled={uploading || selectedPhotos.length === 0}
          >
            {uploading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Upload size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit to Unlock App</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  topBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: '#450a0a', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  scrollContent: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  warningHeader: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(239, 68, 68, 0.3)' },
  title: { fontSize: 28, fontWeight: '900', color: '#f87171', marginBottom: 12, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  cardHeader: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, justifyContent: 'center' },
  photoContainer: { width: 85, height: 85, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  photoPreview: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  addPhotoBtn: { width: 85, height: 85, borderRadius: 16, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  addPhotoText: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 6 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 16, gap: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }
});

export default CleaningLockScreen;
