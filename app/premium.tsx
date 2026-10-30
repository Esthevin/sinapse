import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { PLAN_TABLE } from '@/content/plan';
import { PREMIUM_CONTACT } from '@/services/supabase';
import { useAccount } from '@/state/AccountContext';
import { useThemed, type Theme } from '@/theme/theme';
import { formatDate } from '@/utils/date';

export default function PremiumScreen() {
  const { configured, profile, plan, requestPending, requestPremium, busy, refresh } = useAccount();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  // Al abrir la pantalla se consulta el servidor: si el equipo ya activó el plan, se ve de inmediato.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const ask = async () => {
    const r = await requestPremium(message);
    setFeedback(r.message ?? '');
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Premium' }} />
      <Text style={styles.title}>{plan === 'premium' ? 'Eres Premium' : 'Sinapse Premium'}</Text>
      <Text style={styles.lead}>
        {plan === 'premium'
          ? profile?.premium_until
            ? `Tu plan está activo hasta el ${formatDate(profile.premium_until)}.`
            : 'Tu plan está activo, sin fecha de vencimiento.'
          : 'Historias exclusivas, descargas para escuchar sin internet y PDF sin límite.'}
      </Text>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.headRow}>
          <Text style={[styles.cell, { flex: 1.1 }]} />
          <Text style={[styles.cell, styles.head]}>Normal</Text>
          <Text style={[styles.cell, styles.head, { color: colors.accent }]}>Premium</Text>
        </View>
        {PLAN_TABLE.map((row) => (
          <View key={row.feature} style={styles.row}>
            <Text style={[styles.cell, { flex: 1.1, fontWeight: '800' }]}>{row.feature}</Text>
            <Text style={styles.cell}>{row.normal}</Text>
            <Text style={styles.cell}>{row.premium}</Text>
          </View>
        ))}
      </Card>

      {plan !== 'premium' && !configured && (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.body}>Las cuentas todavía no están activadas en esta versión de la app. Cuando el equipo conecte el servidor podrás pedir Premium desde aquí.</Text>
        </Card>
      )}

      {plan !== 'premium' && configured && !profile && (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.body}>Para pedir Premium primero crea una cuenta o ingresa.</Text>
          <Button label="Ingresar o crear cuenta" onPress={() => router.push('/cuenta')} style={{ marginTop: spacing.md }} />
        </Card>
      )}

      {plan !== 'premium' && configured && profile && (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.heading}>{requestPending ? 'Solicitud enviada' : 'Pedir Premium'}</Text>
          {PREMIUM_CONTACT ? <Text style={styles.body}>{PREMIUM_CONTACT}</Text> : null}
          {requestPending ? (
            <Text style={[styles.body, { marginTop: spacing.sm }]}>El equipo revisará tu solicitud y activará el plan en tu cuenta ({profile.email}). Vuelve a esta pantalla para ver el cambio.</Text>
          ) : (
            <>
              <Text style={[styles.body, { marginTop: spacing.sm }]}>Cuéntanos cómo pagaste o a qué colegio o grupo perteneces (opcional).</Text>
              <TextInput value={message} onChangeText={setMessage} multiline maxLength={400} style={styles.input} placeholder="Ej.: Pagué por Yape el 12 de noviembre" placeholderTextColor={colors.textMuted} accessibilityLabel="Mensaje para el equipo" />
              <Button label={busy ? 'Enviando…' : 'Solicitar Premium'} disabled={busy} onPress={ask} style={{ marginTop: spacing.md }} />
            </>
          )}
          {feedback ? <Text style={[styles.body, { marginTop: spacing.sm, fontWeight: '800' }]}>{feedback}</Text> : null}
        </Card>
      )}

      {plan === 'premium' && <Button label="Mis descargas" variant="secondary" onPress={() => router.push('/cuenta')} style={{ marginTop: spacing.lg }} />}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, font, fs, radius, stroke }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
    title: { fontFamily: font.heading, fontWeight: '900', fontSize: fs(fontSize.title + 6), lineHeight: fs(fontSize.title + 14), color: colors.text, marginTop: spacing.md },
    lead: { color: colors.textMuted, marginTop: spacing.sm, fontSize: fs(fontSize.body), lineHeight: fs(24) },
    heading: { fontFamily: font.heading, fontWeight: '800', fontSize: fs(fontSize.subtitle), color: colors.text },
    body: { color: colors.text, fontSize: fs(fontSize.body - 1), lineHeight: fs(22), marginTop: spacing.xs },
    headRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    cell: { flex: 1, color: colors.text, fontSize: fs(13), lineHeight: fs(18) },
    head: { fontWeight: '900', fontSize: fs(14) },
    input: { marginTop: spacing.sm, minHeight: 72, textAlignVertical: 'top', color: colors.text, fontFamily: font.body, fontSize: fs(fontSize.body), padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: stroke, borderColor: colors.border },
  });
