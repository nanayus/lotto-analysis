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
  accentSecondary: string;
  hot: string;
  neutral: string;
  cold: string;
  highlight: string;
  backdrop: string;
  backdropStrong: string;
};

export const darkColors: ThemeColors = {
  background: '#080A12',
  surface: '#111522',
  surfaceElevated: '#171C2A',
  surfaceAccent: '#252E6D',
  surfaceDanger: '#351623',
  surfaceSuccess: '#123431',
  textPrimary: '#F5F7FA',
  textSecondary: '#7D8597',
  divider: '#202636',
  accentBorder: '#35408A',
  accentPrimary: '#7C8CFF',
  accentSecondary: '#42D6C7',
  hot: '#FF6B81',
  neutral: '#8D96A8',
  cold: '#59B8FF',
  highlight: '#DCE2FF',
  backdrop: '#00000080',
  backdropStrong: '#03040AAA',
};

export const lightColors: ThemeColors = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF1F7',
  surfaceAccent: '#E8EBFF',
  surfaceDanger: '#FCECEF',
  surfaceSuccess: '#E6F5F2',
  textPrimary: '#111522',
  textSecondary: '#667085',
  divider: '#DDE2EC',
  accentBorder: '#AEB8EF',
  accentPrimary: '#5364D9',
  accentSecondary: '#087F75',
  hot: '#C7475F',
  neutral: '#697386',
  cold: '#2479AE',
  highlight: '#33415F',
  backdrop: '#11152266',
  backdropStrong: '#11152299',
};

/** @deprecated Use useAppTheme() or useThemedStyles() in rendered UI. */
export const colors = darkColors;
