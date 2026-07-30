/**
 * @deprecated Legacy hex map — do not extend.
 * Use semantic tokens in `src/index.css` (Bold CRM):
 * `bg-primary`, `text-success`, `var(--module-*)`, etc.
 */

export const colors = {
  // Primary colors - Blue palette
  primary: {
    50: '#EBF2FF',
    100: '#D0DFFE',
    200: '#A1BFFD',
    300: '#729EFC',
    400: '#437EFB',
    500: '#0B5FFA', // Primary action color
    600: '#0850D6',
    700: '#0642B0',
    800: '#05338A',
    900: '#032566',
  },

  // Secondary colors - Darker blue for emphasis
  secondary: {
    50: '#E8F1FF',
    100: '#CCDAFF',
    200: '#99B5FF',
    300: '#6690FF',
    400: '#336BFF',
    500: '#0046CC', // Secondary color
    600: '#0038A3',
    700: '#002A7A',
    800: '#001C52',
    900: '#000D29',
  },

  // Surface fills only (not text). Text law: black / white / bold color — never gray.
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#0B0B14', // was gray mid — remapped to black for any accidental text use
    500: '#0B0B14',
    600: '#0B0B14', // Default text color (black)
    700: '#0B0B14',
    800: '#0B0B14',
    900: '#0B0B14',
  },

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Semantic aliases — no gray secondary/tertiary text
  text: {
    primary: '#0B0B14', // black body
    secondary: '#0369A1', // bold Azure (matches --muted-foreground intent)
    tertiary: '#0369A1', // same bold Azure — never gray
    inverse: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    dark: '#0B0B14',
  },
  border: '#E5E7EB',
  focus: '#0B5FFA',
  hover: '#F3F4F6',
  active: '#E5E7EB',
} as const;

export type Colors = typeof colors;
