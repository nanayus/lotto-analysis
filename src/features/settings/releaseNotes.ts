export const RELEASE_NOTES_VIEWER_EMAIL = 'ynleesss@gmail.com';

export type ReleaseNote = {
  changes: readonly {
    screen: string;
    summary: string;
  }[];
  date: string;
  version: string;
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '0.0.1',
    date: '2026.09.03',
    changes: [
      {
        screen: '번호뽑기 홈',
        summary: '조건 뽑기 카드를 더 간결하게 다듬고 메인 기능의 시각적 우선순위를 정리했습니다.',
      },
      {
        screen: '번호뽑기 홈',
        summary: '최신 당첨번호와 다음 추첨까지 남은 시간을 보여주는 상태 패널을 추가했습니다.',
      },
      {
        screen: '번호뽑기 홈',
        summary: '카운트다운 숫자에 롤링 애니메이션을 적용하고 당첨번호 공의 가독성을 높였습니다.',
      },
      {
        screen: '환경설정',
        summary: '관리자 계정에서 버전별 변경 내역을 한 페이지로 확인할 수 있게 했습니다.',
      },
    ],
  },
];

export function canViewReleaseNotes(email: string | null | undefined) {
  return email?.trim().toLowerCase() === RELEASE_NOTES_VIEWER_EMAIL;
}
