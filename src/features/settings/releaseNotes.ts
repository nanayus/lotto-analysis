export type ReleaseNote = {
  changes: readonly {
    screen: string;
    summary: string;
  }[];
  date: string;
  delivery: 'app' | 'ota';
  id: string;
  revision?: number;
  version: string;
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: '1.0.2-ota-2026-09-06',
    version: '1.0.2',
    revision: 1,
    date: '2026.09.06',
    delivery: 'ota',
    changes: [
      {
        screen: '통계보기',
        summary: '과거 당첨 회차의 번호를 이전 기록과 비교하는 당첨번호 분석을 추가했습니다.',
      },
      {
        screen: '조합 비교',
        summary: '저장한 번호와 과거 당첨번호 중 두 조합을 골라 출현 기록과 형태를 나란히 비교할 수 있게 했습니다.',
      },
      {
        screen: '전체 번호 비교',
        summary: '번호순, 출현 순위순, 미출현 많은 순으로 1–45번 통계를 정렬할 수 있게 했습니다.',
      },
      {
        screen: '조건 선택',
        summary: '조건 영역을 펼치고 접을 때 내용이 잘리거나 높이가 어긋나는 현상을 수정했습니다.',
      },
      {
        screen: '업데이트 기록',
        summary: '같은 앱 버전에서 추가로 수정된 내역을 별도 버전 번호로 확인할 수 있게 했습니다.',
      },
    ],
  },
  {
    id: '1.0.2-app',
    version: '1.0.2',
    date: '2026.09.05',
    delivery: 'app',
    changes: [
      {
        screen: '조합 분석',
        summary: '새 조합 분석을 시작하면 이전 유입 화면과 관계없이 랜덤 채우기 없이 번호를 하나씩 선택하는 화면으로 이동하도록 수정했습니다.',
      },
    ],
  },
  {
    id: '1.0.1-app',
    version: '1.0.1',
    date: '2026.09.05',
    delivery: 'app',
    changes: [
      {
        screen: '조합 분석',
        summary: '통계보기에서 직접 번호를 고를 때 랜덤 채우기를 숨기고, 선택 해제가 바로 반영되도록 단순화했습니다.',
      },
      {
        screen: '조합 분석',
        summary: '직접 선택한 조합을 내번호에서 구분해 표시하고, 새 분석을 시작하면 빈 번호 선택 화면으로 돌아가도록 개선했습니다.',
      },
      {
        screen: '조합 분석 기록',
        summary: '일치 기록이 없을 때 선택한 기간과 등수에 맞는 안내를 표시하도록 개선했습니다.',
      },
      {
        screen: '조건 선택',
        summary: '조건을 기본·고급·직전 회차·과거 당첨 순서로 재구성하고 실행 버튼 문구를 더 명확하게 정리했습니다.',
      },
      {
        screen: '종합 통계',
        summary: '번호대 통계에서 조합 생성용 과거 등수 제외 설명을 제거했습니다.',
      },
      {
        screen: '앱 안정성',
        summary: 'iOS 네이티브 모듈 호환성을 위한 빌드 설정과 Expo 런타임 패키지를 업데이트했습니다.',
      },
    ],
  },
  {
    id: '1.0.0-app',
    version: '1.0.0',
    date: '2026.09.03',
    delivery: 'app',
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
