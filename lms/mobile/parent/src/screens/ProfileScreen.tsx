import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  const [lang, setLang] = useState('en');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>P</Text>
        </View>
        <Text style={styles.parentName}>Parent User</Text>
        <Text style={styles.schoolName}>Genesis Academy</Text>
      </View>

      <Text style={styles.sectionTitle}>Language Preferences</Text>
      <View style={styles.card}>
        <View style={styles.langRow}>
          {[
            { code: 'en', label: 'English' },
            { code: 'te', label: 'తెలుగు' },
            { code: 'hi', label: 'हिन्दी' },
          ].map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.activeLangBtn]}
              onClick={() => setLang(l.code)}
            >
              <Text style={[styles.langText, lang === l.code && styles.activeLangText]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Application Information</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoVal}>1.0.0 (Expo SDK 51)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Connected Server</Text>
          <Text style={styles.infoVal}>LMS Production API</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  parentName: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
  schoolName: { fontSize: 13, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  langRow: { flexDirection: 'row', justifyContent: 'space-around' },
  langBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  activeLangBtn: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  langText: { fontSize: 13, color: '#666' },
  activeLangText: { color: '#fff', fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 13, color: '#666' },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#333' },
});
