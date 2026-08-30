export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceAccent: string;
  surfaceDanger: string;
  surfaceSuccess: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  accentBorder: string;
  accentPrimary: string;
  accentActive: string;
  accentDisabled: string;
  accentSecondary: string;
  hot: string;
  neutral: string;
  cold: string;
  highlight: string;
  textTertiary: string;
  borderStrong: string;
  cardShadow: string;
  backdrop: string;
  backdropStrong: string;
};

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1D1D1F',
  surfaceElevated: '#272729',
  surfaceAccent: '#102A43',
  surfaceDanger: '#33191E',
  surfaceSuccess: '#17332E',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#8E8E93',
  divider: '#333336',
  borderStrong: '#48484A',
  accentBorder: '#2997FF',
  accentPrimary: '#2997FF',
  accentActive: '#0071E3',
  accentDisabled: '#26384A',
  accentSecondary: '#2997FF',
  hot: '#FF6B81',
  neutral: '#8E8E93',
  cold: '#2997FF',
  highlight: '#FFFFFF',
  cardShadow: 'none',
  backdrop: '#00000080',
  backdropStrong: '#03040AAA',
};

export const lightColors: ThemeColors = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFC',
  surfaceAccent: '#EAF3FC',
  surfaceDanger: '#FFF1F3',
  surfaceSuccess: '#EFF8F5',
  textPrimary: '#1D1D1F',
  textSecondary: '#333333',
  textTertiary: '#7A7A7A',
  divider: '#F0F0F0',
  borderStrong: '#E0E0E0',
  accentBorder: '#0071E3',
  accentPrimary: '#0066CC',
  accentActive: '#0071E3',
  accentDisabled: '#D2D2D7',
  accentSecondary: '#0066CC',
  hot: '#C7475F',
  neutral: '#7A7A7A',
  cold: '#0066CC',
  highlight: '#1D1D1F',
  cardShadow: 'none',
  backdrop: '#11152266',
  backdropStrong: '#11152299',
};

/** @deprecated Use useAppTheme() or useThemedStyles() in rendered UI. */
export const colors = darkColors;
