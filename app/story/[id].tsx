import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Cover, Glyph, label as caps, ProgressBar, SectionTitle, Text } from '@/components/ui';
import { estimateMinutes, getStory } from '@/content';
import {
  isRemoteAudio,
  narratedLanguages,
  resolveNarration,
  type ResolvedNarration,
  type VoiceInfo,
} from '@/content/narration';
import type { Story } from '@/content/types';
import { useNarration } from '@/hooks/useNarration';
import { LANGUAGES, languageName, t, type LanguageCode, pickLocalized } from '@/i18n/translations';
import { hasSpanishVoice } from '@/services/speech';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';

const SPEEDS = [0.75, 1, 1.25];
const MAX_WIDTH = 760;

/** Etiqueta transparente sobre el origen de la voz que se escucha. */
function voiceLabel(lang: LanguageCode, voice: VoiceInfo): string {
  if (voice.kind === 'tts') return t(lang, 'voiceDevice');
  if (voice.source === 'archivo') return t(lang, 'voiceArchive', { name: voice.name });
  if (voice.source === 'ia_autorizada') return t(lang, 'voiceAuthorizedAI', { name: voice.name });
  if (voice.source === 'sintetica') return t(lang, 'voiceSynthetic', { name: voice.name });
  return t(lang, 'narratedBy', { name: voice.name });
}

