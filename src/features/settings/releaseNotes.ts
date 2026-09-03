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
    version: '1.0.0',
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
        summary: '버전별 변경 내역을 한 페이지에서 확인할 수 있게 했습니다.',
      },
      {
        screen: '환경설정',
        summary: '계정 연결 기능을 사용하지 않을 때도 익명 이용 정보 삭제 메뉴를 확인할 수 있게 했습니다.',
      },
      {
        screen: '개인정보',
        summary: '앱에서 처리하는 익명 식별자와 이용 기록, 데이터 삭제 방법을 공개 정책에 명확히 안내했습니다.',
      },
    ],
  },
];
