import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { estimateMinutes } from '@/content';
import { hasAudioNarration, hasHumanNarration } from '@/content/narration';
import type { Story } from '@/content/types';
import { LANGUAGES, t, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useTheme } from '@/theme/theme';
import { Card, Cover, label, ProgressBar, Stars, Text } from './ui';

export function starsFor(correct: number, total: number): number {
  const pct = total ? correct / total : 0;
  return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
}

/**
 * Tarjeta de historia. Cada perfil la dibuja distinto:
 *  - niños: tarjeta en cuadrícula con portada grande;
 *  - jóvenes: fila numerada con datos en mayúsculas;
 *  - adultos: fila editorial con título en serifa y autor en cursiva.
 */
export function StoryCard({ story, index, width }: { story: Story; index: number; width: number }) {
  const { settings, progress, quizzes, recordings, fs } = useApp();
  const th = useTheme();
  const { colors, spacing, fontSize } = th;
  const { lang } = settings;
  const title = pickLocalized(story.title, lang);
  const prog = progress[story.id];
  const quiz = quizzes[story.id];
  const stars = quiz ? starsFor(quiz.best, quiz.total) : 0;
  const inProgress = !!prog && !prog.completed && prog.paragraph > 0;
  const mins = `${estimateMinutes(story)} ${t(lang, 'minutes')}`;
  const region = t(lang, story.region);
  const human = hasHumanNarration(story, 'es', recordings[story.id]);
  const langs = LANGUAGES.filter((l) => l.code !== 'es' && (l.code === lang || hasAudioNarration(story, l.code, recordings[story.id])));
  const open = () => router.push({ pathname: '/story/[id]', params: { id: story.id } });
  const a11y = `${title}, ${story.author}`;

  if (th.id === 'ninos') {
    const inner = width - spacing.md * 2 - 6 - th.shadowOffset;
    return (
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={a11y} style={{ width }}>
        <Card style={{ padding: spacing.md }}>
          <Cover story={story} size={inner} />
          <Text style={{ fontSize: fs(fontSize.body + 1), fontWeight: '900', marginTop: spacing.md }} numberOfLines={2}>
            {title}
          </Text>
          <Text style={{ fontSize: fs(fontSize.caption), color: colors.textMuted, fontWeight: '700', marginTop: 2 }}>
            {region} · {mins}
          </Text>
          <View style={{ marginTop: spacing.sm, minHeight: 18 }}>
            {prog?.completed ? <Stars count={stars || 1} /> : inProgress ? <ProgressBar value={prog.paragraph / story.paragraphs.es.length} /> : null}
          </View>
        </Card>
      </Pressable>
    );
  }

  const meta = [region, mins, human ? t(lang, 'humanVoice') : null].filter(Boolean).join('  ·  ');
  const tags = langs.map((l) => l.short).join(' · ');

  if (th.id === 'jovenes') {
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ width: 30, fontSize: fs(fontSize.caption), fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
        <Cover story={story} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fs(fontSize.body + 1), fontWeight: '800' }} numberOfLines={2}>
            {title}
          </Text>
          <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 3, letterSpacing: 0.8, fontWeight: '700' }} numberOfLines={1}>
            {label(th, meta)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
            {prog?.completed ? (
              <Text style={{ fontSize: fs(11), color: colors.accent, fontWeight: '900', letterSpacing: 1 }}>{label(th, t(lang, 'completed'))}</Text>
            ) : null}
            {stars > 0 ? <Stars count={stars} size={10} /> : null}
            {tags ? <Text style={{ fontSize: fs(11), color: colors.textMuted, fontWeight: '700' }}>{tags}</Text> : null}
          </View>
          {inProgress ? (
            <View style={{ marginTop: spacing.sm }}>
              <ProgressBar value={prog.paragraph / story.paragraphs.es.length} />
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Cover story={story} size={64} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fs(fontSize.subtitle - 1), fontWeight: '700', lineHeight: fs(fontSize.subtitle + 5) }} numberOfLines={2}>
          {title}
        </Text>
        <Text style={{ fontSize: fs(fontSize.caption + 1), color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }} numberOfLines={1}>
          {story.author}
        </Text>
        <Text style={{ fontSize: fs(fontSize.caption), color: colors.textMuted, marginTop: 4 }} numberOfLines={1}>
          {meta}
          {prog?.completed ? `  ·  ${t(lang, 'completed')}` : ''}
        </Text>
        {inProgress ? (
          <View style={{ marginTop: spacing.sm }}>
            <ProgressBar value={prog.paragraph / story.paragraphs.es.length} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
