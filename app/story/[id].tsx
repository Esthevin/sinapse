import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, ProgressBar, SectionTitle } from '@/components/ui';
import { estimateMinutes, getStory, REGION_LABEL } from '@/content';
import {
  hasHumanNarration,
  isRemoteAudio,
  narratedLanguages,
  resolveNarration,
  type ResolvedNarration,
  type VoiceInfo,
} from '@/content/narration';
import type { Story } from '@/content/types';
import { useNarration } from '@/hooks/useNarration';
import { LANGUAGES, languageName, t, type LanguageCode } from '@/i18n/translations';
import { hasSpanishVoice } from '@/services/speech';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';

const SPEEDS = [0.75, 1, 1.25];

/** Etiqueta transparente sobre el origen de la voz que se escucha. */
function voiceLabel(lang: LanguageCode, voice: VoiceInfo): string {
  if (voice.kind === 'tts') return `🔊 ${t(lang, 'voiceDevice')}`;
  if (voice.source === 'archivo') return `📼 ${t(lang, 'voiceArchive', { name: voice.name })}`;
  if (voice.source === 'ia_autorizada') return `🤖 ${t(lang, 'voiceAuthorizedAI', { name: voice.name })}`;
  if (voice.source === 'sintetica') return `✨ ${t(lang, 'voiceSynthetic', { name: voice.name })}`;
  return `🎙️ ${t(lang, 'narratedBy', { name: voice.name })}`;
}

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = getStory(id);
  const { settings, recordings, openStory } = useApp();
  const [viewLang, setViewLang] = useState<LanguageCode>(settings.lang);

  useEffect(() => {
    if (story) openStory(story.id);
  }, [story, openStory]);

  if (!story) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: fontSize.subtitle }}>Historia no encontrada</Text>
      </View>
    );
  }

  const resolved = resolveNarration(story, viewLang, recordings[story.id]);

  return (
    <>
      <Stack.Screen options={{ title: story.title[settings.lang] ?? story.title.es }} />
      {/* `key` reinicia el reproductor cuando cambia la fuente de voz. */}
      <StoryPlayer key={resolved.key} story={story} resolved={resolved} viewLang={viewLang} setViewLang={setViewLang} />
    </>
  );
}

