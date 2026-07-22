import { createHash } from 'node:crypto';

const CATEGORY_INGREDIENTS = {
  VEGETABLE: [
    '대파', '쪽파', '양파', '마늘', '감자', '고구마', '당근', '무', '배추', '양배추',
    '상추', '깻잎', '시금치', '콩나물', '숙주', '애호박', '주키니', '가지', '오이',
    '청양고추', '풋고추', '홍고추', '파프리카', '브로콜리', '버섯', '표고버섯', '팽이버섯',
    '새송이버섯', '느타리버섯', '부추', '미나리', '연근', '우엉', '토마토',
    '방울토마토', '셀러리', '아스파라거스', '케일', '청경채', '단호박', '옥수수'
  ],
  FRUIT: [
    '사과', '배', '바나나', '딸기', '포도', '수박', '참외', '복숭아', '자두', '감',
    '귤', '오렌지', '레몬', '라임', '자몽', '키위', '파인애플', '망고', '블루베리',
    '라즈베리', '체리', '아보카도', '멜론', '석류', '무화과', '코코넛'
  ],
  MEAT: [
    '소고기', '불고기용 소고기', '국거리 소고기', '다진 소고기', '돼지고기', '삼겹살',
    '목살', '앞다리살', '다진 돼지고기', '닭고기', '닭가슴살', '닭다리', '닭날개',
    '오리고기', '양고기', '베이컨', '소시지', '햄', '차돌박이', '갈비', '돼지갈비',
    '소갈비', '안심', '등심', '사태', '장조림용 소고기'
  ],
  SEAFOOD: [
    '고등어', '삼치', '갈치', '연어', '참치', '참치캔', '오징어', '낙지', '주꾸미',
    '문어', '새우', '꽃게', '대게', '조개', '바지락', '홍합', '굴', '전복', '멸치',
    '북어', '황태', '미역', '다시마', '김', '진미채', '명란', '어묵'
  ],
  EGG_DAIRY: [
    '달걀', '메추리알', '우유', '저지방우유', '두유', '생크림', '휘핑크림', '버터',
    '무염버터', '치즈', '슬라이스치즈', '모차렐라치즈', '체다치즈', '파르메산치즈',
    '요거트', '그릭요거트', '연유', '분유', '사워크림', '크림치즈', '마가린', '아이스크림'
  ],
  GRAIN: [
    '쌀', '현미', '찹쌀', '보리', '귀리', '퀴노아', '콩', '검은콩', '팥', '녹두',
    '병아리콩', '렌틸콩', '밀가루', '부침가루', '튀김가루', '빵가루', '전분',
    '옥수수전분', '오트밀', '누룽지', '깨', '참깨', '들깨', '땅콩'
  ],
  NOODLE: [
    '소면', '중면', '칼국수면', '우동면', '냉면', '쫄면', '당면', '라면', '라이스페이퍼',
    '스파게티면', '파스타면', '펜네', '푸실리', '메밀면', '국수', '수제비', '떡국떡',
    '떡볶이떡', '곤약면', '두부면', '쌀국수면', '라자냐면'
  ],
  SEASONING: [
    '소금', '후추', '설탕', '황설탕', '올리고당', '꿀', '식초', '맛술', '청주', '고춧가루',
    '카레가루', '계피가루', '마늘가루', '생강가루', '깨소금', '들깨가루', '다시다',
    '치킨스톡', '멸치육수팩', '가쓰오부시', '베이킹파우더', '바닐라에센스', '월계수잎',
    '오레가노', '바질', '파슬리', '로즈마리'
  ],
  SAUCE: [
    '간장', '진간장', '국간장', '양조간장', '고추장', '된장', '쌈장', '초고추장',
    '참기름', '들기름', '식용유', '올리브유', '굴소스', '액젓', '멸치액젓', '까나리액젓',
    '케첩', '마요네즈', '머스터드', '돈가스소스', '짜장소스', '토마토소스', '크림소스',
    '페스토', '핫소스', '칠리소스', '데리야키소스', '피시소스'
  ],
  BEVERAGE: [
    '생수', '탄산수', '콜라', '사이다', '오렌지주스', '사과주스', '포도주스', '토마토주스',
    '커피', '원두커피', '인스턴트커피', '녹차', '홍차', '보리차', '옥수수차', '코코아',
    '에너지드링크', '이온음료', '맥주', '소주', '와인', '막걸리'
  ],
  PROCESSED: [
    '두부', '순두부', '연두부', '김치', '깍두기', '단무지', '피클', '밥', '햇반', '만두',
    '떡', '유부', '곤약', '묵', '참치통조림', '고등어통조림', '옥수수통조림', '콩통조림',
    '토마토통조림', '골뱅이통조림', '스팸', '닭가슴살캔', '누텔라', '잼', '땅콩버터',
    '김자반', '조미김', '육수', '사골곰탕', '카레', '짜장', '김치볶음', '샐러드채소'
  ],
  FROZEN: [
    '냉동만두', '냉동새우', '냉동오징어', '냉동대패삼겹살', '냉동닭가슴살', '냉동감자튀김',
    '냉동피자', '냉동볶음밥', '냉동블루베리', '냉동딸기', '냉동망고', '냉동옥수수',
    '냉동완두콩', '냉동브로콜리', '냉동시금치', '냉동우동', '냉동떡', '냉동핫도그',
    '냉동돈가스', '냉동치킨', '냉동생선', '냉동해물믹스'
  ],
  BAKERY: [
    '식빵', '통밀식빵', '바게트', '모닝빵', '베이글', '크루아상', '또띠아', '핫도그빵',
    '햄버거번', '잉글리시머핀', '케이크', '카스텔라', '마들렌', '쿠키', '크래커',
    '그래놀라', '시리얼', '팬케이크믹스', '와플믹스', '호떡믹스'
  ],
  OTHER: [
    '물', '얼음', '잣', '호두', '아몬드', '캐슈넛', '피스타치오', '해바라기씨', '건포도',
    '건크랜베리', '대추', '건표고버섯', '말린무화과', '김가루', '코코넛가루', '한천',
    '젤라틴', '프로틴파우더', '비타민', '식용색소', '춘장', '김치양념'
  ]
};

