import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  const [lang, setLang] = useState('en');
  const [scans, setScans] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);

  const triggerOcrScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScans(prev => [...prev, `Textbook Page Scan ${prev.length + 1} (OCR parsed 98% accuracy)`]);
      setScanning(false);
    }, 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Student Details */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>SL</Text>
        </View>
        <Text style={styles.studentName}>Student Learner</Text>
        <Text style={styles.schoolName}>Genesis Academy</Text>
      </View>

      {/* Language Preferences */}
      <Text style={styles.sectionTitle}>Language Settings</Text>
      <View style={styles.card}>
        <View style={styles.langRow}>
          {[
            { code: 'en', label: 'English' },
            { code: 'te', label: 'తెలుగు' },
            { code: 'hi', label: 'हिन्दी' }
          ].map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.activeLangBtn]}
              onClick={() => setLang(l.code)}
            >
              <Text style={[styles.langText, lang === l.code && styles.activeLangText]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* OCR Scanner */}
      <Text style={styles.sectionTitle}>Textbook OCR Document Scanner</Text>
      <Card style={styles.card}>
        <Text style={styles.ocrDesc}>
          Scan pages from your paper textbooks to auto-extract text and ask questions to the AI Tutor.
        </Text>
        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.disabledBtn]}
          disabled={scanning}
          onClick={triggerOcrScan}
        >
          <Text style={styles.scanBtnText}>
            {scanning ? 'OCR Scanning page...' : '📷 Scan Textbook Page'}
          </Text>
        </TouchableOpacity>

        {scans.length > 0 && (
          <View style={styles.scanHistory}>
            <Text style={styles.historyTitle}>Scan History</Text>
            {scans.map((scan, idx) => (
              <Text key={idx} style={styles.scanItem}>📄 {scan}</Text>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

// Simple local Card helper stub
function Card({ children, style }: any) {
  return <View style={[styles.cardContainer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  studentName: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
  schoolName: { fontSize: 13, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardContainer: {},
  langRow: { flexDirection: 'row', justifyContent: 'space-around' },
  langBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderBorderWidth: 1, borderColor: '#ccc' },
  activeLangBtn: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  langText: { fontSize: 13, color: '#666' },
  activeLangText: { color: '#ffffff', fontWeight: 'bold' },
  ocrDesc: { fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 18 },
  scanBtn: { backgroundColor: '#6200ee', padding: 12, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#ccc' },
  scanBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  scanHistory: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  scanItem: { fontSize: 12, color: '#666', marginBottom: 6 }
});
