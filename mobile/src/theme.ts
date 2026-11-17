import { Platform } from 'react-native';

/**
 * Design tokens lấy từ hệ editorial của website (docs/PHONG-CACH-EDITORIAL.md).
 * Giữ đúng tinh thần: nền kem, mực đen ấm, một accent nâu đất, góc vuông,
 * tiêu đề serif, nhãn in hoa giãn chữ.
 */
export const palette = {
  ink: '#211d18',
  inkSoft: '#3a332b',
  muted: '#6f675c',
  cream: '#fbf8f3',
  sand: '#efe8dc',
  sandDeep: '#e6dccb',
  line: '#e3dccf',
  lineStrong: '#cfc4b1',
  accent: '#a9693f',
  accentDark: '#8c5430',
  gold: '#f0d9b5',
  white: '#ffffff',
  successBg: '#dfe8d6',
  successInk: '#4b6a38',
  warnBg: '#f3e4c6',
  warnInk: '#8c5430',
  errorBg: '#f1d9d3',
  errorInk: '#9a4a3b',
} as const;

/**
 * Chỉ dùng font hệ thống phổ biến của mobile, không nạp font ngoài:
 * - Android: Roboto (`sans-serif`, `sans-serif-medium`) — phủ đủ glyph tiếng Việt.
 * - iOS: SF (`System`) cho nội dung, Georgia cho tiêu đề.
 * - Web: Times New Roman / system-ui. Georgia trên Windows thiếu một số glyph
 *   tiếng Việt, khiến trình duyệt trộn font trong cùng từ và tách rời dấu.
 *
 * Tuyệt đối không dùng họ `serif` của Android: Noto Serif trên nhiều máy thiếu
 * glyph tiếng Việt dựng sẵn nên dấu bị tách rời (miền → miè` n, bắt đầu → bă´ t đà`u).
 */
export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'sans-serif-medium', default: '"Times New Roman", serif' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, monospace' }) as string,
};

/**
 * `display` phải bằng 0: letterSpacing âm làm Android tách rời dấu tiếng Việt
 * (bă´ t đà`u, Hoàn tâ´ t). Không dùng giá trị âm cho chữ tiêu đề.
 */
export const tracking = { label: 1.6, eyebrow: 2.4, display: 0 } as const;

/** Góc vuông là quy tắc: chỉ dùng 0 hoặc 2px cho phần tử nhỏ bên trong. */
export const radius = { none: 0, hair: 2 } as const;

export const shadow = {
  panel: {
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  /** Thanh hành động dính đáy màn hình – đổ bóng nhẹ để tách khỏi nội dung cuộn. */
  bar: {
    shadowColor: palette.ink,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
} as const;
