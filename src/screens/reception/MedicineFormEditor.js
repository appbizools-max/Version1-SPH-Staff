import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
  TextInput as RNTextInput, Platform, Linking, Modal, FlatList, KeyboardAvoidingView
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';
import {
  doc, updateDoc, addDoc, collection, serverTimestamp, setDoc, query, where, getDocs, limit
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Send, Download, Plus, Trash2, FilePen, X, User } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export const APP_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAARkAAAEZCAIAAAAscsZAAAAACXBIWXMAABJ0AAASdAHeZh94AAAFXGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA1LTMxPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhGYUk0MkVhcyZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRkhvNTkwX0xVJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O0plZXZhbiBSZWRkeSZxdW90O308L0F0dHJpYjpEYXRhPgogICAgIDxBdHRyaWI6RXh0SWQ+ZDg4ZDIxNGUtOWFlYi00YWQ0LWI2ZGQtYjVhMTE5YWVkNmUwPC9BdHRyaWI6RXh0SWQ+CiAgICAgPEF0dHJpYjpGYklkPjUyNTI2NTkxNDE3OTU4MDwvQXR0cmliOkZiSWQ+CiAgICAgPEF0dHJpYjpUb3VjaFR5cGU+MjwvQXR0cmliOlRvdWNoVHlwZT4KICAgIDwvcmRmOmxpPgogICA8L3JkZjpTZXE+CiAgPC9BdHRyaWI6QWRzPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpkYz0naHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8nPgogIDxkYzp0aXRsZT4KICAgPHJkZjpBbHQ+CiAgICA8cmRmOmxpIHhtbDpsYW5nPSd4LWRlZmF1bHQnPkxvY2FsTmVlZHMgJmFtcDtKb2JzIC0gMTA8L3JkZjpsaT4KICAgPC9yZGY6QWx0PgogIDwvZGM6dGl0bGU+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnBkZj0naHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLyc+CiAgPHBkZjpBdXRob3I+UHJlZXRoYW0gcmFtIEF2YWxhPC9wZGY6QXV0aG9yPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPgogIDx4bXA6Q3JlYXRvclRvb2w+Q2FudmEgKFJlbmRlcmVyKSBkb2M9REFIRmFJNDJFYXMgdXNlcj1VQUZIbzU5MF9MVSBicmFuZD1KZWV2YW4gUmVkZHk8L3htcDpDcmVhdG9yVG9vbD4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+CjwveDp4bXBtZXRhPgo8P3hwYWNrZXQgZW5kPSdyJz8+WkY3+QAAAE5lWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAAB4AAAAAQAAAHgAAAAByZF2EwAAI0FJREFUeJzt3Xl8FPX9P/DPzOx9Z3dzbO47IYQI4UY5FDxQOby1B62VVq3fb+vXtvpr1fqVeqDWVmtti7RaChUpXhSUinILcsmRkJBArs197ZG9d2dn5vsH/CiFQDKzn83uzr6fD/6APPjMvAN57cx85nMQHMchAEDEyFgXAIBIQJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAD8gSAHhAlgDAA7IEAB6QJQDwgCwBgAdkCQA8IEsA4AFZAgAPyBIAeECWAMADsgQAHpAlAPCALAGAB2QJADwgSwDgAVkCAA/IEgB4QJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAD8gSAHhAlgDAA7IEAB6QJQDwgCwBgAdkCQA8IEsA4AFZAgAPyBIAeECWAMADsgQAHpAlAPCALAGAB2QJADwgSwDgAVkCAA/IEgB4QJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAj/8Dby64yJO0J5oAAAAASUVORK5CYII=';

const COLORS = {
  primary: '#a8ce3a',
  secondary: '#258ec8',
  success: '#10b981',
  warning: '#f59e0b',
  text: '#0f172a',
  muted: '#64748b',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  danger: '#ef4444',
  clinicBlue: '#298FCA',
  clinicGreen: '#ACCF37',
};

