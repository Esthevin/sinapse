import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { starsFor } from '@/components/StoryCard';
import { Button, Card, ProgressBar } from '@/components/ui';
import { getStory } from '@/content';
import type { QuizLevel } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';

const LEVEL_COLOR: Record<QuizLevel, string> = {
  literal: '#2C6E9B',
  inferencial: '#7A4E2D',
  critico: '#5B3A7A',
};

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = getStory(id);
  const { settings, saveQuiz, fs } = useApp();
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
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      >
        <Text style={styles.bigStars}>{'⭐'.repeat(stars)}</Text>
        <Text style={[styles.resultTitle, { fontSize: fs(fontSize.title) }]}>
          {t(lang, 'yourScore', { n: correct, total: questions.length })}
        </Text>
        <Text style={[styles.resultMsg, { fontSize: fs(fontSize.body) }]}>
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
                  <Text style={[styles.levelName, { color: LEVEL_COLOR[lvl], fontSize: fs(fontSize.body) }]}>
                    {t(lang, `level_${lvl}`)}
                  </Text>
                  <Text style={{ fontSize: fs(fontSize.body), fontWeight: '700' }}>
                    {ok}/{items.length}
                  </Text>
                </View>
                <Text style={[styles.levelHelp, { fontSize: fs(13) }]}>{t(lang, `levelHelp_${lvl}`)}</Text>
                <ProgressBar value={ok / items.length} color={LEVEL_COLOR[lvl]} />
              </View>
            );
          })}
        </Card>

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {pct < 1 && <Button label={t(lang, 'tryAgain')} icon="🔁" onPress={restart} />}
          <Button
            label={t(lang, 'listenAgain')}
            icon="🎧"
            variant="secondary"
            onPress={() => router.back()}
          />
          <Button label={t(lang, 'backToLibrary')} icon="📚" variant="secondary" onPress={() => router.dismissTo('/')} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
    >
      <ProgressBar value={(current + (selected !== null ? 1 : 0)) / questions.length} />
      <View style={styles.topRow}>
        <Text style={[styles.counter, { fontSize: fs(fontSize.caption) }]}>
          {t(lang, 'questionOf', { n: current + 1, total: questions.length })}
        </Text>
        <View style={[styles.levelPill, { backgroundColor: LEVEL_COLOR[q.level] }]}>
          <Text style={styles.levelPillText}>{t(lang, `level_${q.level}`)}</Text>
        </View>
      </View>

      <Text style={[styles.question, { fontSize: fs(fontSize.title - 4) }]}>{q.question}</Text>

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
            <Text style={[styles.optionText, { fontSize: fs(fontSize.body) }]}>{opt}</Text>
            {reveal && isAnswer && <Text style={styles.mark}>✅</Text>}
            {reveal && isChosen && !isAnswer && <Text style={styles.mark}>❌</Text>}
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
          <Text style={[styles.feedbackTitle, { fontSize: fs(fontSize.subtitle) }]}>
            {selected === q.answer ? `🎉 ${t(lang, 'correct')}` : `🤔 ${t(lang, 'incorrect')}`}
          </Text>
          <Text style={[styles.feedbackText, { fontSize: fs(fontSize.body) }]}>{q.explanation}</Text>
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

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  counter: { color: colors.textMuted, fontWeight: '700' },
  levelPill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  levelPillText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  question: { fontWeight: '900', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '900',
    color: colors.primary,
    overflow: 'hidden',
  },
  optionText: { flex: 1, color: colors.text },
  mark: { fontSize: 20 },
  feedback: { marginTop: spacing.md },
  feedbackTitle: { fontWeight: '900', color: colors.text },
  feedbackText: { color: colors.text, marginTop: spacing.xs, lineHeight: 24 },
  bigStars: { fontSize: 56, textAlign: 'center', marginTop: spacing.lg },
  resultTitle: { fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: spacing.md },
  resultMsg: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  levelName: { fontWeight: '800' },
  levelHelp: { color: colors.textMuted, marginBottom: spacing.xs },
});
