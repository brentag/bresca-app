import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; content: string };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const SUGGESTIONS = [
  '¿Qué significa el VCM en el hemograma?',
  '¿Cuándo debería repetir mi perfil lipídico?',
  '¿Qué es la creatinina y para qué sirve?',
  'Explicame la diferencia entre TSH y T4',
];

export default function CopilotScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function send(text = input.trim()) {
    if (!text || loading || rateLimited) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${API_URL}/copilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-10, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        setMessages((prev) => [
          ...prev,
          { id: 'rl', role: 'assistant', content: 'Alcanzaste el límite de 20 consultas por hora. Podés volver a preguntar en un rato.' },
        ]);
        return;
      }

      if (!res.ok) throw new Error('API error');

      const { reply } = await res.json();
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: 'err', role: 'assistant', content: 'No pude conectarme al servidor. Revisá tu conexión e intentá de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Text style={s.headerIconText}>🤖</Text>
        </View>
        <View>
          <Text style={s.headerTitle}>Copilot</Text>
          <Text style={s.headerSub}>Asistente de salud personal</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <View style={s.welcome}>
            <Text style={s.welcomeTitle}>¿En qué puedo ayudarte?</Text>
            <Text style={s.welcomeSub}>Hacé preguntas sobre tus estudios o sobre salud en general.</Text>
            <View style={s.suggestions}>
              {SUGGESTIONS.map((q) => (
                <TouchableOpacity key={q} style={s.suggChip} onPress={() => send(q)}>
                  <Text style={s.suggText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => <Bubble message={item} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {loading && (
          <View style={s.typing}>
            <ActivityIndicator size="small" color="#00C87A" />
            <Text style={s.typingText}>Copilot está pensando…</Text>
          </View>
        )}

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Preguntale al Copilot…"
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!rateLimited}
            returnKeyType="send"
            onSubmitEditing={() => send()}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading || rateLimited) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading || rateLimited}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
      <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAssistant]}>
        {message.content}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8FBF3', alignItems: 'center', justifyContent: 'center' },
  headerIconText: { fontSize: 20 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#94A3B8' },
  welcome: { flex: 1, paddingHorizontal: 20, paddingTop: 32, gap: 8 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  welcomeSub: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 8 },
  suggestions: { gap: 10 },
  suggChip: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  suggText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#00C87A', borderBottomRightRadius: 4 },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#0F172A' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 13, color: '#64748B' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#0F172A', maxHeight: 100, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00C87A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
