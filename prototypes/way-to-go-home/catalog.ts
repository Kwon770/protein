export const groups = [
  { id: 'all', name: '전체' },
  { id: 'utility', name: '기록과 코칭' },
  { id: 'mascot', name: '고양이와 보상' },
  { id: 'graphic', name: '진행률 시각화' },
  { id: 'rhythm', name: '하루와 일주일' },
] as const

export type Group = (typeof groups)[number]['id']

type Concept = {
  id: string
  title: string
  group: Exclude<Group, 'all'>
  description: string
  tray: string
}

export const concepts = [
  {
    id: 'focus',
    title: '숫자 하나',
    group: 'utility',
    description: '큰 링과 남은 양, 다음 행동 하나만 먼저 보여줍니다.',
    tray: '#f2e5dd',
  },
  {
    id: 'doodle',
    title: '낙서네 헬스장',
    group: 'mascot',
    description: '기록이 쌓일수록 덤벨을 드는 낙서 고양이가 기운을 냅니다.',
    tray: '#f7e9ca',
  },
  {
    id: 'shaker',
    title: '쉐이커 충전',
    group: 'graphic',
    description: '기록한 양만큼 반투명 쉐이커가 차오릅니다.',
    tray: '#dfe8d9',
  },
  {
    id: 'quick',
    title: '3초 기록',
    group: 'utility',
    description: '자주 먹는 음식을 손가락 가까이에 두고 한 번에 기록합니다.',
    tray: '#e9e1f4',
  },
  {
    id: 'photo',
    title: '밈 냉장고',
    group: 'mascot',
    description: '실사 고양이와 자석 메모, 음식 스티커를 냉장고에 붙입니다.',
    tray: '#e9ddd3',
  },
  {
    id: 'meals',
    title: '끼니별 기록',
    group: 'utility',
    description: '아침부터 저녁까지의 기록과 남은 끼니를 한 줄로 이어 봅니다.',
    tray: '#e5ece8',
  },
  {
    id: 'plate',
    title: '오늘의 단백질 접시',
    group: 'graphic',
    description: '접시 위의 진행률과 메뉴처럼 읽히는 빠른 기록을 함께 보여줍니다.',
    tray: '#f0ddce',
  },
  {
    id: 'sticker',
    title: '근육 적금',
    group: 'mascot',
    description: '오늘 쌓은 단백질과 이번 주 달성을 스티커 도장으로 남깁니다.',
    tray: '#f3e2e6',
  },
  {
    id: 'split',
    title: '고단백 듀오',
    group: 'utility',
    description: '기록한 양과 남은 양을 나란히 놓아 다음 행동을 분명하게 합니다.',
    tray: '#e7e7ce',
  },
  {
    id: 'receipt',
    title: '단백질 영수증',
    group: 'graphic',
    description: '끼니마다 추가한 양을 종이 영수증의 합계처럼 읽습니다.',
    tray: '#e4ded4',
  },
  {
    id: 'quest',
    title: '근육냥 퀘스트',
    group: 'mascot',
    description: '기록을 쌓아 휴대용 게임 속 고양이의 체력 게이지를 채웁니다.',
    tray: '#dce7c9',
  },
  {
    id: 'coach',
    title: '다음 한 끼',
    group: 'utility',
    description: '남은 g와 가까운 음식 조합을 바로 비교하고 기록합니다.',
    tray: '#e7e5d3',
  },
  {
    id: 'cockpit',
    title: '단백질 계기판',
    group: 'graphic',
    description: '스포츠 계기판처럼 진행률과 남은 양을 한눈에 확인합니다.',
    tray: '#dedfdd',
  },
  {
    id: 'comic',
    title: '헬스장 두 컷',
    group: 'mascot',
    description: '같은 고양이의 시작과 지금을 짧은 만화로 보여줍니다.',
    tray: '#f1dfca',
  },
  {
    id: 'blocks',
    title: '10g 단백질 블록',
    group: 'graphic',
    description: '단백질이 10g씩 모일 때마다 블록이 하나씩 채워집니다.',
    tray: '#e2e8f8',
  },
  {
    id: 'night',
    title: '저녁 체크인',
    group: 'rhythm',
    description: '하루를 마무리하며 기록과 남은 양을 부담 없이 돌아봅니다.',
    tray: '#e8dee0',
  },
  {
    id: 'week',
    title: '일주일의 리듬',
    group: 'rhythm',
    description: '주간 목표와 날짜별 기록을 오늘의 홈에 함께 놓습니다.',
    tray: '#e0e8d5',
  },
  {
    id: 'counter',
    title: '단백질 계수기',
    group: 'rhythm',
    description: '숫자를 더하고 빼는 조작을 홈 안에 두어 직접 입력을 빠르게 합니다.',
    tray: '#e8e4da',
  },
] as const satisfies readonly Concept[]
