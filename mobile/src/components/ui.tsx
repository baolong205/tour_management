import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text as NativeText, TextInput, View, type TextProps, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSession } from '../context/session';
import { fonts, palette, radius, shadow, tracking } from '../theme';

/**
 * Bảng màu giữ nguyên tên khoá cũ để mọi màn hình đang import `colors` chạy tiếp,
 * nhưng giá trị đã đổi sang hệ editorial (kem – mực – nâu đất).
 */
export const colors = {
  primary: palette.accent,
  ink: palette.ink,
  muted: palette.muted,
  background: palette.cream,
  border: palette.line,
  danger: palette.errorInk,
  light: palette.sand,
  white: palette.white,
  price: palette.ink,
  navy: palette.ink,
  green: palette.successInk,
  accent: palette.accent,
  accentDark: palette.accentDark,
  sand: palette.sand,
  line: palette.line,
  cream: palette.cream,
  gold: palette.gold,
};

export function AppText(props: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: fonts.sans, color: palette.ink }, props.style]} />;
}
const Text = AppText;

/**
 * Khung màn hình dạng app: nội dung cuộn, có thể gắn thanh hành động dính đáy
 * (`footer`) để CTA luôn trong tầm ngón tay thay vì nằm cuối trang như web.
 */
export function Screen({ children, refresh, refreshing = false, padded = true, footer }: React.PropsWithChildren<{ refresh?: () => void; refreshing?: boolean; padded?: boolean; footer?: React.ReactNode }>) {
  const insets = useSafeAreaInsets();
  return <SafeAreaView style={s.screen} edges={['left', 'right']}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.content, !padded && s.flush, !!footer && { paddingBottom: 28 }]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.accent} colors={[palette.accent]} progressBackgroundColor={palette.cream} /> : undefined}
      >{children}</ScrollView>
      {!!footer && <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

/** Thanh tiêu đề lớn kiểu tạp chí nhưng căn trái theo nhịp app. */
export function Heading({ title, subtitle, eyebrow = 'TOURGO · HÀNH TRÌNH CỦA BẠN' }: { title: string; subtitle?: string; eyebrow?: string }) {
  return <View style={s.heading}>
    <View style={s.headingRule} />
    <Text style={s.eyebrow}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={s.title} numberOfLines={3}>{title}</Text>
    {!!subtitle && <Text style={s.headingCopy}>{subtitle}</Text>}
  </View>;
}

export function Card({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Title({ children }: React.PropsWithChildren) {
  return <Text accessibilityRole="header" style={s.sectionTitle}>{children}</Text>;
}

export function Copy({ children, muted = false }: React.PropsWithChildren<{ muted?: boolean }>) {
  return <Text style={[s.body, muted && s.muted]}>{children}</Text>;
}

export function Button({ title, onPress, busy = false, disabled = false, outline = false, danger = false, small = false, icon }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; outline?: boolean; danger?: boolean; small?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  const inactive = disabled || busy;
  const tint = danger ? palette.errorInk : palette.ink;
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: inactive, busy }}
    disabled={inactive}
    onPress={onPress}
    style={({ pressed }) => [
      s.button,
      small && s.smallButton,
      outline ? [s.outline, danger && { borderColor: palette.errorInk }] : { backgroundColor: tint },
      inactive && s.disabled,
      pressed && !inactive && (outline ? s.outlinePressed : s.pressed),
    ]}
  >
    {busy && <ActivityIndicator color={outline ? tint : palette.cream} />}
    {!!icon && !busy && <Ionicons name={icon} size={small ? 15 : 17} color={outline ? (danger ? palette.errorInk : palette.ink) : palette.cream} />}
    <Text style={[s.buttonText, outline && [s.outlineText, danger && { color: palette.errorInk }], small && s.smallButtonText]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      placeholderTextColor="#9c9285"
      accessibilityLabel={label}
      autoCapitalize="none"
      selectionColor={palette.accent}
      {...props}
      style={[s.input, props.multiline && s.textarea, props.editable === false && s.readonly, props.style]}
    />
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>;
}

export function Message({ text, error = false }: { text?: string | null; error?: boolean }) {
  if (!text) return null;
  return <View accessibilityRole={error ? 'alert' : undefined} style={[s.message, error ? s.errorMessage : s.noticeMessage]}>
    <Text style={[s.messageText, error ? s.errorText : s.noticeText]}>{text}</Text>
  </View>;
}

export function LoadState({ loading, error, retry, empty }: { loading: boolean; error?: string; retry?: () => void; empty?: string }) {
  if (loading) return <View style={s.state}><ActivityIndicator color={palette.accent} /><Text style={[s.body, s.muted]}>Đang tải dữ liệu...</Text></View>;
  if (error) return <Card><Message text={error} error />{retry && <Button title="Thử lại" outline onPress={retry} />}</Card>;
  return empty ? <View style={s.empty}><Text style={s.emptyText}>{empty}</Text></View> : null;
}

export function Row({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
  return <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, strong && s.strong]}>{value}</Text>
  </View>;
}

export function Badge({ children }: React.PropsWithChildren) {
  return <View style={s.badge}><Text style={s.badgeText}>{children}</Text></View>;
}

export function Chips({ items, value, onChange }: { items: { label: string; value: string }[]; value: string; onChange: (value: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{items.map(item => {
    const selected = value === item.value;
    return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={item.value} onPress={() => onChange(item.value)} style={({ pressed }) => [s.chip, selected && s.selectedChip, pressed && !selected && s.chipPressed]}>
      <Text style={[s.chipText, selected && s.selectedChipText]}>{item.label}</Text>
    </Pressable>;
  })}</ScrollView>;
}

/** Nhãn nhóm nội dung kiểu app: chữ nhỏ in hoa + đường kẻ mảnh, không cần tiêu đề serif lớn. */
export function SectionLabel({ children, action }: React.PropsWithChildren<{ action?: React.ReactNode }>) {
  return <View style={s.sectionLabel}>
    <Text style={s.sectionLabelText}>{children}</Text>
    {action}
  </View>;
}

/** Hàng danh sách kiểu app: icon vuông, nhãn, giá trị, mũi tên. Dùng cho tài khoản, cài đặt, liên kết. */
export function ListRow({ icon, label, value, hint, onPress, danger = false, last = false }: { icon?: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string; hint?: string; onPress?: () => void; danger?: boolean; last?: boolean }) {
  const content = <>
    {!!icon && <View style={[s.listIcon, danger && s.listIconDanger]}><Ionicons name={icon} size={17} color={danger ? palette.errorInk : palette.accentDark} /></View>}
    <View style={s.listCopy}>
      <Text style={[s.listLabel, danger && { color: palette.errorInk }]}>{label}</Text>
      {!!hint && <Text style={s.listHint}>{hint}</Text>}
    </View>
    {!!value && <Text style={s.listValue} numberOfLines={1}>{value}</Text>}
    {!!onPress && <Ionicons name="chevron-forward" size={16} color={palette.muted} />}
  </>;
  if (!onPress) return <View style={[s.listRow, !last && s.listRowLine]}>{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.listRow, !last && s.listRowLine, pressed && s.listRowPressed]}>{content}</Pressable>;
}

/** Bottom sheet dùng cho chọn ngày, chọn ưu đãi... — ngôn ngữ điều hướng của app, không phải web. */
export function Sheet({ open, onClose, title, children, footer }: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; footer?: React.ReactNode }>) {
  const insets = useSafeAreaInsets();
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={s.sheetRoot}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={s.sheetBackdrop} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHead}>
          <Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={s.sheetClose}><Ionicons name="close" size={20} color={palette.ink} /></Pressable>
        </View>
        <ScrollView style={s.sheetBody} contentContainerStyle={s.sheetBodyContent} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {!!footer && <View style={s.sheetFooter}>{footer}</View>}
      </View>
    </View>
  </Modal>;
}

