import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { ReferralCodeOnboardingModal } from '../ReferralCodeOnboardingModal';

describe('ReferralCodeOnboardingModal', () => {
  test('accepts a referral code only during the first-run prompt', async () => {
    const onApply = jest.fn();
    const screen = await render(
      <ReferralCodeOnboardingModal
        error={null}
        isApplying={false}
        onApply={onApply}
        onSkip={jest.fn()}
        requiresLogin
        visible
      />,
    );

    const applyButton = screen.getByRole('button', { name: '로그인하고 등록' });
    expect(applyButton.props.accessibilityState?.disabled ?? applyButton.props.disabled).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('친구에게 받은 초대 코드'), 'abcd1234');
    });
    await waitFor(() => expect(screen.getByDisplayValue('ABCD1234')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '로그인하고 등록' }));
    });

    expect(onApply).toHaveBeenCalledWith('ABCD1234');
  });

  test('allows the user to permanently skip referral entry', async () => {
    const onSkip = jest.fn();
    const screen = await render(
      <ReferralCodeOnboardingModal
        error={null}
        isApplying={false}
        onApply={jest.fn()}
        onSkip={onSkip}
        requiresLogin={false}
        visible
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: '초대 코드 없이 시작' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