function StoryPlayer({
  story,
  resolved,
  viewLang,
  setViewLang,
}: {
  story: Story;
  resolved: ResolvedNarration;
  viewLang: LanguageCode;
  setViewLang: (l: LanguageCode) => void;
}) {
  const { settings, progress, recordings, updateSettings, savePosition, addListening, markCompleted, fs } = useApp();
  const insets = useSafeAreaInsets();
  const { lang } = settings;
  const [finished, setFinished] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const paragraphY = useRef<number[]>([]);
  const textTop = useRef(0);

  const narration = useNarration({
    source: resolved.source,
    rate: settings.speechRate,
    startParagraph: progress[story.id]?.paragraph ?? 0,
    onParagraph: (i) => savePosition(story.id, i),
    onComplete: () => {
      markCompleted(story.id);
      setFinished(true);
    },
    onListenTick: (sec) => addListening(story.id, sec),
  });

  const isTts = resolved.source.kind === 'tts';
  const paragraphs = resolved.source.paragraphs;

  useEffect(() => {
    if (isTts) hasSpanishVoice().then((ok) => setNoVoice(!ok));
  }, [isTts]);

  // Seguir con la vista el párrafo que se está narrando.
  useEffect(() => {
    if (!narration.playing) return;
    const y = paragraphY.current[narration.index];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, textTop.current + y - 120), animated: true });
  }, [narration.index, narration.playing]);

  const region = REGION_LABEL[story.region];
  const voice = resolved.voice;
  const textIsReference = resolved.lang !== 'es' && !story.paragraphs[resolved.lang];

  // Lenguas visibles: castellano, las que tienen narración, y la del usuario.
  // El resto se despliega con “Otras lenguas” (el Perú tiene 48 lenguas originarias).
  const [showAllLangs, setShowAllLangs] = useState(false);
  const featured = new Set<LanguageCode>(['es', ...narratedLanguages(story, recordings[story.id]), settings.lang, viewLang]);
  const visibleLangs = showAllLangs ? LANGUAGES : LANGUAGES.filter((l) => featured.has(l.code));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={[styles.cover, { backgroundColor: story.coverColor }]}>
            <Text style={styles.coverEmoji}>{story.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { fontSize: fs(fontSize.title - 2) }]}>{story.title[lang] ?? story.title.es}</Text>
            <Text style={[styles.meta, { fontSize: fs(fontSize.caption) }]}>
              {story.author}
              {story.collection ? ` · ${story.collection}` : ''}
            </Text>
            {story.original && (
              <Text style={[styles.meta, { fontSize: fs(fontSize.caption), color: colors.accent, fontWeight: '700' }]}>
                📜 {t(lang, 'originalText')}
              </Text>
            )}
            <Text style={[styles.meta, { fontSize: fs(fontSize.caption) }]}>
              {region.emoji} {t(lang, story.region)} · {estimateMinutes(story)} {t(lang, 'minutes')}
            </Text>
          </View>
        </View>

        <Text style={[styles.summary, { fontSize: fs(fontSize.body) }]}>{story.summary[lang] ?? story.summary.es}</Text>

        {/* Idioma de escucha */}
        <View style={styles.chips}>
          {visibleLangs.map((l) => (
            <Chip
              key={l.code}
              label={hasHumanNarration(story, l.code, recordings[story.id]) ? `🎙️ ${l.native}` : l.native}
              active={viewLang === l.code}
              onPress={() => setViewLang(l.code)}
            />
          ))}
          {!showAllLangs && visibleLangs.length < LANGUAGES.length && (
            <Chip label={`🌐 ${t(lang, 'otherLanguages')}`} onPress={() => setShowAllLangs(true)} />
          )}
        </View>

        {resolved.fallback && (
          <Card style={styles.notice}>
            <Text style={[styles.noticeText, { fontSize: fs(fontSize.body) }]}>
              {t(lang, 'noNarrationYet', { lang: languageName(viewLang) })} {t(lang, 'listeningInSpanish')}
            </Text>
            <Button
              label={t(lang, 'recordThisStory', { lang: languageName(viewLang) })}
              icon="🎙️"
              variant="secondary"
              onPress={() => router.push({ pathname: '/record/[id]', params: { id: story.id, lang: viewLang } })}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        {voice.kind === 'audio' && (
          <Card style={styles.narratorCard}>
            <Text style={[styles.narratorLabel, { fontSize: fs(12) }]}>{t(lang, 'whoNarrates').toUpperCase()}</Text>
            <View style={styles.narratorRow}>
              <View style={styles.narratorAvatar}>
                <Text style={styles.narratorInitial}>{voice.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.narratorName, { fontSize: fs(fontSize.body + 1) }]}>{voice.name}</Text>
                <Text style={[styles.narratorRole, { fontSize: fs(13) }]}>
                  {t(lang, `role_${voice.narrator?.role ?? 'comunidad'}`)} · {languageName(resolved.lang)}
                </Text>
              </View>
            </View>
            {voice.narrator?.bio ? (
              <Text style={[styles.narratorBio, { fontSize: fs(fontSize.caption + 1) }]}>{voice.narrator.bio}</Text>
            ) : null}
            <Text style={[styles.narratorCredit, { fontSize: fs(12) }]}>
              {voice.source === 'local' ? `📱 ${t(lang, 'recordedOnPhone')}` : voice.narrator?.credit}
            </Text>
            {isRemoteAudio(resolved.source) && (
              <Text style={[styles.narratorCredit, { fontSize: fs(12) }]}>📶 {t(lang, 'needsInternet')}</Text>
            )}
          </Card>
        )}

        {isTts && noVoice && (
          <Card style={styles.notice}>
            <Text style={[styles.noticeText, { fontSize: fs(fontSize.body) }]}>⚠️ {t(lang, 'noSpanishVoice')}</Text>
          </Card>
        )}

        {/* Texto sincronizado */}
        <Text style={[styles.hint, { fontSize: fs(13) }]}>👆 {t(lang, 'tapToJump')}</Text>
        {textIsReference && <Text style={[styles.hint, { fontSize: fs(13) }]}>📝 Texto de referencia en castellano</Text>}
        <View onLayout={(e) => (textTop.current = e.nativeEvent.layout.y)}>
          {paragraphs.map((p, i) => {
            const active = i === narration.index && (narration.playing || narration.index > 0);
            return (
              <Pressable
                key={i}
                onPress={() => narration.goTo(i)}
                onLayout={(e) => (paragraphY.current[i] = e.nativeEvent.layout.y)}
                style={[styles.paragraph, active && styles.paragraphActive]}
                accessibilityRole="button"
                accessibilityHint={t(lang, 'tapToJump')}
              >
                <Text style={[styles.paragraphText, { fontSize: fs(fontSize.body + 2), lineHeight: fs(30) }]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>

        {finished && (
          <Card style={[styles.notice, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Text style={[styles.noticeText, { fontSize: fs(fontSize.body) }]}>🎉 {t(lang, 'finishedBanner')}</Text>
          </Card>
        )}

        <Button
          label={t(lang, 'answerQuestions')}
          icon="✍️"
          onPress={() => {
            narration.pause();
            router.push({ pathname: '/quiz/[id]', params: { id: story.id } });
          }}
          style={{ marginTop: spacing.lg }}
        />

        {/* Glosario */}
        <SectionTitle>📖 {t(lang, 'newWords')}</SectionTitle>
        {story.glossary.map((g) => (
          <View key={g.word} style={styles.glossaryRow}>
            <Text style={[styles.glossaryWord, { fontSize: fs(fontSize.body) }]}>{g.word}</Text>
            <Text style={[styles.glossaryMeaning, { fontSize: fs(fontSize.caption + 1) }]}>{g.meaning}</Text>
            {g.translations && Object.keys(g.translations).length > 0 && (
              <Text style={[styles.glossaryLangs, { fontSize: fs(fontSize.caption) }]}>
                {Object.entries(g.translations)
                  .map(([code, word]) => `${languageName(code)}: ${word}`)
                  .join('   ·   ')}
              </Text>
            )}
          </View>
        ))}

        <Text style={[styles.source, { fontSize: fs(12) }]}>
          {t(lang, 'source')}: {story.source}
        </Text>
      </ScrollView>

      {/* Controles fijos abajo */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.sm }]}>
        <ProgressBar value={narration.progress} />
        <View style={styles.controlsInfo}>
          <Text style={[styles.controlsLabel, { fontSize: fs(13) }]}>
            {t(lang, 'paragraphOf', { n: narration.index + 1, total: paragraphs.length })}
          </Text>
          <Text style={[styles.controlsLabel, { fontSize: fs(13) }]} numberOfLines={1}>
            {voiceLabel(lang, voice)}
          </Text>
        </View>
        <View style={styles.buttonsRow}>
          <Pressable onPress={narration.previous} style={styles.sideButton} accessibilityRole="button" accessibilityLabel={t(lang, 'previous')}>
            <Text style={styles.sideIcon}>⏮</Text>
          </Pressable>
          <Pressable
            onPress={narration.toggle}
            style={styles.playButton}
            accessibilityRole="button"
            accessibilityLabel={narration.playing ? t(lang, 'pause') : t(lang, 'listen')}
          >
            <Text style={styles.playIcon}>{narration.loading ? '…' : narration.playing ? '⏸' : '▶'}</Text>
          </Pressable>
          <Pressable onPress={narration.next} style={styles.sideButton} accessibilityRole="button" accessibilityLabel={t(lang, 'next')}>
            <Text style={styles.sideIcon}>⏭</Text>
          </Pressable>
        </View>
        <View style={styles.speedRow}>
          <Text style={[styles.controlsLabel, { fontSize: fs(13) }]}>🐢 {t(lang, 'speed')}</Text>
          {SPEEDS.map((s) => (
            <Chip key={s} label={`${s}x`} active={settings.speechRate === s} onPress={() => updateSettings({ speechRate: s })} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  cover: { width: 88, height: 88, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 44 },
  title: { fontWeight: '900', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 2 },
  summary: { color: colors.text, marginTop: spacing.md, lineHeight: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  notice: { marginTop: spacing.md, backgroundColor: colors.accentSoft, borderColor: colors.accent },
  noticeText: { color: colors.text, lineHeight: 24 },
  hint: { color: colors.textMuted, marginTop: spacing.md },
  narratorCard: { marginTop: spacing.md },
  narratorLabel: { color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  narratorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  narratorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narratorInitial: { color: colors.white, fontSize: 22, fontWeight: '900' },
  narratorName: { fontWeight: '900', color: colors.text },
  narratorRole: { color: colors.accent, fontWeight: '700', marginTop: 2 },
  narratorBio: { color: colors.text, marginTop: spacing.sm, lineHeight: 22 },
  narratorCredit: { color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  paragraph: { borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  paragraphActive: { backgroundColor: colors.highlight, borderLeftWidth: 4, borderLeftColor: colors.gold },
  paragraphText: { color: colors.text },
  glossaryRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  glossaryWord: { fontWeight: '800', color: colors.primary },
  glossaryMeaning: { color: colors.text, marginTop: 2 },
  glossaryLangs: { color: colors.accent, marginTop: 4, fontWeight: '700' },
  source: { color: colors.textMuted, marginTop: spacing.lg, fontStyle: 'italic' },
  controls: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  controlsInfo: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  controlsLabel: { color: colors.textMuted, fontWeight: '600', flexShrink: 1 },
  buttonsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.xs },
  sideButton: { padding: spacing.md },
  sideIcon: { fontSize: 30, color: colors.primary },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 34, color: colors.white },
  speedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
});
