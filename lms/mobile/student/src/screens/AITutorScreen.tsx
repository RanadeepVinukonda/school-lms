import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export default function AITutorScreen() {
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

  const toggleVoiceListen = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setInputText('Can you explain quantum computing simply?');
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.chatArea}>
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
          onClick={toggleVoiceListen}
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

        <TouchableOpacity style={styles.sendBtn} onClick={handleSend} disabled={!inputText.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  chatArea: { padding: 16 },
  bubble: { maxWwidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
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
