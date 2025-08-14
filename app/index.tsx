import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ENDPOINTS } from '../constants/api';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export default function Index() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: 'You are a helpful mobile assistant.' },
  ]);
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  useEffect(() => { listRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  const putAssistant = (text: string) => {
    setMessages(curr => {
      const copy = [...curr];
      const last = copy.length - 1;
      if (copy[last]?.role === 'assistant') copy[last] = { role: 'assistant', content: text };
      return copy;
    });
  };

  const send = async () => {
    const content = input.trim();
    if (!content) return;
    const userMsg: Msg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const resp = await fetch(ENDPOINTS.chatStream, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      const canStream =
        resp.ok && resp.body &&
        typeof (resp.body as any).getReader === 'function' &&
        (resp.headers.get('content-type') || '').includes('text/event-stream');

      if (!canStream) {
        const r2 = await fetch(ENDPOINTS.chatJson, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...messages, userMsg] }),
        });
        if (!r2.ok) throw new Error(`HTTP ${r2.status} ${r2.statusText}`);
        const data = await r2.json();
        if (!data.ok) throw new Error(data.error || 'Server error');
        putAssistant(data.text || '');
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const payload = l.slice(5).trim();
          if (payload === '[DONE]') { setStreaming(false); return; }
          if (payload.startsWith('[ERROR]')) { setStreaming(false); alert(payload); return; }
          acc += payload;
          putAssistant(acc);
        }
      }
      setStreaming(false);
    } catch (e: any) {
      setStreaming(false);
      alert(`Request failed: ${e?.message ?? e}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.assistant]}>
              <Text style={styles.role}>{item.role}:</Text>
              <Text>{item.content}</Text>
            </View>
          )}
          keyboardShouldPersistTaps="handled"
        />
        <View style={styles.composer}>
          <TextInput value={input} onChangeText={setInput} placeholder="Ask something…" style={styles.input} multiline />
          <Button title={streaming ? 'Sending…' : 'Send'} onPress={send} disabled={streaming} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 12 },
  bubble: { marginBottom: 10, padding: 12, borderRadius: 12, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#e6f0ff' },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#f7f7f7' },
  role: { fontWeight: '600', marginBottom: 4 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', padding: 8, gap: 8 },
  input: { minHeight: 40, maxHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 },
});
