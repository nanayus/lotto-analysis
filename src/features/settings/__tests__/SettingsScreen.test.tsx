import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';

import { SettingsScreen } from '@/features/settings/SettingsScreen';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

describe('SettingsScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the app information and all display choices', async () => {
    const view = await render(<SettingsScreen />);

    expect(view.getByText('1.0.0')).toBeTruthy();
    fireEvent.press(view.getByText('디스플레이'));
    await waitFor(() => expect(view.getByText('밝은 UI')).toBeTruthy());
    expect(view.getByText('밝은 UI')).toBeTruthy();
    expect(view.getByText('어두운 UI')).toBeTruthy();
    expect(view.getAllByText('휴대폰 설정에 따라 바뀜')).toHaveLength(2);
    fireEvent.press(view.getByText('밝은 UI'));
    await waitFor(() => expect(view.queryByText('어두운 UI')).toBeNull());
  });

  it('opens the Wondly FAQ and privacy pages', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const view = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(view.getByText('FAQ'));
    });
    expect(openUrl).toHaveBeenCalledWith('https://wondly.net/#faq-title');

    await act(async () => {
      fireEvent.press(view.getByText('개인정보처리방침'));
    });
    expect(openUrl).toHaveBeenCalledWith('https://wondly.net/privacy');
  });
});