const MedicineFormEditor = ({ navigation, route }) => {
  const { request } = route.params || {};
  const { userData } = useAuth();

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Form fields — pre-filled from the request
  const [formDate, setFormDate] = useState(todayStr);
  const [patientName, setPatientName] = useState(request?.patientName || '');
  const [patientAge, setPatientAge] = useState(request?.age || '');
  const [gender, setGender] = useState(request?.gender || 'Mr.');
  const [subject, setSubject] = useState(request?.subject || request?.condition || '');
  const [duration, setDuration] = useState(request?.duration || '3');
  const [amountPaid, setAmountPaid] = useState(request?.amountPaid || '');
  const [medicines, setMedicines] = useState(
    request?.medicines?.length > 0 ? request.medicines : [{ name: '', timing: '', duration: '' }]
  );
  const [additionalNote, setAdditionalNote] = useState(request?.additionalNote || '');
  const [phone, setPhone] = useState(request?.phone || '');

  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Global server-side search across all branches
  useEffect(() => {
    if (!showPatientModal) return;
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const fetchGlobalPatients = async () => {
      setIsSearching(true);
      try {
        const queryText = debouncedSearch.trim();
        const textLower = queryText.toLowerCase();
        const textCapitalized = queryText.charAt(0).toUpperCase() + queryText.slice(1).toLowerCase();
        const textUpper = queryText.toUpperCase();

        const promises = [];
        if (/^\d+$/.test(queryText)) {
          const cleanPhone = queryText.slice(-10);
          promises.push(getDocs(query(collection(db, 'allpatients'), where('phone', '==', cleanPhone))));
          promises.push(getDocs(query(collection(db, 'patients'), where('phone', '==', cleanPhone))));
        } else {
          promises.push(getDocs(query(collection(db, 'allpatients'), where('fullName', '>=', textCapitalized), where('fullName', '<=', textCapitalized + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'patients'), where('fullName', '>=', textCapitalized), where('fullName', '<=', textCapitalized + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'allpatients'), where('fullName', '>=', textLower), where('fullName', '<=', textLower + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'patients'), where('fullName', '>=', textLower), where('fullName', '<=', textLower + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'allpatients'), where('fullName', '>=', textUpper), where('fullName', '<=', textUpper + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'patients'), where('fullName', '>=', textUpper), where('fullName', '<=', textUpper + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'allpatients'), where('registrationId', '>=', textUpper), where('registrationId', '<=', textUpper + '\\uf8ff'), limit(20))));
          promises.push(getDocs(query(collection(db, 'patients'), where('registrationId', '>=', textUpper), where('registrationId', '<=', textUpper + '\\uf8ff'), limit(20))));
        }

        const snaps = await Promise.all(promises);
        const results = [];
        snaps.forEach(snap => {
          snap.forEach(docSnap => {
            results.push({ id: docSnap.id, ...docSnap.data() });
          });
        });

        // Deduplicate
        const uniqueResults = [];
        const phones = new Set();
        
        results.forEach(r => {
          const clean = (r.phone || '').replace(/\D/g, '').slice(-10);
          if (clean && !phones.has(clean)) {
            phones.add(clean);
            uniqueResults.push(r);
          }
        });
        setSearchResults(uniqueResults);
      } catch (err) {
        console.error("Error globally searching patients for picker:", err);
      } finally {
        setIsSearching(false);
      }
    };
    fetchGlobalPatients();
  }, [debouncedSearch, showPatientModal]);

  const selectPatient = (p) => {
    setPatientName(p.fullName || '');
    setPatientAge(p.age || p.patientAge || '');
    setGender(p.gender || 'Mr.');
    setPhone(p.phone || '');
    setShowPatientModal(false);
  };

  // Medicine row handlers
  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { name: '', timing: '', duration: '' }]);
  };

  const removeMedicineRow = (index) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  // Build the complete form data object
  const buildFormData = () => ({
    requestId: request?.id,
    patientId: request?.patientId,
    patientName: patientName.trim(),
    phone: phone,
    age: patientAge.trim(),
    gender: gender,
    subject: subject.trim(),
    duration: duration.trim(),
    amountPaid: amountPaid.trim(),
    medicines: medicines.filter(m => m.name.trim()),
    additionalNote: additionalNote.trim(),
    formDate: formDate,
    doctorName: request?.doctorName || '',
    branchName: request?.branchName || userData?.branchName || '',
    branchId: request?.branchId || userData?.branchId || '',
    preparedBy: userData?.name || 'Receptionist',
    status: 'completed',
  });

  // Generate the HTML for the PDF matching the Spiritual Homeopathy letterhead
  const generateHtml = (data) => {
    const medicineRows = data.medicines
      .map(m => `
        <tr>
          <td style="padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #1a1a1a;">
            <strong>${m.name}</strong>
          </td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #444;">
            ---&nbsp;${m.timing} ${m.duration ? `(${m.duration})` : ''}
          </td>
        </tr>`)
      .join('');

    const genderTitle = data.gender || 'Mr.';
    const heShe = (genderTitle === 'Mrs.' || genderTitle === 'Ms.') ? 'SHE' : 'HE';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .page {
      width: 595px;
      min-height: 842px;
      margin: 0 auto;
      padding: 0 0 140px 0;
      border: 2px solid #298FCA;
      position: relative;
    }
    .header-bar {
      background: linear-gradient(135deg, #298FCA 0%, #1a6fa0 100%);
      padding: 18px 40px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .clinic-name {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 2px;
    }
    .clinic-tagline {
      font-size: 10px;
      color: #d0eeff;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    .green-bar {
      background-color: #ACCF37;
      height: 6px;
    }
    .doc-meta {
      padding: 14px 40px 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .doc-date { font-size: 12px; color: #333; font-weight: 700; }
    .www-text { font-size: 11px; color: #298FCA; font-weight: 700; }
    .divider { height: 1px; background: #e0e0e0; margin: 0 40px; }
    .subject-heading {
      text-align: center;
      font-size: 16px;
      font-weight: 900;
      color: #1a1a1a;
      letter-spacing: 2px;
      padding: 18px 40px 30px;
    }
    .body-text {
      padding: 0 40px;
      font-size: 13px;
      color: #222;
      line-height: 1.8;
    }
    .patient-name-inline {
      font-weight: 900;
      color: #298FCA;
    }
    .subject-inline {
      font-weight: 900;
      color: #1a1a1a;
      text-transform: uppercase;
    }
    .medicine-section {
      margin: 18px 40px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    .medicine-header {
      background: #f8fafc;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 800;
      color: #298FCA;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #e0e0e0;
    }
    .medicine-table { width: 100%; border-collapse: collapse; }
    .payment-text {
      padding: 6px 40px 0;
      font-size: 12.5px;
      color: #222;
      line-height: 1.7;
    }
    .footer-bar {
      background: linear-gradient(135deg, #298FCA 0%, #1a6fa0 100%);
      padding: 12px 40px;
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-text { font-size: 10px; color: #d0eeff; }
    .footer-phone { font-size: 11px; color: #ffffff; font-weight: 800; }
    .seal-area {
      text-align: center;
      padding: 30px 40px 0;
      font-size: 10px;
      color: #555;
    }
    .additional-note {
      padding: 4px 40px 0;
      font-size: 12px;
      color: #555;
      font-style: italic;
    }
  </style>
</head>
<body>
<div class="page">
  <!-- HEADER -->
  <div class="header-bar">
    <div>
      <div class="clinic-name">SPIRITUAL</div>
      <div class="clinic-tagline">WWW.SPIRITUALHOMEO.COM</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: center;">
      <img src="data:image/png;base64,${APP_ICON_BASE64}" style="height: 45px; width: 45px; border-radius: 8px;" />
    </div>
  </div>
  <div class="green-bar"></div>

  <!-- DATE ROW -->
  <div class="doc-meta">
    <div class="doc-date">DATE: ${data.formDate}</div>
    <div class="www-text">support@spiritualhomeo.com</div>
  </div>
  <div class="divider"></div>

  <!-- SUBJECT HEADING -->
  <div class="subject-heading">TO WHOM SO EVER IT MAY CONCERN</div>

  <!-- BODY -->
  <div class="body-text">
    <p>
      THIS IS TO CERTIFY THAT <span class="patient-name-inline">${genderTitle} ${data.patientName.toUpperCase()}</span>
      AGED ABOUT <strong>${data.age || '__'} YEARS</strong>, HAS BEEN UNDER OUR TREATMENT AT
      <strong>SPIRITUAL HOMEOPATHY</strong> FOR THE MANAGEMENT OF
      <span class="subject-inline">${data.subject || '_______________'}</span>
    </p>
    <br/>
    <p>
      ${heShe} NEEDED TO TAKE HOMEOPATHY MEDICINE FOR <strong>${data.duration} MONTHS</strong>.
      WE RECOMMENDED THAT ${genderTitle} ${data.patientName.toUpperCase()} CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.
    </p>
  </div>

  <!-- MEDICINES TABLE -->
  <div class="medicine-section">
    <div class="medicine-header">Prescribed Medicines</div>
    <table class="medicine-table">
      ${medicineRows}
    </table>
  </div>

  ${data.amountPaid ? `
  <!-- PAYMENT LINE -->
  <div class="payment-text">
    <p>
      ${genderTitle} ${data.patientName.toUpperCase()} HAS PAID
      <strong>RS.${data.amountPaid}/-</strong> FOR
      <strong>${data.duration} MONTHS</strong> CONSULTATION AND MEDICATIONS.
    </p>
  </div>` : ''}

  ${data.additionalNote ? `
  <div class="additional-note"><em>Note: ${data.additionalNote}</em></div>` : ''}

  <!-- SEAL + SIGNATURE -->
  <div class="seal-area">
    <br/><br/>
    <p style="font-size:11px; color:#555; font-style:italic; text-align:center;">This is a computer-generated document and does not require a physical signature.</p>
    <p style="margin-top:4px; font-size:9px; text-align:center;">Spiritual Homeopathy · ${data.branchName}</p>
  </div>

  <!-- FOOTER -->
  <div class="footer-bar">
    <div>
      <div class="footer-phone">☎ 9030 176 176</div>
      <div class="footer-text">support@spiritualhomeo.com</div>
    </div>
    <div style="text-align:right;">
      <div class="footer-text" style="color:#ACCF37; font-weight:800;">KPHB, Hyderabad, TS</div>
      <div class="footer-text">www.spiritualhomeo.com</div>
    </div>
  </div>
</div>
</body>
</html>`;
  };

  const handleShareMedicinePrescriptionWhatsApp = (data, cleanPhone) => {
    const genderTitle = data.gender || 'Mr.';
    const patientName = data.patientName || 'Patient';
    const duration = data.duration || '3';
    const amountPaid = data.amountPaid || '';
    const medicinesList = data.medicines
      .map((m, idx) => `${idx + 1}. *${m.name}* (${m.timing}) ${m.duration ? `[${m.duration}]` : ''}`)
      .join('\n');
    const additionalNote = data.additionalNote ? `\n*Note:* ${data.additionalNote}` : '';
    const doctorName = data.doctorName || 'Doctor';
    const branchName = data.branchName || 'Clinic';

    const message = `*SPIRITUAL HOMEOPATHY - MEDICINE PRESCRIPTION*

Dear *${genderTitle} ${patientName}*,

Your medicine prescription has been prepared.

*Prescription Details:*
• *Patient Name:* ${genderTitle} ${patientName}
• *Condition:* ${data.subject || 'General Consultation'}
• *Treatment Duration:* ${duration} Months
• *Branch:* ${branchName}
• *Date:* ${data.formDate}

*Prescribed Medicines:*
${medicinesList}
${additionalNote}
${amountPaid ? `\n*Amount Paid:* ₹${amountPaid}` : ''}

For queries, contact support at 9030 176 176 or visit www.spiritualhomeo.com`;

    const url = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`);
      }
    }).catch(err => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`);
    });
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    const data = buildFormData();
    if (!data.patientName) {
      Alert.alert('Required', 'Please enter the patient name before downloading.');
      return;
    }
    setDownloading(true);
    let html = '';
    try {
      html = generateHtml(data);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      
      // Copy to cache directory root to allow Android sharing permissions
      const cleanPatientName = data.patientName.replace(/[^a-zA-Z0-9]/g, '_');
      const shareableUri = FileSystem.cacheDirectory + `MedicineForm_${cleanPatientName}.pdf`;
      await FileSystem.copyAsync({
        from: uri,
        to: shareableUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareableUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Medicine Form – ${data.patientName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved at: ${shareableUri}`);
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      // Silently ignore user-initiated dismissals
      if (
        errMsg.toLowerCase().includes('cancel') ||
        errMsg.toLowerCase().includes('reject') ||
        errMsg.toLowerCase().includes('dismiss') ||
        errMsg.toLowerCase().includes('processing')
      ) {
        return;
      }
      // Android file permission restriction: fall back to Print/Save PDF or WhatsApp
      if (
        errMsg.toLowerCase().includes('not allowed') ||
        errMsg.toLowerCase().includes('given url') ||
        errMsg.toLowerCase().includes('file under')
      ) {
        try {
          await Print.printAsync({ html });
          return;
        } catch (printErr) {
          console.warn('[MedicineFormEditor] Print fallback failed, falling back to WhatsApp:', printErr);
        }
        const phone = data.phone || '';
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length === 10) {
          handleShareMedicinePrescriptionWhatsApp(data, cleanPhone);
        }
        return;
      }
      console.error('PDF error:', err);
      const phone = data.phone || '';
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length === 10) {
        Alert.alert(
          'Sharing Limit',
          'Your device does not support direct PDF sharing. Prefilled prescription details will be shared via WhatsApp instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open WhatsApp',
              onPress: () => handleShareMedicinePrescriptionWhatsApp(data, cleanPhone)
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Could not generate PDF. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  // Send form to patient app
  const handleSendToPatient = async () => {
    const data = buildFormData();
    if (!data.patientName.trim()) {
      Alert.alert('Required', 'Please enter the patient name.');
      return;
    }
    if (!data.subject.trim()) {
      Alert.alert('Required', 'Please enter the consultation subject / condition.');
      return;
    }
    if (data.medicines.filter(m => m.name.trim()).length === 0) {
      Alert.alert('Required', 'Please add at least one medicine.');
      return;
    }

    Alert.alert(
      'Send to Patient',
      `Send this completed medicine form to ${data.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              // 1. Save form to medicine_forms collection
              await addDoc(collection(db, 'medicine_forms'), {
                ...data,
                createdAt: serverTimestamp(),
              });

              // 2. Update the original request status to 'completed'
              if (request?.id) {
                await updateDoc(doc(db, 'medicine_requests', request.id), {
                  status: 'completed',
                  completedAt: serverTimestamp(),
                  completedBy: userData?.name || 'Receptionist',
                });
              }

              // 3. Send a notification to the patient
              if (data.patientId) {
                await addDoc(collection(db, 'notifications'), {
                  userId: data.patientId,
                  title: '📋 Medicine Form Ready',
                  body: `Your medicine form has been prepared by the reception team. Open your appointments to view and download it.`,
                  type: 'medicine_form',
                  appointmentId: request?.appointmentId || null,
                  isRead: false,
                  createdAt: serverTimestamp(),
                });
              }

              Alert.alert(
                '✅ Sent Successfully',
                `The medicine form has been sent to ${data.patientName}. They can view and download it from their app.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (err) {
              console.error('Send form error:', err);
              Alert.alert('Error', 'Failed to send the form. Please try again.');
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  // Editable field component
  const Field = ({ label, value, onChangeText, placeholder, multiline, keyboardType, half }) => (
    <View style={[styles.fieldWrap, half && { width: '48%' }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#94a3b8"
        style={[styles.fieldInput, multiline && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Medicine Form</Text>
          <Text style={styles.headerSub}>{request?.patientName || 'New Form'}</Text>
        </View>
        {/* Download PDF */}
        <TouchableOpacity
          style={[styles.actionBtnSmall, { marginRight: 8, backgroundColor: '#eff6ff' }]}
          onPress={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size={16} color="#2563eb" />
          ) : (
            <Download size={18} color="#2563eb" />
          )}
        </TouchableOpacity>
        {/* Send to Patient */}
        <TouchableOpacity
          style={[styles.actionBtnSmall, { backgroundColor: COLORS.success }]}
          onPress={handleSendToPatient}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size={16} color="#fff" />
          ) : (
            <Send size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* LETTERHEAD PREVIEW CARD */}
        <Surface style={styles.letterheadCard}>
          {/* Clinic header strip */}
          <View style={styles.clinicHeader}>
            <View>
              <Text style={styles.clinicName}>SPIRITUAL</Text>
              <Text style={styles.clinicWebsite}>www.spiritualhomeo.com</Text>
            </View>
            <Text style={styles.clinicSub}>HOMEOPATHY</Text>
          </View>
          <View style={styles.greenStripe} />

          {/* Form meta */}
          <View style={styles.formMeta}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabelSmall}>DATE</Text>
              <RNTextInput
                value={formDate}
                onChangeText={setFormDate}
                style={styles.metaInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.toWhomHeading}>
            <Text style={styles.toWhomText}>TO WHOM SO EVER IT MAY CONCERN</Text>
          </View>
        </Surface>

        {/* PATIENT DETAILS SECTION */}
        <Surface style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FilePen size={16} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Patient Details</Text>
          </View>

          {/* Patient Selection Dropdown Trigger */}
          <Text style={styles.fieldLabel}>Select Patient</Text>
          <TouchableOpacity onPress={() => setShowPatientModal(true)} style={styles.pickerTrigger}>
            <User size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
            <Text style={[styles.pickerTriggerText, !patientName && { color: COLORS.muted }]}>
              {patientName ? `${patientName} (${phone})` : 'Select Patient from list...'}
            </Text>
          </TouchableOpacity>

          <Modal visible={showPatientModal} animationType="slide" transparent={true}>
            <View style={styles.modalBackdrop}>
              <View style={styles.pickerModalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Select Patient</Text>
                  <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                    <X size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <RNTextInput
                  placeholder="Search by name, phone or reg ID..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInputModal}
                />
                {isSearching ? (
                  <ActivityIndicator size="small" color={COLORS.secondary} style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.patientListItem} onPress={() => selectPatient(item)}>
                        <Text style={styles.patientListName}>{item.fullName}</Text>
                        <Text style={styles.patientListPhone}>{item.phone}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 400, marginTop: 12 }}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                    indicatorStyle="black"
                  />
                )}
              </View>
            </View>
          </Modal>

          {/* Gender selector */}
          <Text style={styles.fieldLabel}>Title / Gender</Text>
          <View style={styles.genderRow}>
            {['Mr.', 'Mrs.', 'Ms.', 'Master'].map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.genderPill, gender === g && styles.genderPillActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowWrap}>
            <Field label="Patient Name" value={patientName} onChangeText={setPatientName}
              placeholder="Full name" half />
            <Field label="Age (Years)" value={patientAge} onChangeText={setPatientAge}
              placeholder="e.g. 24" keyboardType="numeric" half />
          </View>

          <Field
            label="Consultation Subject / Condition"
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. URTICARIA AND SINUS"
          />

          <View style={styles.rowWrap}>
            <Field label="Treatment Duration (months)" value={duration}
              onChangeText={setDuration} placeholder="e.g. 3" keyboardType="numeric" half />
            <Field label="Amount Paid (₹)" value={amountPaid}
              onChangeText={setAmountPaid} placeholder="e.g. 6000" keyboardType="numeric" half />
          </View>
        </Surface>

        {/* MEDICINES SECTION */}
        <Surface style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FilePen size={16} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Prescribed Medicines</Text>
          </View>

          {medicines.map((med, index) => (
            <View key={index} style={styles.medicineRow}>
              <View style={styles.medIndexBadge}>
                <Text style={styles.medIndexText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <RNTextInput
                  value={med.name}
                  onChangeText={val => updateMedicine(index, 'name', val)}
                  placeholder="Medicine name (e.g. NASH sulph)"
                  placeholderTextColor="#94a3b8"
                  style={styles.medNameInput}
                />
                <RNTextInput
                  value={med.timing}
                  onChangeText={val => updateMedicine(index, 'timing', val)}
                  placeholder="Timing (e.g. morning medicine / drops)"
                  placeholderTextColor="#94a3b8"
                  style={styles.medTimingInput}
                />
                <RNTextInput
                  value={med.duration}
                  onChangeText={val => updateMedicine(index, 'duration', val)}
                  placeholder="Duration (e.g. 1 Month)"
                  placeholderTextColor="#94a3b8"
                  style={styles.medTimingInput}
                />
              </View>
              <TouchableOpacity
                style={styles.removeMedBtn}
                onPress={() => removeMedicineRow(index)}
              >
                <Trash2 size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addMedBtn} onPress={addMedicineRow}>
            <Plus size={16} color={COLORS.secondary} />
            <Text style={styles.addMedText}>Add Medicine Row</Text>
          </TouchableOpacity>
        </Surface>

        {/* ADDITIONAL NOTE */}
        <Surface style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FilePen size={16} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Additional Note (Optional)</Text>
          </View>
          <RNTextInput
            value={additionalNote}
            onChangeText={setAdditionalNote}
            placeholder="Any additional instructions or note for the patient..."
            placeholderTextColor="#94a3b8"
            style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            multiline
            numberOfLines={3}
          />
        </Surface>

        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadBtn]}
            onPress={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size={18} color="#2563eb" />
            ) : (
              <Download size={18} color="#2563eb" />
            )}
            <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>Download PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.sendBtn]}
            onPress={handleSendToPatient}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size={18} color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Send to Patient</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.muted, fontWeight: '500', marginTop: 1 },
  actionBtnSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: 14 },

  // Letterhead preview card
  letterheadCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    marginBottom: 12,
  },
  clinicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.clinicBlue,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  clinicName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  clinicWebsite: {
    fontSize: 9,
    color: '#c8e8ff',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  clinicSub: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.clinicGreen,
    letterSpacing: 2,
  },
  greenStripe: { height: 5, backgroundColor: COLORS.clinicGreen },
  formMeta: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  fieldLabelSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaInput: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    paddingHorizontal: 0,
  },
  toWhomHeading: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  toWhomText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.5,
  },

  // Section cards
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  // Gender selector
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  genderPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genderPillActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  genderPillText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  genderPillTextActive: { color: '#fff' },

  rowWrap: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },

  fieldWrap: { marginBottom: 12, width: '100%' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  fieldInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Medicine rows
  medicineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  medIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.secondary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  medIndexText: { fontSize: 11, fontWeight: '800', color: COLORS.secondary },
  medNameInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  medTimingInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  removeMedBtn: {
    padding: 8,
    marginTop: 6,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  addMedText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  pickerTrigger: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 12 },
  pickerTriggerText: { fontSize: 13, color: COLORS.text, flex: 1, fontWeight: '500' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  searchInputModal: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14 },
  patientListItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  patientListName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  patientListPhone: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 2,
  },
  downloadBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sendBtn: { backgroundColor: COLORS.success },
  actionBtnText: { fontSize: 14, fontWeight: '800' },
});

export default MedicineFormEditor;