/**
 * Khối tổng kết dùng trong thanh dính đáy.
 *
 * Bắt buộc phải co được (`flex: 1` + `minWidth: 0` ở cả khung ngoài lẫn khối chữ):
 * trong một hàng `flexDirection: 'row'`, React Native mặc định `flexShrink: 0`, nên nếu
 * khối này giữ nguyên bề ngang theo nội dung (nhãn + số tiền serif 26px + caption) thì
 * nó sẽ đẩy CTA nằm cùng hàng ra ngoài mép phải màn hình → nút "Xem giá" bị ẩn trên máy hẹp.
 */
export function FooterTotal({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return <View style={s.footerTotal}>
    <View style={s.footerTotalCopy}>
      <Text style={s.footerLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.footerValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
      {!!caption && <Text style={s.footerCaption} numberOfLines={1}>{caption}</Text>}
    </View>
  </View>;
}

export function LoginRequired({ next, children }: React.PropsWithChildren<{ next: string }>) {
  const { user, loading, error, reload } = useSession();
  if (loading) return <LoadState loading />;
  if (!user) return <Screen>
    <Heading title="Đăng nhập để tiếp tục" subtitle="Quản lý đơn đặt tour, thanh toán và thông tin hành trình trong tài khoản của bạn." eyebrow="TÀI KHOẢN TOURGO" />
    <Message text={error} error />
    <Button title="Đăng nhập / Đăng ký" onPress={() => router.push({ pathname: '/login', params: { next } })} />
    {!!error && <Button title="Kết nối lại" outline onPress={() => { void reload(); }} />}
  </Screen>;
  return <>{children}</>;
}

export function NavButton({ title, href }: { title: string; href: Href }) {
  return <Button title={title} outline onPress={() => router.push(href)} />;
}

export const layout = StyleSheet.create({
  gap: { gap: 12 },
  gapSm: { gap: 8 },
  horizontal: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grow: { flex: 1 },
  price: { color: palette.ink, fontFamily: fonts.serif, fontSize: 26 },
  image: { width: '100%', height: 230, borderRadius: radius.none, backgroundColor: palette.sand },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: palette.cream },
  content: { padding: 20, paddingBottom: 48, gap: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },
  flush: { padding: 0, paddingBottom: 0, gap: 0 },

  heading: { gap: 6, marginBottom: 4 },
  headingRule: { width: 40, height: 1, backgroundColor: palette.ink, marginBottom: 10 },
  eyebrow: { color: palette.accent, fontSize: 10, letterSpacing: tracking.eyebrow, fontWeight: '600' },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: palette.ink },
  headingCopy: { color: palette.muted, fontSize: 14, lineHeight: 23, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 29, color: palette.ink },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: palette.ink },
  muted: { color: palette.muted },

  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: radius.none, padding: 18, gap: 14 },
  button: { minHeight: 52, borderRadius: radius.none, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { fontFamily: fonts.sans, color: palette.cream, fontSize: 12, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', textAlign: 'center' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.ink },
  outlineText: { color: palette.ink },
  smallButton: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10 },
  smallButtonText: { fontSize: 11, letterSpacing: 1.2 },
  disabled: { opacity: 0.45 },
  pressed: { backgroundColor: palette.accent },
  outlinePressed: { backgroundColor: palette.ink },
  pressedText: { color: palette.cream },

  field: { gap: 8 },
  label: { fontFamily: fonts.sans, color: palette.muted, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  input: { minHeight: 52, borderWidth: 1, borderColor: palette.line, borderRadius: radius.none, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: palette.white, color: palette.ink, fontSize: 15, fontFamily: fonts.sans },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  readonly: { backgroundColor: palette.sand, color: palette.muted },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 19 },

  message: { borderRadius: radius.none, paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 2 },
  noticeMessage: { backgroundColor: palette.sand, borderLeftColor: palette.accent },
  messageText: { fontSize: 13, lineHeight: 21 },
  noticeText: { color: palette.accentDark },
  errorMessage: { backgroundColor: palette.errorBg, borderLeftColor: palette.errorInk },
  errorText: { color: palette.errorInk },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, gap: 12 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: palette.lineStrong, padding: 22, backgroundColor: 'transparent' },
  emptyText: { color: palette.muted, fontSize: 14, lineHeight: 23, fontFamily: fonts.sans },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 18, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: palette.line },
  rowLabel: { fontSize: 13, color: palette.muted, flex: 1 },
  rowValue: { fontSize: 14, color: palette.ink, fontWeight: '500', textAlign: 'right', flex: 1.4 },
  strong: { color: palette.ink, fontFamily: fonts.serif, fontSize: 22 },

  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.none, backgroundColor: palette.sand, borderWidth: 1, borderColor: palette.line, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, color: palette.accentDark, textTransform: 'uppercase' },

  chips: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  chip: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.none, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  chipPressed: { borderColor: palette.accent },
  selectedChip: { borderColor: palette.ink, backgroundColor: palette.ink },
  chipText: { color: palette.muted, fontSize: 11, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
  selectedChipText: { color: palette.cream },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 2 },
  sectionLabelText: { fontSize: 10, fontWeight: '600', letterSpacing: tracking.eyebrow, textTransform: 'uppercase', color: palette.accent },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 12, paddingHorizontal: 2 },
  listRowLine: { borderBottomWidth: 1, borderBottomColor: palette.line },
  listRowPressed: { opacity: 0.6 },
  listIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.sand, borderWidth: 1, borderColor: palette.line },
  listIconDanger: { backgroundColor: palette.errorBg, borderColor: palette.errorBg },
  listCopy: { flex: 1, gap: 2 },
  listLabel: { fontSize: 14, color: palette.ink, fontWeight: '500' },
  listHint: { fontSize: 12, color: palette.muted, lineHeight: 18 },
  listValue: { fontSize: 13, color: palette.muted, maxWidth: '48%', textAlign: 'right' },

  footer: { borderTopWidth: 1, borderTopColor: palette.line, backgroundColor: palette.cream, paddingHorizontal: 18, paddingTop: 12, gap: 10, ...shadow.bar },
  footerTotal: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  footerTotalCopy: { flex: 1, minWidth: 0 },
  footerLabel: { fontSize: 9, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.muted },
  footerValue: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, color: palette.ink, flexShrink: 1 },
  footerCaption: { fontSize: 11, color: palette.muted, marginTop: 2 },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#211d18aa' },
  sheet: { backgroundColor: palette.cream, borderTopWidth: 2, borderTopColor: palette.ink, paddingHorizontal: 20, paddingTop: 10, maxHeight: '86%' },
  sheetHandle: { alignSelf: 'center', width: 44, height: 3, backgroundColor: palette.lineStrong, marginBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12 },
  sheetTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: palette.ink },
  sheetClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  sheetBodyContent: { gap: 14, paddingBottom: 12 },
  sheetFooter: { gap: 10, paddingTop: 12 },
});