const CATEGORY_DEFAULTS = {
  VEGETABLE: ['COUNTABLE', '개', 7, 30, null],
  FRUIT: ['COUNTABLE', '개', 10, 60, null],
  MEAT: ['MEASURABLE', 'g', 3, 90, null],
  SEAFOOD: ['MEASURABLE', 'g', 2, 60, null],
  EGG_DAIRY: ['LEVEL', null, 7, 30, null],
  GRAIN: ['LEVEL', null, null, null, 180],
  NOODLE: ['COUNTABLE', '봉', 14, 90, 180],
  SEASONING: ['LEVEL', null, null, null, 365],
  SAUCE: ['LEVEL', null, 90, null, 180],
  BEVERAGE: ['COUNTABLE', '병', 7, 90, 180],
  PROCESSED: ['COUNTABLE', '개', 7, 60, 180],
  FROZEN: ['COUNTABLE', '봉', null, 180, null],
  BAKERY: ['COUNTABLE', '개', 4, 30, 7],
  OTHER: ['COUNTABLE', '개', 30, 180, 180]
};

const EXPLICIT_ALIASES = {
  달걀: ['계란', '에그', '달걀한판'],
  대파: ['파', '큰파', '장파'],
  쪽파: ['실파', '잔파'],
  간장: ['조선간장', 'soy sauce'],
  진간장: ['진장'],
  닭가슴살: ['닭가슴', '치킨브레스트'],
  소고기: ['쇠고기', '우육'],
  돼지고기: ['돈육', '돼지'],
  고춧가루: ['고추가루'],
  우유: ['밀크', '흰우유'],
  요거트: ['요구르트', '요쿠르트'],
  파프리카: ['피망'],
  방울토마토: ['체리토마토'],
  참치캔: ['캔참치', '통조림참치'],
  참치통조림: ['참치캔통조림'],
  스파게티면: ['스파게티', '파스타누들'],
  파스타면: ['파스타', '이탈리안면'],
  김치: ['배추김치', '포기김치'],
  애호박: ['조선호박'],
  표고버섯: ['표고'],
  팽이버섯: ['팽이'],
  새송이버섯: ['큰느타리버섯'],
  모차렐라치즈: ['모짜렐라치즈', '모짜치즈'],
  떡볶이떡: ['떡볶이용떡'],
  떡국떡: ['떡국용떡'],
  소면: ['잔치국수면'],
  우동면: ['우동사리'],
  당면: ['잡채면'],
  된장: ['된장소스'],
  고추장: ['고추장소스'],
  참기름: ['sesame oil'],
  식용유: ['요리유'],
  올리브유: ['올리브오일'],
  '다진 소고기': ['소고기민찌'],
  '다진 돼지고기': ['돼지고기민찌'],
  오징어: ['생오징어'],
  북어: ['북어포'],
  황태: ['황태채'],
  진미채: ['오징어채'],
  어묵: ['오뎅'],
  메추리알: ['메추리계란'],
  생크림: ['프레시크림'],
  연유: ['콘덴스밀크'],
  현미: ['현미쌀'],
  찹쌀: ['찰쌀'],
  밀가루: ['중력분'],
  전분: ['녹말'],
  후추: ['후춧가루'],
  올리고당: ['요리당'],
  맛술: ['미림'],
  액젓: ['어간장'],
  케첩: ['토마토케첩'],
  마요네즈: ['마요'],
  생수: ['먹는물'],
  탄산수: ['스파클링워터'],
  두부: ['부침두부', '찌개두부'],
  순두부: ['연한두부'],
  단무지: ['노란무절임'],
  스팸: ['런천미트'],
  식빵: ['토스트빵'],
  또띠아: ['토르티야'],
  얼음: ['아이스큐브']
};

