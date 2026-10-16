import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { starsFor } from '@/components/StoryCard';
import { Button, Card, Glyph, ProgressBar, Stars, Text } from '@/components/ui';
import { getStory } from '@/content';
import type { QuizLevel } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = getStory(id);
  const { settings, saveQuiz } = useApp();
  const { th, styles, colors, spacing } = useThemed(makeStyles);
  const LEVEL_COLOR = th.colors.level;
  const insets = useSafeAreaInsets();
  const { lang } = settings;

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  if (!story) return null;
  const questions = story.quiz;
  const q = questions[current];

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    setAnswers((a) => [...a, i === q.answer]);
  };

  const advance = () => {
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      return;
    }
    const byLevel: Record<string, { correct: number; total: number }> = {};
    questions.forEach((qq, i) => {
      const lvl = (byLevel[qq.level] ??= { correct: 0, total: 0 });
      lvl.total++;
      if (answers[i]) lvl.correct++;
    });
    saveQuiz(story.id, answers.filter(Boolean).length, questions.length, byLevel);
    setDone(true);
  };

  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setDone(false);
  };

  if (done) {
    const correct = answers.filter(Boolean).length;
    const stars = starsFor(correct, questions.length);
    const pct = correct / questions.length;
    const levels: QuizLevel[] = ['literal', 'inferencial', 'critico'];
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.bigStars}>
          <Stars count={stars} size={th.id === 'ninos' ? 34 : 24} />
        </View>
        <Text style={styles.resultTitle}>
          {t(lang, 'yourScore', { n: correct, total: questions.length })}
        </Text>
        <Text style={styles.resultMsg}>
          {pct >= 0.9 ? t(lang, 'scoreGreat') : pct >= 0.6 ? t(lang, 'scoreGood') : t(lang, 'scoreLow')}
        </Text>

        <Card style={{ marginTop: spacing.lg }}>
          {levels.map((lvl) => {
            const items = questions.map((qq, i) => ({ qq, ok: answers[i] })).filter((x) => x.qq.level === lvl);
            if (!items.length) return null;
            const ok = items.filter((x) => x.ok).length;
            return (
              <View key={lvl} style={{ marginBottom: spacing.md }}>
                <View style={styles.levelRow}>
                  <Text style={[styles.levelName, { color: LEVEL_COLOR[lvl] }]}>
                    {t(lang, `level_${lvl}`)}
                  </Text>
                  <Text style={styles.levelScore}>
                    {ok}/{items.length}
                  </Text>
                </View>
                <Text style={styles.levelHelp}>{t(lang, `levelHelp_${lvl}`)}</Text>
                <ProgressBar value={ok / items.length} color={LEVEL_COLOR[lvl]} />
              </View>
            );
          })}
        </Card>

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {pct < 1 && <Button label={t(lang, 'tryAgain')} onPress={restart} />}
          <Button
            label={t(lang, 'listenAgain')}
           
            variant="secondary"
            onPress={() => router.back()}
          />
          <Button label={t(lang, 'backToLibrary')} variant="secondary" onPress={() => router.dismissTo('/')} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <ProgressBar value={(current + (selected !== null ? 1 : 0)) / questions.length} />
      <View style={styles.topRow}>
        <Text style={styles.counter}>
          {t(lang, 'questionOf', { n: current + 1, total: questions.length })}
        </Text>
        <View style={[styles.levelPill, { backgroundColor: LEVEL_COLOR[q.level] }]}>
          <Text style={styles.levelPillText}>{t(lang, `level_${q.level}`)}</Text>
        </View>
      </View>

      <Text style={styles.question}>{q.question}</Text>

      {q.options.map((opt, i) => {
        const isAnswer = i === q.answer;
        const isChosen = i === selected;
        const reveal = selected !== null;
        return (
          <Pressable
            key={i}
            onPress={() => choose(i)}
            disabled={reveal}
            accessibilityRole="button"
            accessibilityState={{ selected: isChosen }}
            style={[
              styles.option,
              reveal && isAnswer && styles.optionCorrect,
              reveal && isChosen && !isAnswer && styles.optionWrong,
            ]}
          >
            <Text style={styles.optionLetter}>{String.fromCharCode(65 + i)}</Text>
            <Text style={styles.optionText}>{opt}</Text>
            {reveal && isAnswer && <Glyph name="check" size={22} color={colors.success} />}
            {reveal && isChosen && !isAnswer && <Text style={[styles.mark, { color: colors.danger }]}>X</Text>}
          </Pressable>
        );
      })}

      {selected !== null && (
        <Card
          style={[
            styles.feedback,
            selected === q.answer
              ? { backgroundColor: colors.successSoft, borderColor: colors.success }
              : { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
          ]}
        >
          <Text style={styles.feedbackTitle}>{selected === q.answer ? t(lang, 'correct') : t(lang, 'incorrect')}</Text>
          <Text style={styles.feedbackText}>{q.explanation}</Text>
        </Card>
      )}

      {selected !== null && (
        <Button
          label={current + 1 < questions.length ? t(lang, 'next') : t(lang, 'finish')}
          onPress={advance}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </ScrollView>
  );
}

const makeStyles = ({ id, colors, spacing, radius, fontSize, font, stroke, fs, uppercaseLabels }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.lg, width: '100%', maxWidth: 680, alignSelf: 'center' },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
    counter: { color: colors.textMuted, fontWeight: '700', fontSize: fs(fontSize.caption) },
    levelPill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
    levelPillText: { color: colors.background, fontWeight: '800', fontSize: fs(13), letterSpacing: uppercaseLabels ? 1 : 0 },
    question: {
      fontFamily: font.heading,
      fontWeight: id === 'adultos' ? '700' : '900',
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
      fontSize: fs(id === 'ninos' ? 30 : fontSize.title - 3),
      lineHeight: fs(id === 'ninos' ? 38 : 32),
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: stroke,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: id === 'ninos' ? spacing.md + 4 : spacing.md,
      marginBottom: spacing.sm + 2,
      backgroundColor: colors.card,
    },
    optionCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft },
    optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
    optionLetter: {
      width: 34,
      height: 34,
      borderRadius: id === 'ninos' ? 17 : radius.sm,
      backgroundColor: colors.surface,
      textAlign: 'center',
      lineHeight: 34,
      fontWeight: '900',
      color: colors.text,
      overflow: 'hidden',
      fontFamily: font.heading,
    },
    optionText: { flex: 1, color: colors.text, fontSize: fs(id === 'ninos' ? fontSize.body + 2 : fontSize.body) },
    mark: { fontSize: fs(18), fontWeight: '900' },
    feedback: { marginTop: spacing.md },
    feedbackTitle: { fontFamily: font.heading, fontWeight: '900', color: colors.text, fontSize: fs(fontSize.subtitle) },
    feedbackText: { color: colors.text, marginTop: spacing.xs, lineHeight: fs(24), fontSize: fs(fontSize.body) },
    bigStars: { alignItems: 'center', marginTop: spacing.lg },
    resultTitle: { fontFamily: font.heading, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: spacing.md, fontSize: fs(fontSize.title) },
    resultMsg: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontSize: fs(fontSize.body) },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    levelName: { fontWeight: '800', fontSize: fs(fontSize.body) },
    levelScore: { fontWeight: '700', fontSize: fs(fontSize.body), color: colors.text },
    levelHelp: { color: colors.textMuted, marginBottom: spacing.xs, fontSize: fs(13) },
  });