export default function StoryScreen() {
  const { styles } = useThemed(makeStyles);
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
        <Text style={styles.title}>Historia no encontrada</Text>
      </View>
    );
  }

  const resolved = resolveNarration(story, viewLang, recordings[story.id]);

  return (
    <>
      <Stack.Screen options={{ title: pickLocalized(story.title, settings.lang) }} />
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
  const { settings, progress, recordings, updateSettings, savePosition, addListening, markCompleted } = useApp();
  const { th, styles, colors, spacing } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
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

  const voice = resolved.voice;
  const textIsReference = resolved.lang !== 'es' && !story.paragraphs[resolved.lang];

  // Lenguas visibles: castellano, las que tienen narración, y la del usuario.
  // El resto se despliega con “Otras lenguas” (el Perú tiene 48 lenguas originarias).
  const [showAllLangs, setShowAllLangs] = useState(false);
  const featured = new Set<LanguageCode>(['es', ...narratedLanguages(story, recordings[story.id]), settings.lang, viewLang]);
  const visibleLangs = showAllLangs ? LANGUAGES : LANGUAGES.filter((l) => featured.has(l.code));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* Cabecera */}
        <View style={[styles.header, th.id === 'ninos' && { flexDirection: 'column', alignItems: 'center' }]}>
          <Cover
            story={story}
            size={th.id === 'ninos' ? Math.min(Math.min(screenWidth, MAX_WIDTH) - spacing.md * 2 - th.shadowOffset, 300) : th.id === 'jovenes' ? 96 : 76}
            title={pickLocalized(story.title, lang)}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{pickLocalized(story.title, lang)}</Text>
            <Text style={styles.meta}>
              {story.author}
              {story.collection && th.id !== 'ninos' ? ` · ${story.collection}` : ''}
            </Text>
            {story.original && th.id !== 'ninos' && <Text style={[styles.meta, { color: colors.accent, fontWeight: '700' }]}>{t(lang, 'originalText')}</Text>}
            <Text style={styles.meta}>
              {caps(th, t(lang, story.region))} · {estimateMinutes(story)} {t(lang, 'minutes')}
            </Text>
          </View>
        </View>

        <Text style={styles.summary}>{pickLocalized(story.summary, lang)}</Text>

        {/* Idioma de escucha */}
        <View style={styles.chips}>
          {visibleLangs.map((l) => (
            <Chip
              key={l.code}
              label={l.native}
              active={viewLang === l.code}
              onPress={() => setViewLang(l.code)}
            />
          ))}
          {!showAllLangs && visibleLangs.length < LANGUAGES.length && (
            <Chip label={t(lang, 'otherLanguages')} onPress={() => setShowAllLangs(true)} />
          )}
        </View>

        {resolved.fallback && (
          <Card style={styles.notice}>
            <Text style={styles.noticeText}>
              {t(lang, 'noNarrationYet', { lang: languageName(viewLang) })} {t(lang, 'listeningInSpanish')}
            </Text>
            <Button
              label={t(lang, 'recordThisStory', { lang: languageName(viewLang) })}
              variant="secondary"
              onPress={() => router.push({ pathname: '/record/[id]', params: { id: story.id, lang: viewLang } })}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        {voice.kind === 'audio' && (
          <Card style={styles.narratorCard}>
            <Text style={styles.narratorLabel}>{t(lang, 'whoNarrates').toUpperCase()}</Text>
            <View style={styles.narratorRow}>
              <View style={styles.narratorAvatar}>
                <Text style={styles.narratorInitial}>{voice.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.narratorName}>{voice.name}</Text>
                <Text style={styles.narratorRole}>
                  {t(lang, `role_${voice.narrator?.role ?? 'comunidad'}`)} · {languageName(resolved.lang)}
                </Text>
              </View>
            </View>
            {th.id !== 'ninos' && voice.narrator?.bio ? <Text style={styles.narratorBio}>{voice.narrator.bio}</Text> : null}
            {th.id !== 'ninos' && (
              <Text style={styles.narratorCredit}>{voice.source === 'local' ? t(lang, 'recordedOnPhone') : voice.narrator?.credit}</Text>
            )}
            {isRemoteAudio(resolved.source) && <Text style={styles.narratorCredit}>{t(lang, 'needsInternet')}</Text>}
            {voice.source !== 'sintetica' && settings.teamTools && (
              <Button
                label="Sincronizar párrafos (equipo)"
                variant="secondary"
                onPress={() => router.push({ pathname: '/sync/[id]', params: { id: story.id, lang: resolved.lang } })}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </Card>
        )}

        {isTts && noVoice && (
          <Card style={styles.notice}>
            <Text style={styles.noticeText}>{t(lang, 'noSpanishVoice')}</Text>
          </Card>
        )}

        {/* Texto sincronizado */}
        <Text style={styles.hint}>{t(lang, 'tapToJump')}</Text>
        {textIsReference && <Text style={styles.hint}>Texto de referencia en castellano</Text>}
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
                <Text style={styles.paragraphText}>{p}</Text>
              </Pressable>
            );
          })}
        </View>

        {finished && (
          <Card style={[styles.notice, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Text style={styles.noticeText}>{t(lang, 'finishedBanner')}</Text>
          </Card>
        )}

        <Button
          label={t(lang, 'answerQuestions')}
          onPress={() => {
            narration.pause();
            router.push({ pathname: '/quiz/[id]', params: { id: story.id } });
          }}
          style={{ marginTop: spacing.lg }}
        />

        {/* Glosario */}
        <SectionTitle>{t(lang, 'newWords')}</SectionTitle>
        {story.glossary.map((g) => (
          <View key={g.word} style={styles.glossaryRow}>
            <Text style={styles.glossaryWord}>{g.word}</Text>
            <Text style={styles.glossaryMeaning}>{g.meaning}</Text>
            {g.translations && Object.keys(g.translations).length > 0 && (
              <Text style={styles.glossaryLangs}>
                {Object.entries(g.translations)
                  .map(([code, word]) => `${languageName(code)}: ${word}`)
                  .join('   ·   ')}
              </Text>
            )}
          </View>
        ))}

        <Text style={styles.source}>
          {t(lang, 'source')}: {story.source}
        </Text>
      </ScrollView>

      {/* Controles fijos abajo */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.controlsInner}>
          <ProgressBar value={narration.progress} />
          <View style={styles.controlsInfo}>
            <Text style={styles.controlsLabel}>{t(lang, 'paragraphOf', { n: narration.index + 1, total: paragraphs.length })}</Text>
            <Text style={styles.controlsLabel} numberOfLines={1}>
              {voiceLabel(lang, voice)}
            </Text>
          </View>
          <View style={styles.buttonsRow}>
            <Pressable onPress={narration.previous} style={styles.sideButton} accessibilityRole="button" accessibilityLabel={t(lang, 'previous')}>
              <Glyph name="prev" size={26} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={narration.toggle}
              style={styles.playButton}
              accessibilityRole="button"
              accessibilityLabel={narration.playing ? t(lang, 'pause') : t(lang, 'listen')}
            >
              {narration.loading ? (
                <Text style={{ color: colors.onAccent, fontSize: 28, fontWeight: '900' }}>…</Text>
              ) : (
                <Glyph name={narration.playing ? 'pause' : 'play'} size={th.id === 'ninos' ? 38 : 30} color={colors.onAccent} />
              )}
            </Pressable>
            <Pressable onPress={narration.next} style={styles.sideButton} accessibilityRole="button" accessibilityLabel={t(lang, 'next')}>
              <Glyph name="next" size={26} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.speedRow}>
            <Text style={styles.controlsLabel}>{t(lang, 'speed')}</Text>
            {SPEEDS.map((sp) => (
              <Chip key={sp} label={`${sp}x`} active={settings.speechRate === sp} onPress={() => updateSettings({ speechRate: sp })} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = ({ id, colors, spacing, radius, fontSize, font, stroke, fs, uppercaseLabels }: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    title: { fontFamily: font.heading, fontWeight: id === 'adultos' ? '700' : '900', color: colors.text, fontSize: fs(id === 'ninos' ? 30 : fontSize.title - 2) },
    meta: { color: colors.textMuted, marginTop: 3, fontSize: fs(fontSize.caption), letterSpacing: uppercaseLabels ? 0.6 : 0 },
    summary: { color: colors.text, marginTop: spacing.md, lineHeight: fs(26), fontSize: fs(fontSize.body), fontStyle: id === 'adultos' ? 'italic' : 'normal' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    notice: { marginTop: spacing.md, backgroundColor: colors.accentSoft },
    noticeText: { color: colors.text, lineHeight: fs(24), fontSize: fs(fontSize.body) },
    hint: { color: colors.textMuted, marginTop: spacing.md, fontSize: fs(13) },
    narratorCard: { marginTop: spacing.md },
    narratorLabel: { color: colors.textMuted, fontWeight: '800', letterSpacing: 1, fontSize: fs(12) },
    narratorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    narratorAvatar: {
      width: 46,
      height: 46,
      borderRadius: id === 'ninos' ? 23 : radius.sm,
      backgroundColor: id === 'jovenes' ? colors.accent : colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    narratorInitial: { color: id === 'jovenes' ? colors.onAccent : colors.onPrimary, fontSize: 22, fontWeight: '900', fontFamily: font.heading },
    narratorName: { fontWeight: '900', color: colors.text, fontSize: fs(fontSize.body + 1) },
    narratorRole: { color: colors.accent, fontWeight: '700', marginTop: 2, fontSize: fs(13) },
    narratorBio: { color: colors.text, marginTop: spacing.sm, lineHeight: fs(22), fontSize: fs(fontSize.caption + 1) },
    narratorCredit: { color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic', fontSize: fs(12) },
    paragraph: { borderRadius: radius.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, marginTop: spacing.xs },
    paragraphActive: { backgroundColor: colors.highlight, borderLeftWidth: 4, borderLeftColor: colors.highlightBar },
    paragraphText: {
      color: colors.text,
      fontFamily: font.body,
      fontSize: fs(id === 'ninos' ? fontSize.body + 4 : id === 'adultos' ? fontSize.body + 3 : fontSize.body + 1),
      lineHeight: fs(id === 'ninos' ? 34 : id === 'adultos' ? 33 : 29),
    },
    glossaryRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md },
    glossaryWord: { fontFamily: font.heading, fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body + 1) },
    glossaryMeaning: { color: colors.text, marginTop: 2, fontSize: fs(fontSize.caption + 1) },
    glossaryLangs: { color: colors.accent, marginTop: 4, fontWeight: '700', fontSize: fs(fontSize.caption) },
    source: { color: colors.textMuted, marginTop: spacing.lg, fontStyle: 'italic', fontSize: fs(12) },
    controls: { borderTopWidth: stroke, borderTopColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    controlsInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    controlsInfo: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
    controlsLabel: { color: colors.textMuted, fontWeight: '600', flexShrink: 1, fontSize: fs(13) },
    buttonsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.xs },
    sideButton: { padding: spacing.md },
    playButton: {
      width: id === 'ninos' ? 84 : 68,
      height: id === 'ninos' ? 84 : 68,
      borderRadius: id === 'ninos' ? 42 : id === 'jovenes' ? radius.md : 34,
      backgroundColor: colors.accent,
      borderWidth: id === 'ninos' ? stroke : 0,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    speedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  });
