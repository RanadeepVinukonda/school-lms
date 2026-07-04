import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl, Alert } from 'react-native';
import { permissions } from '@genesis-lms/shared';

export default function AITutorScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }, []);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your AI Tutor. What subject are we studying today? 🤖' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg = { sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulated reply
    setTimeout(() => {
      const aiMsg = { sender: 'ai', text: `That's great! Let's explore your questions about "${inputText}" step by step.` };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const toggleVoiceListen = async () => {
    if (!isListening) {
      const granted = await permissions.requestMicrophone();
      if (!granted) {
        Alert.alert('Microphone Required', 'Microphone access is needed for voice input.');
        return;
      }
    }
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setInputText('Can you explain quantum computing simply?');
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.chatArea} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
        {messages.map((m, idx) => (
          <View key={idx} style={[
            styles.bubble,
            m.sender === 'user' ? styles.userBubble : styles.aiBubble
          ]}>
            <Text style={[
              styles.msgText,
              m.sender === 'user' ? styles.userText : styles.aiText
            ]}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Inputs */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.voiceBtn, isListening && styles.listeningBtn]}
          onPress={toggleVoiceListen}
        >
          <Text style={styles.voiceIcon}>{isListening ? '🛑' : '🎙️'}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={isListening ? 'Listening voice input...' : 'Ask your AI Tutor...'}
          value={inputText}
          onChangeText={setInputText}
          editable={!isListening}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!inputText.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  chatArea: { padding: 16 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#6200ee', borderBottomRightRadius: 2 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderBottomLeftRadius: 2 },
  msgText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#ffffff' },
  aiText: { color: '#333333' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  voiceBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f0fe', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  listeningBtn: { backgroundColor: '#ff1744' },
  voiceIcon: { fontSize: 20 },
  input: { flex: 1, height: 44, backgroundColor: '#f5f5f5', borderRadius: 22, paddingHorizontal: 16, fontSize: 14 },
  sendBtn: { marginLeft: 12, paddingVertical: 8, paddingHorizontal: 16 },
  sendText: { color: '#6200ee', fontWeight: 'bold', fontSize: 14 }
});