const PARENT_NAMES = {
  '불고기용 소고기': '소고기',
  '국거리 소고기': '소고기',
  '다진 소고기': '소고기',
  '장조림용 소고기': '소고기',
  '닭가슴살': '닭고기',
  '닭다리': '닭고기',
  '닭날개': '닭고기',
  '삼겹살': '돼지고기',
  '목살': '돼지고기',
  '앞다리살': '돼지고기',
  '다진 돼지고기': '돼지고기',
  '돼지갈비': '돼지고기',
  '소갈비': '소고기',
  '저지방우유': '우유',
  '무염버터': '버터',
  '슬라이스치즈': '치즈',
  '모차렐라치즈': '치즈',
  '체다치즈': '치즈',
  '파르메산치즈': '치즈',
  '스파게티면': '파스타면',
  '펜네': '파스타면',
  '푸실리': '파스타면'
};

const SUBSTITUTIONS = [
  ['간장', '진간장', true, '짠맛을 확인하며 양을 조절'],
  ['대파', '쪽파', true, '향과 식감이 다르므로 마무리 양을 조절'],
  ['스파게티면', '파스타면', true, '면 종류에 맞게 삶는 시간을 조절'],
  ['식용유', '올리브유', true, '고온 조리 시 발연점을 확인'],
  ['설탕', '올리고당', true, '수분과 단맛 차이를 고려'],
  ['멸치액젓', '까나리액젓', true, '염도가 달라 소량부터 사용'],
  ['부침가루', '밀가루', false, '소금과 전분을 별도로 보충'],
  ['생크림', '우유', false, '농도가 묽어질 수 있음'],
  ['애호박', '주키니', true, '수분 차이를 고려'],
  ['청양고추', '풋고추', false, '매운맛이 약해짐']
];

