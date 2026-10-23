import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionTitle, Text } from '@/components/ui';
import { useAccount } from '@/state/AccountContext';
import { useDownloads } from '@/state/DownloadsContext';
import { useThemed, type Theme } from '@/theme/theme';
import { confirmAction } from '@/utils/confirm';
import { formatDate } from '@/utils/date';

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

export default function AccountScreen() {
  const { configured, ready, busy, profile, plan, signIn, signUp, signOut, updateName, deleteAccount, refresh } = useAccount();
  const downloads = useDownloads();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [editName, setEditName] = useState('');
  useEffect(() => setEditName(profile?.display_name ?? ''), [profile?.display_name]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async () => {
    setMessage('');
    const r = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name);
    if (r.message) setMessage(r.message);
    if (r.ok && !r.message) setPassword('');
  };

  const remove = async () => {
    if (!(await confirmAction('¿Borrar tu cuenta? Se eliminan tus datos de la cuenta y no se puede deshacer. Las historias y tu avance en este teléfono se conservan.', 'Borrar mi cuenta', 'Cancelar'))) return;
    const r = await deleteAccount();
    setMessage(r.message ?? '');
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Mi cuenta' }} />

      {!configured && (
        <Card>
          <Text style={styles.heading}>Cuentas no activadas</Text>
          <Text style={styles.body}>Esta versión de la app todavía no está conectada al servidor de cuentas, así que funciona como plan Normal. El equipo las activa siguiendo docs/CUENTAS.md.</Text>
        </Card>
      )}

      {configured && ready && !profile && (
        <Card>
          <View style={styles.chips}>
            <Chip label="Ingresar" active={mode === 'in'} onPress={() => setMode('in')} />
            <Chip label="Crear cuenta" active={mode === 'up'} onPress={() => setMode('up')} />
          </View>
          {mode === 'up' && (
            <>
              <Text style={styles.label}>Nombre (opcional)</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} accessibilityLabel="Nombre" autoCapitalize="words" />
            </>
          )}
          <Text style={styles.label}>Correo</Text>
          <TextInput value={email} onChangeText={setEmail} style={styles.input} accessibilityLabel="Correo" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          <Text style={styles.label}>Contraseña (mínimo 6 caracteres)</Text>
          <TextInput value={password} onChangeText={setPassword} style={styles.input} accessibilityLabel="Contraseña" secureTextEntry autoCapitalize="none" onSubmitEditing={submit} />
          {mode === 'up' && (
            <Text style={styles.small}>La cuenta debe crearla una persona adulta (madre, padre, docente o tutor). Solo guardamos tu correo y tu plan; no vendemos ni compartimos datos.</Text>
          )}
          <Button label={busy ? 'Un momento…' : mode === 'in' ? 'Ingresar' : 'Crear cuenta'} disabled={busy || !email || password.length < 6} onPress={submit} style={{ marginTop: spacing.md }} />
          {message ? <Text style={[styles.body, { marginTop: spacing.sm, fontWeight: '800' }]}>{message}</Text> : null}
        </Card>
      )}

      {profile && (
        <>
          <Card>
            <Text style={styles.heading}>{profile.display_name || 'Tu cuenta'}</Text>
            <Text style={styles.body}>{profile.email}</Text>
            <View style={styles.planRow}>
              <Text style={[styles.badge, plan === 'premium' && { backgroundColor: colors.accent, color: colors.onAccent }]}>{plan === 'premium' ? 'Premium' : 'Normal'}</Text>
              {plan === 'premium' && profile.premium_until ? <Text style={styles.small}>hasta el {formatDate(profile.premium_until)}</Text> : null}
              {profile.role === 'admin' ? <Text style={styles.small}>· administrador</Text> : null}
            </View>
            <Button label={plan === 'premium' ? 'Ver mi plan' : 'Ver Premium'} variant="secondary" onPress={() => router.push('/premium')} style={{ marginTop: spacing.md }} />
            <Text style={styles.label}>Nombre</Text>
            <TextInput value={editName} onChangeText={setEditName} style={styles.input} accessibilityLabel="Nombre" autoCapitalize="words" />
            <Button label="Guardar nombre" variant="secondary" disabled={busy || editName === (profile.display_name ?? '')} onPress={() => updateName(editName)} style={{ marginTop: spacing.sm }} />
          </Card>
        </>
      )}

      <SectionTitle>Descargas</SectionTitle>
      {!downloads.supported ? (
        <Text style={styles.body}>Las descargas están disponibles en la app del teléfono.</Text>
      ) : plan !== 'premium' ? (
        <Text style={styles.body}>Con Premium puedes descargar las narraciones para escucharlas sin internet. Las que vienen dentro de la app ya funcionan sin conexión.</Text>
      ) : downloads.items.length === 0 ? (
        <Text style={styles.body}>Todavía no descargaste nada. En una historia con voz humana toca «Descargar para escuchar sin internet».</Text>
      ) : (
        <>
          <Text style={styles.small}>{downloads.items.length} archivo(s) · {mb(downloads.totalBytes)} en este teléfono</Text>
          {downloads.items.map((d) => (
            <View key={d.url} style={styles.dlRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dlTitle}>{d.title}</Text>
                <Text style={styles.small}>{mb(d.bytes)}</Text>
              </View>
              <Button label="Quitar" variant="danger" onPress={() => downloads.remove(d.url)} />
            </View>
          ))}
        </>
      )}

      {profile && (
        <>
          <SectionTitle>Sesión</SectionTitle>
          <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
          <Button label="Borrar mi cuenta" variant="danger" onPress={remove} style={{ marginTop: spacing.md }} />
          {message ? <Text style={[styles.body, { marginTop: spacing.sm }]}>{message}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, font, fs, radius, stroke }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
    heading: { fontFamily: font.heading, fontWeight: '800', fontSize: fs(fontSize.subtitle), color: colors.text },
    body: { color: colors.text, fontSize: fs(fontSize.body - 1), lineHeight: fs(22), marginTop: spacing.xs },
    small: { color: colors.textMuted, fontSize: fs(13), lineHeight: fs(19), marginTop: spacing.xs },
    label: { color: colors.textMuted, fontWeight: '800', fontSize: fs(13), marginTop: spacing.md, marginBottom: spacing.xs },
    input: { color: colors.text, fontFamily: font.body, fontSize: fs(fontSize.body), paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: stroke, borderColor: colors.border },
    chips: { flexDirection: 'row', gap: spacing.sm },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    badge: { overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surface, color: colors.text, fontWeight: '900', fontSize: fs(13) },
    dlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    dlTitle: { color: colors.text, fontWeight: '700', fontSize: fs(fontSize.body - 1) },
  });
