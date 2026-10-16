import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { estimateMinutes, isUserBook } from '@/content';
import { hasHumanNarration } from '@/content/narration';
import type { Story } from '@/content/types';
import { t, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useTheme } from '@/theme/theme';
import { Card, Cover, ProgressBar, Stars, Text } from './ui';

export function starsFor(correct: number, total: number): number {
  const pct = total ? correct / total : 0;
  return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
}

/**
 * Tarjeta de historia. Según la biblioteca elegida en Ajustes:
 *  - cuadrícula: tarjeta con portada grande;
 *  - lista: fila con portada pequeña, autor en cursiva y datos en una línea.
 */
export function StoryCard({ story, width }: { story: Story; width: number }) {
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
  const region = isUserBook(story) ? 'Mi PDF' : t(lang, story.region);
  const human = hasHumanNarration(story, 'es', recordings[story.id]);
  const open = () => router.push({ pathname: '/story/[id]', params: { id: story.id } });
  const a11y = `${title}, ${story.author}`;

  if (th.grid) {
    const inner = width - spacing.md * 2 - th.stroke * 2 - th.shadowOffset;
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
