import { useMemo, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { PORTADAS } from '@/content/portadas';
import type { Story } from '@/content/types';
import { sceneFor } from '@/services/ilustracion';
import { useApp } from '@/state/AppContext';
import { useTheme, type Theme } from '@/theme/theme';

/** Texto con la tipografía y el color del perfil. Usar en vez del Text de react-native. */
export function Text({ style, ...rest }: TextProps) {
  const th = useTheme();
  return <RNText {...rest} style={[{ fontFamily: th.font.body, color: th.colors.text }, style]} />;
}

/** Separa los márgenes del estilo recibido: van afuera de la sombra dura. */
function splitMargin(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (k.startsWith('margin') || k === 'flex' || k === 'alignSelf' ? outer : inner)[k] = v;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

/** Envoltorio que dibuja la sombra dura del perfil de niños; en los otros perfiles no agrega nada. */
function HardShadow({ children, radius, style }: { children: ReactNode; radius: number; style?: ViewStyle }) {
  const { shadowOffset: o, colors } = useTheme();
  if (!o) return <View style={style}>{children}</View>;
  return (
    <View style={[{ marginRight: o, marginBottom: o }, style]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: o, top: o, right: -o, bottom: -o, backgroundColor: colors.border, borderRadius: radius }}
      />
      {children}
    </View>
  );
}

export function Chip({
  label: text,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { fs } = useApp();
  const th = useTheme();
  const { colors, radius, spacing, fontSize } = th;
  const onBg = colors.primary;
  const onFg = colors.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={accessibilityLabel ?? text}
      style={{
        borderRadius: radius.pill,
        paddingHorizontal: th.playful ? spacing.md + 4 : spacing.md,
        paddingVertical: th.playful ? spacing.sm + 4 : spacing.sm,
        backgroundColor: active ? onBg : colors.card,
        borderWidth: th.stroke,
        borderColor: active ? onBg : colors.border,
      }}
    >
      <Text
        style={{
          fontSize: fs(fontSize.caption),
          fontWeight: '700',
          color: active ? onFg : colors.text,
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
}

export function Button({
  label: text,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { fs } = useApp();
  const th = useTheme();
  const { colors, radius, spacing, fontSize } = th;
  const bg = variant === 'primary' ? colors.accent : variant === 'danger' ? colors.dangerSoft : colors.card;
  const fg = variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.text;
  const { outer, inner } = splitMargin(style);
  const bordered = variant !== 'primary' || th.playful;
  return (
    <HardShadow radius={radius.md} style={outer}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={text}
        style={({ pressed }) => [
          {
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: th.playful ? 64 : 54,
            borderRadius: th.playful ? radius.pill : radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: bg,
            borderWidth: bordered ? th.stroke : 0,
            borderColor: variant === 'danger' ? colors.danger : colors.border,
            opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          },
          inner,
        ]}
      >
        <Text
          style={{
            color: fg,
            fontSize: fs(fontSize.body),
            fontWeight: '800',
              textAlign: 'center',
          }}
        >
          {text}
        </Text>
      </Pressable>
    </HardShadow>
  );
}

export function ProgressBar({ value, height, color }: { value: number; height?: number; color?: string }) {
  const th = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const h = height ?? (th.playful ? 14 : 4);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{
        height: h,
        width: '100%',
        backgroundColor: th.colors.surface,
        borderRadius: th.playful ? 999 : th.radius.sm,
        overflow: 'hidden',
        borderWidth: th.playful ? 2 : 0,
        borderColor: th.colors.border,
      }}
    >
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color ?? th.colors.accent }} />
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { fs } = useApp();
  const th = useTheme();
  const { colors, spacing, fontSize } = th;
  return (
    <View style={{ marginTop: spacing.lg + 4, marginBottom: spacing.md }}>
      <Text
        style={{
          fontFamily: th.font.heading,
          fontWeight: th.playful ? '900' : '700',
          fontSize: fs(th.playful ? fontSize.title - 2 : fontSize.subtitle + 2),
          color: colors.text,
        }}
      >
        {children}
      </Text>
      {!th.playful && <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing.sm }} />}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const th = useTheme();
  const { outer, inner } = splitMargin(style);
  const flat = !th.playful;
  return (
    <HardShadow radius={th.radius.md} style={outer}>
      <View
        style={[
          {
            backgroundColor: th.colors.card,
            borderRadius: th.radius.md,
            borderWidth: th.stroke,
            borderColor: th.colors.border,
            padding: flat ? th.spacing.md : th.spacing.md + 2,
          },
          inner,
        ]}
      >
        {children}
      </View>
    </HardShadow>
  );
}

/** Pequeños íconos dibujados con formas (sin emojis ni fuentes de íconos). */
export function Glyph({
  name,
  size = 24,
  color,
}: {
  name: 'play' | 'pause' | 'prev' | 'next' | 'record' | 'stop' | 'check';
  size?: number;
  color?: string;
}) {
  const themeText = useTheme().colors.text;
  const c = color ?? themeText;
  const tri = (dir: 'l' | 'r') => ({
    width: 0,
    height: 0,
    borderTopWidth: size * 0.5,
    borderBottomWidth: size * 0.5,
    borderTopColor: 'transparent' as const,
    borderBottomColor: 'transparent' as const,
    ...(dir === 'r'
      ? { borderLeftWidth: size * 0.85, borderLeftColor: c }
      : { borderRightWidth: size * 0.85, borderRightColor: c }),
  });
  const box = { width: size, height: size, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const };
  switch (name) {
    case 'play':
      return <View style={[box, { paddingLeft: size * 0.12 }]}><View style={tri('r')} /></View>;
    case 'pause':
      return (
        <View style={[box, { gap: size * 0.18 }]}>
          <View style={{ width: size * 0.26, height: size * 0.9, backgroundColor: c }} />
          <View style={{ width: size * 0.26, height: size * 0.9, backgroundColor: c }} />
        </View>
      );
    case 'prev':
      return (
        <View style={box}>
          <View style={{ width: size * 0.16, height: size, backgroundColor: c }} />
          <View style={tri('l')} />
        </View>
      );
    case 'next':
      return (
        <View style={box}>
          <View style={tri('r')} />
          <View style={{ width: size * 0.16, height: size, backgroundColor: c }} />
        </View>
      );
    case 'record':
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c }} />;
    case 'stop':
      return <View style={{ width: size * 0.8, height: size * 0.8, backgroundColor: c }} />;
    case 'check':
      return (
        <View style={box}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.78,
              borderRightWidth: Math.max(2, size * 0.16),
              borderBottomWidth: Math.max(2, size * 0.16),
              borderColor: c,
              transform: [{ rotate: '45deg' }, { translateY: -size * 0.08 }],
            }}
          />
        </View>
      );
  }
}

