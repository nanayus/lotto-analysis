import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';

import { ReleaseNotesScreen } from '@/features/settings/ReleaseNotesScreen';

const mockBack = router.back as jest.Mock;

describe('ReleaseNotesScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('shows all screen-by-screen changes to every viewer', async () => {
    const view = await render(<ReleaseNotesScreen />);

    expect(view.getByText('버전 1.0.2 · 추가 업데이트')).toBeTruthy();
    expect(view.getByText('버전 1.0.2')).toBeTruthy();
    expect(view.getByText(/추가로 수정된 내역을 별도 버전 번호/)).toBeTruthy();
    expect(view.getByText('버전 1.0.0')).toBeTruthy();
    expect(view.getAllByText('번호뽑기 홈')).toHaveLength(3);
    expect(view.getAllByText('환경설정')).toHaveLength(2);
    expect(view.getByText(/당첨번호 공의 가독성을 높였습니다/)).toBeTruthy();

    await fireEvent.press(view.getByLabelText('이전 화면으로 돌아가기'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
