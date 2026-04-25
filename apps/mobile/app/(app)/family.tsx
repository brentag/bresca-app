import { StyleSheet, Text, View } from 'react-native';

export default function FamilyScreen() {
  return (
    <View style={s.container}>
      <Text style={s.text}>Familia — próximamente</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' },
  text: { fontSize: 16, color: '#64748B' },
});