/** Estrellas hechas con rombos (de 1 a 3). */
export function Stars({ count, total = 3, size = 14 }: { count: number; total?: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.5 }} accessibilityLabel={`${count} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            transform: [{ rotate: '45deg' }],
            backgroundColor: i < count ? colors.accent : 'transparent',
            borderWidth: 2,
            borderColor: i < count ? colors.accent : colors.border,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Portada de historia: color por región, un motivo geométrico (sierra: terrazas escalonadas,
 * costa: olas, selva: cañas) y la inicial del título. No usa emojis ni imágenes.
 */
export function Cover({ story, size, title }: { story: Story; size: number; title?: string }) {
  const th = useTheme();
  const { bg, fg } = th.colors.region[story.region];
  const ninos = th.playful;
  const art = PORTADAS[story.id];
  // Sin portada pintada (historia de un PDF o del catálogo descargable): escena dibujada a partir del texto.
  const scene = useMemo(() => {
    if (art !== undefined) return null;
    try {
      return sceneFor({ title: story.title.es, paragraphs: story.paragraphs.es, region: story.region });
    } catch {
      return null;
    }
  }, [art, story.id, story.title.es, story.paragraphs.es, story.region]);
  const initial = (title ?? story.title.es).replace(/^[^\p{L}]+/u, '').charAt(0).toUpperCase();
  const u = size / 10;
  const motif = () => {
    if (story.region === 'sierra') {
      return [0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{ position: 'absolute', bottom: i * u * 1.2, left: (3 - i) * u * 1.1, right: (3 - i) * u * 1.1, height: u * 1.2, backgroundColor: fg, opacity: 0.22 + i * 0.06 }}
        />
      ));
    }
    if (story.region === 'costa') {
      return [0, 1, 2].map((r) => (
        <View key={r} style={{ position: 'absolute', bottom: r * u * 1.8 + u * 0.5, left: 0, right: 0, flexDirection: 'row', paddingLeft: r % 2 ? u : 0 }}>
          {[0, 1, 2, 3].map((k) => (
            <View key={k} style={{ width: u * 1.6, height: u * 0.9, marginRight: u * 0.9, borderRadius: u, backgroundColor: fg, opacity: 0.28 }} />
          ))}
        </View>
      ));
    }
    return [0, 1, 2, 3, 4].map((i) => (
      <View
        key={i}
        style={{ position: 'absolute', bottom: 0, left: u * (0.8 + i * 1.9), width: u * 0.9, height: u * (2.5 + ((i * 7) % 4)), backgroundColor: fg, opacity: 0.28 }}
      />
    ));
  };
  return (
    <HardShadow radius={th.radius.md} style={undefined}>
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: bg,
          borderRadius: ninos ? th.radius.md : th.radius.sm,
          borderWidth: ninos ? th.stroke : 0,
          borderColor: th.colors.border,
          overflow: 'hidden',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {art !== undefined ? (
          <Image source={art} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : scene ? (
          <SvgXml xml={scene} width="100%" height="100%" />
        ) : (
          <>
            {motif()}
            <RNText
          style={{
            position: 'absolute',
            top: size * 0.06,
            left: size * 0.12,
            fontFamily: th.font.heading,
            fontWeight: '900',
            fontSize: size * 0.42,
            color: fg,
          }}
        >
              {initial}
            </RNText>
          </>
        )}
      </View>
    </HardShadow>
  );
}