const RECIPE_SPECS = [
  ['된장찌개', ['된장', '두부', '애호박', '대파']],
  ['김치찌개', ['김치', '돼지고기', '두부', '대파']],
  ['순두부찌개', ['순두부', '달걀', '고춧가루', '대파']],
  ['부대찌개', ['김치', '햄', '소시지', '두부']],
  ['미역국', ['미역', '소고기', '국간장', '참기름']],
  ['소고기무국', ['소고기', '무', '국간장', '대파']],
  ['북엇국', ['북어', '달걀', '무', '대파']],
  ['콩나물국', ['콩나물', '대파', '마늘', '소금']],
  ['계란국', ['달걀', '대파', '국간장', '물']],
  ['떡국', ['떡국떡', '달걀', '대파', '김']],
  ['제육볶음', ['돼지고기', '고추장', '양파', '대파']],
  ['소불고기', ['불고기용 소고기', '간장', '양파', '대파']],
  ['닭볶음탕', ['닭고기', '감자', '고추장', '당근']],
  ['찜닭', ['닭고기', '간장', '당면', '감자']],
  ['오징어볶음', ['오징어', '고추장', '양파', '대파']],
  ['낙지볶음', ['낙지', '고춧가루', '양파', '대파']],
  ['두부조림', ['두부', '간장', '고춧가루', '대파']],
  ['감자조림', ['감자', '간장', '올리고당', '깨']],
  ['연근조림', ['연근', '간장', '올리고당', '깨']],
  ['소고기장조림', ['장조림용 소고기', '간장', '달걀', '마늘']],
  ['김치볶음밥', ['밥', '김치', '달걀', '대파']],
  ['새우볶음밥', ['밥', '새우', '달걀', '대파']],
  ['계란볶음밥', ['밥', '달걀', '대파', '간장']],
  ['비빔밥', ['밥', '콩나물', '시금치', '고추장']],
  ['콩나물밥', ['쌀', '콩나물', '간장', '참기름']],
  ['참치주먹밥', ['밥', '참치캔', '김', '마요네즈']],
  ['카레라이스', ['밥', '카레가루', '감자', '당근']],
  ['짜장밥', ['밥', '짜장소스', '양파', '돼지고기']],
  ['오므라이스', ['밥', '달걀', '케첩', '양파']],
  ['참치마요덮밥', ['밥', '참치캔', '마요네즈', '김']],
  ['잔치국수', ['소면', '대파', '달걀', '김']],
  ['비빔국수', ['소면', '고추장', '오이', '김치']],
  ['칼국수', ['칼국수면', '애호박', '감자', '대파']],
  ['수제비', ['수제비', '감자', '애호박', '대파']],
  ['물냉면', ['냉면', '오이', '달걀', '무']],
  ['라볶이', ['라면', '떡볶이떡', '고추장', '어묵']],
  ['떡볶이', ['떡볶이떡', '고추장', '어묵', '대파']],
  ['김치말이국수', ['소면', '김치', '오이', '식초']],
  ['들깨칼국수', ['칼국수면', '들깨가루', '버섯', '대파']],
  ['유부우동', ['우동면', '유부', '대파', '간장']],
  ['계란말이', ['달걀', '대파', '당근', '소금']],
  ['계란찜', ['달걀', '대파', '물', '소금']],
  ['김치전', ['김치', '부침가루', '달걀', '대파']],
  ['부추전', ['부추', '부침가루', '달걀', '양파']],
  ['감자전', ['감자', '전분', '소금', '식용유']],
  ['해물파전', ['쪽파', '냉동해물믹스', '부침가루', '달걀']],
  ['두부부침', ['두부', '식용유', '간장', '대파']],
  ['애호박전', ['애호박', '달걀', '밀가루', '소금']],
  ['고등어구이', ['고등어', '소금', '식용유']],
  ['삼치구이', ['삼치', '소금', '식용유']],
  ['갈치조림', ['갈치', '무', '간장', '고춧가루']],
  ['고등어조림', ['고등어', '무', '간장', '고춧가루']],
  ['연어스테이크', ['연어', '올리브유', '레몬', '소금']],
  ['닭가슴살구이', ['닭가슴살', '올리브유', '후추', '소금']],
  ['삼겹살구이', ['삼겹살', '마늘', '상추', '쌈장']],
  ['보쌈', ['앞다리살', '된장', '마늘', '배추']],
  ['돼지불백', ['돼지고기', '간장', '양파', '대파']],
  ['닭갈비', ['닭다리', '고추장', '양배추', '고구마']],
  ['닭강정', ['닭가슴살', '튀김가루', '고추장', '올리고당']],
  ['잡채', ['당면', '소고기', '시금치', '당근']],
  ['콩나물무침', ['콩나물', '대파', '참기름', '깨']],
  ['시금치무침', ['시금치', '간장', '참기름', '깨']],
  ['오이무침', ['오이', '고춧가루', '식초', '대파']],
  ['무생채', ['무', '고춧가루', '식초', '대파']],
  ['가지볶음', ['가지', '간장', '대파', '마늘']],
  ['애호박볶음', ['애호박', '새우', '대파', '참기름']],
  ['멸치볶음', ['멸치', '간장', '올리고당', '깨']],
  ['진미채볶음', ['진미채', '고추장', '마요네즈', '올리고당']],
  ['감자채볶음', ['감자', '당근', '양파', '소금']],
  ['햄치즈샌드위치', ['식빵', '햄', '슬라이스치즈', '상추']],
  ['프렌치토스트', ['식빵', '달걀', '우유', '버터']],
  ['토마토파스타', ['스파게티면', '토마토소스', '마늘', '올리브유']],
  ['크림파스타', ['파스타면', '생크림', '마늘', '베이컨']],
  ['알리오올리오', ['스파게티면', '마늘', '올리브유', '청양고추']],
  ['감바스', ['새우', '마늘', '올리브유', '바게트']],
  ['치킨샐러드', ['닭가슴살', '샐러드채소', '방울토마토', '올리브유']],
  ['두부샐러드', ['두부', '샐러드채소', '방울토마토', '간장']],
  ['과일요거트', ['요거트', '바나나', '딸기', '블루베리']],
  ['바나나스무디', ['바나나', '우유', '꿀', '얼음']],
  ['딸기스무디', ['딸기', '우유', '꿀', '얼음']],
  ['김치우동', ['우동면', '김치', '어묵', '대파']],
  ['어묵탕', ['어묵', '무', '대파', '간장']],
  ['만둣국', ['만두', '달걀', '대파', '김']],
  ['닭죽', ['쌀', '닭가슴살', '당근', '참기름']],
  ['야채죽', ['쌀', '당근', '애호박', '버섯']],
  ['전복죽', ['쌀', '전복', '참기름', '당근']],
  ['토마토달걀볶음', ['토마토', '달걀', '대파', '소금']],
  ['마파두부', ['두부', '다진 돼지고기', '고추장', '대파']],
  ['소시지야채볶음', ['소시지', '양파', '파프리카', '케첩']],
  ['연두부간장', ['연두부', '간장', '대파', '참기름']],
  ['아보카도토스트', ['식빵', '아보카도', '달걀', '소금']]
];

