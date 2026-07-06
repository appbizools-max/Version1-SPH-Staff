import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager
} from 'react-native';
import * as LucideIcons from 'lucide-react-native';

const User = LucideIcons.User;
const X = LucideIcons.X;
const CheckCircle2 = LucideIcons.CheckCircle2 || LucideIcons.CheckCircle || LucideIcons.Check;
const ChevronDown = LucideIcons.ChevronDown;
const Trash2 = LucideIcons.Trash2;
const Lock = LucideIcons.Lock;
const ShieldCheck = LucideIcons.ShieldCheck || LucideIcons.Check;
import { Menu as PaperMenu, TextInput as RNTextInput, Button } from 'react-native-paper';
import { checkIsInDuration } from '../screens/reception/Rejoin/index';

// Using consistent colors based on the design
const COLORS = {
  primary: '#2563eb', // Clean blue from the screenshot
  primaryLight: '#eff6ff',
  primaryBorder: '#bfdbfe',
  text: '#1e293b',
  muted: '#64748b',
  success: '#10b981',
  successLight: '#f0fdf4',
  successBorder: '#bbf7d0',
  danger: '#ef4444',
  border: '#e2e8f0',
  background: '#f8fafc',
  white: '#ffffff',
};
const AppointmentPaymentModal = ({
  visible,
  onDismiss,
  onViewDetails,
  selectedPatientForPayment,
  stopPolling,
  unlockRequest,
  requestingUnlock,
  handleRequestUnlock,
  includeConsultation,
  setIncludeConsultation,
  includeMedicine,
  setIncludeMedicine,
  includeDiet,
  setIncludeDiet,
  consultationFee,
  setConsultationFee,
  medicineFee,
  setMedicineFee,
  dietFee,
  setDietFee,
  medicines,
  handleMedicineChange,
  handleAddMedicineRow,
  handleRemoveMedicineRow,
  prescriptionDuration,
  setPrescriptionDuration,
  payLaterAmount,
  setPayLaterAmount,
  paymentLegs,
  setPaymentLegs,
  loadingQr,
  razorpayQrCode,
  generateRazorpayQR,
  processingRzp,
  handleSendFeeToPatient,
  handleQuickPayment
}) => {
  const [openDurationMenuIndex, setOpenDurationMenuIndex] = useState(null);
  const [openTypeMenuIndex, setOpenTypeMenuIndex] = useState(null);
  const [openTimingMenuIndex, setOpenTimingMenuIndex] = useState(null);
  const [openPaymentMenuIndex, setOpenPaymentMenuIndex] = useState(null);
  const isPaid = selectedPatientForPayment?.paymentStatus === 'paid';
  const isUnlocked = unlockRequest?.status === 'approved';
  const showBlockMessage = isPaid && !isUnlocked;
  const hasDietPlan = !!selectedPatientForPayment?.dietPlanAdded || !!selectedPatientForPayment?.dietPlan;
  const inDuration = checkIsInDuration(selectedPatientForPayment?.medicationDurationEnd);

  // Auto-set consultation fee to 0 when patient is In Duration
  useEffect(() => {
    if (visible && inDuration && Number(consultationFee) > 0) {
      setConsultationFee('0');
    }
  }, [visible, inDuration]);
  // Calculate total fee internally
  const feeAmount = (
    Number(consultationFee || 0) +
    Number(medicineFee || 0) +
    Number(dietFee || 0) +
    medicines.reduce((sum, med) => sum + Number(med.price || 0), 0) -
    Number(payLaterAmount || 0)
  ).toFixed(2);
  
  React.useEffect(() => {
    if (visible) {
      setPaymentLegs(prev => {
        if (prev.length === 1 && String(prev[0].amount) !== String(feeAmount)) {
          return [{ ...prev[0], amount: String(feeAmount) }];
        }
        return prev;
      });
    }
  }, [feeAmount, visible, setPaymentLegs]);

  // Helper component for radio style checkmarks
  const RadioCheck = ({ selected }) => (
    <View style={{
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: selected ? 0 : 2,
      borderColor: '#cbd5e1',
      backgroundColor: selected ? COLORS.primary : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12
    }}>
      {selected && <CheckCircle2 size={20} color="#fff" />}
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header Container */}
        <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 16, backgroundColor: COLORS.white }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>Appointment Payment</Text>
              <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>Review and complete payment</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={{ padding: 4, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
              <X size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
          {/* Patient Card */}
          <View style={{ backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryBorder, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <User size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 }} numberOfLines={1}>
                {selectedPatientForPayment?.fullName || selectedPatientForPayment?.patientName || 'Unknown Patient'}
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 11 }}>{selectedPatientForPayment?.phone || 'No phone provided'}</Text>
            </View>
            <TouchableOpacity onPress={onViewDetails} style={{ borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: COLORS.white }}>
              <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '600' }}>View Details &gt;</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Select Payment Type</Text>

          {/* In Duration Banner */}
          {inDuration && (
            <View style={{ backgroundColor: '#ccfbf1', borderColor: '#5eead4', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: '#0d9488', borderRadius: 20, padding: 6 }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>⏱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0d9488' }}>Patient is In Duration</Text>
                <Text style={{ fontSize: 10, color: '#0f766e', marginTop: 2 }}>
                  Active medicine course until {new Date(selectedPatientForPayment?.medicationDurationEnd).toLocaleDateString('en-GB')}. Consultation fee auto-set to ₹0.
                </Text>
              </View>
            </View>
          )}

          {/* Consultation Fee */}
          <View style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: COLORS.white,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: includeConsultation ? COLORS.primary : COLORS.border,
            }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                disabled={showBlockMessage || (selectedPatientForPayment?.consultationFee > 0)}
                onPress={() => {
                  stopPolling();
                  const nextVal = !includeConsultation;
                  setIncludeConsultation(nextVal);
                  if (!nextVal) {
                    setConsultationFee(0);
                  } else {
                    setConsultationFee(selectedPatientForPayment ? (Number(selectedPatientForPayment.consultationFee) || 300) : 300);
                  }
                }}
              >
                <RadioCheck selected={includeConsultation} />
                <View>
                  <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600' }}>Consultation Fee</Text>
                  <Text style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>Doctor Requested Consultation Fee</Text>
                </View>
              </TouchableOpacity>
              {includeConsultation ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, marginRight: 4 }}>₹</Text>
                  <TextInput
                    editable={!showBlockMessage && !(selectedPatientForPayment?.consultationFee > 0)}
                    style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, minWidth: 40, textAlign: 'right' }}
                    keyboardType="numeric"
                    value={consultationFee !== '' ? String(consultationFee) : ''}
                    onChangeText={(text) => { stopPolling(); setConsultationFee(text === '' ? '' : Number(text)); }}
                  />
                </View>
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>₹{consultationFee || 0}</Text>
              )}
            </View>
          </View>

          {/* Medicine Fee */}
          <View style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: COLORS.white,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: includeMedicine ? COLORS.primary : COLORS.border,
            }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                disabled={showBlockMessage || (selectedPatientForPayment?.medicineFeeRequested > 0)}
                onPress={() => {
                  stopPolling();
                  const nextVal = !includeMedicine;
                  setIncludeMedicine(nextVal);
                  if (!nextVal) {
                    setMedicineFee(0);
                  } else {
                    setMedicineFee(selectedPatientForPayment ? (Number(selectedPatientForPayment.medicineFeeRequested) || 0) : 0);
                  }
                }}
              >
                <RadioCheck selected={includeMedicine} />
                <View>
                  <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600' }}>Medicine Fee</Text>
                  <Text style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>Doctor Requested Medicine Fee</Text>
                </View>
              </TouchableOpacity>
              {includeMedicine ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, marginRight: 4 }}>₹</Text>
                  <TextInput
                    editable={!showBlockMessage && !(selectedPatientForPayment?.medicineFeeRequested > 0)}
                    style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, minWidth: 40, textAlign: 'right' }}
                    keyboardType="numeric"
                    value={String(medicineFee)}
                    onChangeText={(text) => { stopPolling(); setMedicineFee(Number(text) || 0); }}
                  />
                </View>
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>₹{medicineFee || 0}</Text>
              )}
            </View>
          </View>

          {/* Diet Plan Fee */}
          <View style={{ marginBottom: 24, opacity: hasDietPlan ? 1 : 0.5 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: COLORS.white,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: includeDiet ? COLORS.primary : COLORS.border,
            }}>
              <TouchableOpacity
                disabled={!hasDietPlan}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => {
                  if (showBlockMessage) return;
                  stopPolling();
                  setIncludeDiet(!includeDiet);
                }}
              >
                <RadioCheck selected={includeDiet} />
                <View>
                  <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600' }}>Diet Plan Fee</Text>
                  <Text style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>Diet Plan Fee</Text>
                </View>
              </TouchableOpacity>
              {includeDiet ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, marginRight: 4 }}>₹</Text>
                  <TextInput
                    editable={!showBlockMessage && hasDietPlan}
                    style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, minWidth: 40, textAlign: 'right' }}
                    keyboardType="numeric"
                    value={String(dietFee)}
                    onChangeText={(text) => { stopPolling(); setDietFee(Number(text) || 0); }}
                  />
                </View>
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>₹{dietFee || 0}</Text>
              )}
            </View>

            {!hasDietPlan && (
              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-start' }}>
                <TouchableOpacity style={{ backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: '600' }}>Request HR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Medicines Details */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginRight: 8 }}>Medicines Details</Text>
              <Text style={{ fontSize: 11, color: COLORS.muted }}>(Optional)</Text>
            </View>

            <Text style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>Duration for all medicines</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ width: '100%', height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: COLORS.white, borderRadius: 8 }}
                onPress={() => {
                  if (showBlockMessage) return;
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setOpenDurationMenuIndex(openDurationMenuIndex === 'global' ? null : 'global');
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>📅</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text }}>{prescriptionDuration || 'Select Duration'}</Text>
                </View>
                <ChevronDown size={14} color={COLORS.muted} style={{ transform: [{ rotate: openDurationMenuIndex === 'global' ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>

              {openDurationMenuIndex === 'global' && (
                <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.white, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  {["15 Days", "1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months", "1 Year"].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.background }}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setPrescriptionDuration(opt);
                        setOpenDurationMenuIndex(null);
                      }}
                    >
                      <Text style={{ fontSize: 13, color: COLORS.text }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {medicines.map((med, index) => (
              <View key={index} style={{ marginBottom: 12, padding: 12, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600' }}>Medicine {index + 1}</Text>
                  {!showBlockMessage && (
                    <TouchableOpacity onPress={() => handleRemoveMedicineRow(index)}>
                      <Trash2 size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>Name</Text>
                    <TextInput placeholder="Medicine Name" value={med.name} onChangeText={(val) => handleMedicineChange(index, 'name', val)} style={{ backgroundColor: COLORS.white, height: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12 }} editable={!showBlockMessage} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>Price (₹)</Text>
                    <TextInput placeholder="0" value={med.price || ''} onChangeText={(val) => handleMedicineChange(index, 'price', val)} keyboardType="numeric" style={{ backgroundColor: COLORS.white, height: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12 }} editable={!showBlockMessage} />
                  </View>
                </View>
              </View>
            ))}

            {!showBlockMessage && (
              <View style={{ alignItems: 'flex-start' }}>
                <TouchableOpacity onPress={handleAddMedicineRow} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryBorder }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>+ Add Row</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Pay Later */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: COLORS.muted }}>Pay Later Amount (Optional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, marginRight: 4 }}>₹</Text>
              <TextInput
                editable={!showBlockMessage}
                style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 30, textAlign: 'right' }}
                keyboardType="numeric"
                value={String(payLaterAmount)}
                onChangeText={(text) => { stopPolling(); setPayLaterAmount(Number(text) || 0); }}
              />
            </View>
          </View>

          {/* Total Checkout */}
          <View style={{ backgroundColor: COLORS.successLight, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>Total Checkout</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.success }}>₹{feeAmount}</Text>
          </View>

          {/* HR Restrictions Display */}
          {showBlockMessage && (
            <View style={{ marginBottom: 24, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                ⚠️ Checkout Restricted: Payment already completed for this visit.
              </Text>
              {unlockRequest?.status === 'pending' ? (
                <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                  ⏳ Request pending HR approval...
                </Text>
              ) : (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  {unlockRequest?.status === 'rejected' && (
                    <Text style={{ fontSize: 11, color: '#ef4444', fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}>
                      Previous unlock request was rejected by HR.
                    </Text>
                  )}
                  <TouchableOpacity
                    disabled={requestingUnlock}
                    onPress={handleRequestUnlock}
                    style={{ backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, opacity: requestingUnlock ? 0.7 : 1 }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: '600' }}>🔑 Request HR Unlock Approval</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {isPaid && isUnlocked && (
            <View style={{ marginBottom: 24, padding: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 8 }}>
              <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                ✓ HR Approved: Additional checkout unlocked.
              </Text>
            </View>
          )}

          {/* Payment Methods */}
          {!showBlockMessage && (
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Payment Methods</Text>

              {paymentLegs.map((leg, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white }}>
                    <TouchableOpacity
                      onPress={() => {
                        stopPolling();
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setOpenPaymentMenuIndex(openPaymentMenuIndex === index ? null : index);
                      }}
                      style={{ height: 50, justifyContent: 'space-between', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                        <View style={{ width: 28, height: 28, backgroundColor: COLORS.primaryLight, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                          <User size={16} color={COLORS.primary} />
                        </View>
                        <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '500', flexShrink: 1 }} numberOfLines={1}>
                          {leg.method === 'cash' ? 'Cash' :
                            leg.method === 'card' ? 'Card' :
                              leg.method === 'upi' ? 'Counter UPI' :
                                leg.method === 'app' ? 'Send to Patient App' : leg.method}
                        </Text>
                      </View>
                      <ChevronDown size={14} color={COLORS.muted} style={{ transform: [{ rotate: openPaymentMenuIndex === index ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>

                    {openPaymentMenuIndex === index && (
                      <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border }}>
                        {[{ label: 'Cash', value: 'cash' }, { label: 'Card', value: 'card' }, { label: 'Counter UPI', value: 'upi' }, { label: 'Send to Patient App', value: 'app' }].map(opt => {
                          const isDisabled = paymentLegs.some((l, i) => i !== index && l.method === opt.value);
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              disabled={isDisabled}
                              style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.background, backgroundColor: isDisabled ? COLORS.background : COLORS.white }}
                              onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                const newLegs = [...paymentLegs];
                                newLegs[index].method = opt.value;
                                setPaymentLegs(newLegs);
                                setOpenPaymentMenuIndex(null);
                              }}
                            >
                              <Text style={{ fontSize: 13, color: isDisabled ? COLORS.muted : COLORS.text }}>{opt.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 0.6, minWidth: 90 }}>
                    <View style={{ height: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8, backgroundColor: COLORS.white, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, color: COLORS.muted }}>Amount</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: '600' }}>₹</Text>
                        <TextInput
                          style={{ fontSize: 13, color: COLORS.success, fontWeight: '600', flex: 1, padding: 0 }}
                          keyboardType="numeric"
                          placeholder="0"
                          value={leg.amount}
                          onChangeText={(text) => {
                            const newLegs = [...paymentLegs];
                            newLegs[index].amount = text;
                            if (index === 0 && newLegs.length === 2) {
                              const remaining = Number(feeAmount) - Number(text);
                              if (remaining >= 0) newLegs[1].amount = String(remaining);
                            }
                            setPaymentLegs(newLegs);
                          }}
                        />
                      </View>
                    </View>
                  </View>
                  {index > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        const newLegs = [...paymentLegs];
                        newLegs.splice(index, 1);
                        setPaymentLegs(newLegs);
                      }}
                      style={{ padding: 8 }}
                    >
                      <Trash2 size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {paymentLegs.length < 4 && (
                <TouchableOpacity
                  onPress={() => {
                    const totalLegs = paymentLegs.reduce((sum, leg) => sum + Number(leg.amount || 0), 0);
                    const remaining = Number(feeAmount) - totalLegs;
                    setPaymentLegs([...paymentLegs, { method: 'upi', amount: remaining > 0 ? String(remaining) : '' }]);
                  }}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>+ Add Payment Method</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* UPI QR Display */}
          {paymentLegs.length === 1 && paymentLegs[0].method === 'upi' && !showBlockMessage && (
            <View style={{ alignItems: 'center', padding: 16, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 12 }}>Scan to Pay ₹{feeAmount}</Text>
              <View style={{ width: 160, height: 160, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                {loadingQr ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : razorpayQrCode?.image_url ? (
                  <Image source={{ uri: razorpayQrCode.image_url }} style={{ width: 140, height: 140 }} />
                ) : (
                  <TouchableOpacity onPress={generateRazorpayQR} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 8 }}>
                    <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '600' }}>Generate QR</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!!razorpayQrCode && (
                <Text style={{ fontSize: 12, color: COLORS.primary, marginTop: 12, fontWeight: '500' }}>Waiting for confirmation...</Text>
              )}
            </View>
          )}

          {/* Submit Button */}
          {!showBlockMessage && (
            <View style={{ marginTop: 8, marginBottom: 40 }}>
              <TouchableOpacity
                onPress={async () => {
                  const totalLegs = paymentLegs.reduce((sum, leg) => sum + Number(leg.amount || 0), 0);
                  if (Math.round(totalLegs * 100) !== Math.round(Number(feeAmount) * 100)) {
                    Alert.alert('Error', `Total split amounts (₹${totalLegs}) must equal the total fee (₹${feeAmount})`);
                    return;
                  }

                  const appLeg = paymentLegs.find(l => l.method === 'app');
                  const counterLegs = paymentLegs.filter(l => l.method !== 'app');

                  if (appLeg) {
                    if (counterLegs.length === 0) {
                      await handleSendFeeToPatient();
                    } else {
                      const counterAmt = counterLegs.reduce((s, l) => s + Number(l.amount), 0);
                      const appAmt = Number(appLeg.amount);
                      await handleSendFeeToPatient({ counterAmount: counterAmt, upiAmount: appAmt, counterMethod: counterLegs[0].method });
                    }
                  } else {
                    if (paymentLegs.length > 1) {
                      await handleQuickPayment(null, false, paymentLegs);
                    } else {
                      await handleQuickPayment(null, paymentLegs[0].method === 'upi', paymentLegs);
                    }
                  }
                }}
                disabled={processingRzp}
                style={{ backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', opacity: processingRzp ? 0.7 : 1 }}
              >
                {processingRzp ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Lock size={16} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>
                      {paymentLegs.some(l => l.method === 'app') ? 'Send Payment Request to App' : 'Mark as Paid'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {paymentLegs.some(l => l.method === 'app') && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                  <ShieldCheck size={14} color={COLORS.muted} style={{ marginRight: 6 }} />
                  <Text style={{ color: COLORS.muted, fontSize: 10, textAlign: 'center' }}>
                    Payment request will be sent to patient's app for secure payment
                  </Text>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AppointmentPaymentModal;
