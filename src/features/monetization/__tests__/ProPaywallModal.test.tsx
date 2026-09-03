import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { ProPaywallModal } from '../ProPaywallModal';

const packages = [
  {
    currencyCode: 'KRW',
    identifier: '$rc_annual',
    kind: 'annual' as const,
    price: 39000,
    priceString: '₩39,000',
    productIdentifier: 'lotto_pro_annual',
    title: '연간 Pro',
  },
  {
    currencyCode: 'KRW',
    identifier: '$rc_monthly',
    kind: 'monthly' as const,
    price: 4900,
    priceString: '₩4,900',
    productIdentifier: 'lotto_pro_monthly',
    title: '월간 Pro',
  },
];

describe('ProPaywallModal', () => {
  test('uses localized RevenueCat packages for purchase and restore actions', async () => {
    const onPurchase = jest.fn(async () => true);
    const onRestore = jest.fn(async () => true);
    const screen = await render(
      <ProPaywallModal
        error={null}
        isConfigured
        isWorking={false}
        onClose={jest.fn()}
        onPurchase={onPurchase}
        onRestore={onRestore}
        packages={packages}
        visible
      />,
    );

    expect(screen.getByText('₩39,000')).toBeTruthy();
    expect(screen.getByText('₩4,900')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: '월간 ₩4,900' }));
    });
    await act(async () => {
      await fireEvent.press(screen.getByText('월간 Pro 시작'));
    });
    expect(onPurchase).toHaveBeenCalledWith('$rc_monthly');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '구매 복원' }));
    });
    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});