function stableUuid(namespace, value) {
  const hex = createHash('sha256').update(`${namespace}:${value}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function recipeSteps(name) {
  if (/(국|찌개|탕|죽|수제비|칼국수|떡국|만둣국)$/u.test(name)) {
    return [`${name} 재료를 먹기 좋은 크기로 손질한다.`, '육수 또는 물에 단단한 재료부터 익힌다.', '간을 맞추고 마지막 재료를 넣어 한소끔 끓인다.'];
  }
  if (/(볶음|불고기|잡채|라볶이|떡볶이|파스타|알리오올리오)$/u.test(name)) {
    return ['재료를 손질하고 양념을 미리 섞는다.', '팬을 달군 뒤 익는 데 오래 걸리는 재료부터 볶는다.', '양념과 남은 재료를 넣고 고르게 익혀 마무리한다.'];
  }
  if (/(전|부침|토스트|샌드위치)$/u.test(name)) {
    return ['재료와 반죽 또는 달걀물을 준비한다.', '중약불로 앞뒤를 고르게 익힌다.', '기름을 제거하고 먹기 좋은 크기로 담는다.'];
  }
  if (/(구이|스테이크|보쌈|닭강정)$/u.test(name)) {
    return ['재료의 물기를 제거하고 밑간한다.', '속까지 익도록 온도를 조절하며 조리한다.', '잠시 휴지한 뒤 곁들임과 함께 담는다.'];
  }
  if (/(무침|생채|샐러드|요거트|스무디|간장)$/u.test(name)) {
    return ['재료를 씻고 물기를 충분히 제거한다.', '분량의 양념 또는 드레싱과 가볍게 섞는다.', '간을 확인하고 바로 제공한다.'];
  }
  return ['재료를 계량하고 먹기 좋은 크기로 손질한다.', '주재료가 충분히 익도록 순서대로 조리한다.', '간과 농도를 확인한 뒤 담아낸다.'];
}

function aliasPrefixes(category) {
  if (['VEGETABLE', 'FRUIT', 'MEAT', 'SEAFOOD', 'EGG_DAIRY'].includes(category)) {
    return ['국산', '신선', '냉장'];
  }
  if (category === 'FROZEN') {
    return ['냉동', '간편', '포장'];
  }
  return ['국내산', '가정용', '소포장'];
}

export function buildSeedDataset() {
  const masters = [];
  const nameToId = new Map();

  for (const [category, names] of Object.entries(CATEGORY_INGREDIENTS)) {
    for (const name of names) {
      if (nameToId.has(name)) {
        throw new Error(`duplicate master name in source: ${name}`);
      }
      const id = stableUuid('ingredient', name);
      nameToId.set(name, id);
      const [quantityType, defaultUnit, fridge, freezer, pantry] = CATEGORY_DEFAULTS[category];
      masters.push({
        id,
        standardNameKo: name,
        standardNameEn: null,
        category,
        parentId: null,
        quantityType,
        defaultUnit,
        fridge,
        freezer,
        pantry
      });
    }
  }

  for (const master of masters) {
    const parentName = PARENT_NAMES[master.standardNameKo];
    if (parentName) master.parentId = nameToId.get(parentName) ?? null;
  }

  const aliases = [];
  const seenAliases = new Set();
  for (const master of masters) {
    const candidates = [
      master.standardNameKo,
      master.standardNameKo.replaceAll(' ', ''),
      ...aliasPrefixes(master.category).map((prefix) => `${prefix} ${master.standardNameKo}`),
      ...(EXPLICIT_ALIASES[master.standardNameKo] ?? [])
    ];
    for (const alias of candidates) {
      const key = `${alias.toLocaleLowerCase('ko-KR')}/ko`;
      if (seenAliases.has(key)) continue;
      seenAliases.add(key);
      aliases.push({
        id: stableUuid('alias', key),
        masterId: master.id,
        alias,
        lang: 'ko',
        source: 'SYSTEM'
      });
    }
  }

  const substitutions = SUBSTITUTIONS.map(([from, to, bidirectional, note]) => ({
    id: stableUuid('substitution', `${from}:${to}`),
    fromMasterId: nameToId.get(from),
    toMasterId: nameToId.get(to),
    bidirectional,
    note
  }));

  const recipes = RECIPE_SPECS.map(([name], index) => ({
    id: stableUuid('recipe', name),
    name,
    imageUrl: null,
    cookTimeMin: 10 + (index % 7) * 5,
    difficulty: index % 9 === 0 ? 'NORMAL' : 'EASY',
    servings: 2,
    caloriesEst: null,
    steps: recipeSteps(name),
    tags: index % 3 === 0 ? ['한식', '집밥'] : ['집밥'],
    requiredTools: /(구이|볶음|전|부침|파스타)/u.test(name) ? ['프라이팬'] : ['냄비'],
    source: 'NaengPago Seed v1',
    isActive: true
  }));

  const recipeIngredients = RECIPE_SPECS.flatMap(([recipeName, ingredients]) =>
    ingredients.map((ingredientName, index) => ({
      id: stableUuid('recipe-ingredient', `${recipeName}:${ingredientName}:${index}`),
      recipeId: stableUuid('recipe', recipeName),
      masterId: nameToId.get(ingredientName),
      nameText: ingredientName,
      quantity: 1,
      unit: masters.find((master) => master.standardNameKo === ingredientName)?.defaultUnit ?? null,
      isOptional: false,
      substitutionGroup: null
    }))
  );

  return { masters, aliases, substitutions, recipes, recipeIngredients };
}

export function validateSeedDataset(dataset) {
  const errors = [];
  const masterIds = new Set(dataset.masters.map((master) => master.id));
  const recipeIds = new Set(dataset.recipes.map((recipe) => recipe.id));
  const aliasKeys = new Set();

  if (dataset.masters.length < 300) errors.push(`master count below 300: ${dataset.masters.length}`);
  if (dataset.aliases.length < 1000) errors.push(`alias count below 1000: ${dataset.aliases.length}`);
  if (dataset.recipes.length < 80) errors.push(`recipe count below 80: ${dataset.recipes.length}`);

  for (const master of dataset.masters) {
    if (master.parentId && !masterIds.has(master.parentId)) {
      errors.push(`master references missing parent: ${master.parentId}`);
    }
  }
  for (const alias of dataset.aliases) {
    if (!masterIds.has(alias.masterId)) errors.push(`alias references missing master: ${alias.masterId}`);
    const key = `${alias.alias.toLocaleLowerCase('ko-KR')}/${alias.lang}`;
    if (aliasKeys.has(key)) errors.push(`duplicate alias: ${alias.alias}/${alias.lang}`);
    aliasKeys.add(key);
  }
  for (const substitution of dataset.substitutions) {
    if (!masterIds.has(substitution.fromMasterId) || !masterIds.has(substitution.toMasterId)) {
      errors.push(`substitution references missing master: ${substitution.id}`);
    }
  }
  for (const ingredient of dataset.recipeIngredients) {
    if (!recipeIds.has(ingredient.recipeId)) errors.push(`recipe ingredient references missing recipe: ${ingredient.recipeId}`);
    if (!masterIds.has(ingredient.masterId)) errors.push(`recipe ingredient references missing master: ${ingredient.masterId}`);
  }
  for (const recipe of dataset.recipes) {
    const requiredCount = dataset.recipeIngredients.filter(
      (ingredient) => ingredient.recipeId === recipe.id && !ingredient.isOptional
    ).length;
    if (requiredCount === 0) errors.push(`recipe has no required ingredients: ${recipe.id}`);
  }

  return { errors };
}
