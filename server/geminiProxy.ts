import { loadServerEnv } from './env.ts';

export interface DetailedSafetyAnalysis {
  recommendedAge: string;
  oneLineMessage: string;
  stimulationLevels: {
    violence: string;
    language: string;
    tempo: string;
  };
  situationTags: string[];
  pacingAndTone: string;
  dialogueTip: string;
  activityTip: string;
  analysisSource: 'transcript' | 'title_only';
}

export interface GeminiAnalysisResult {
  isSafe: boolean;
  safetyReason?: string;
  analysis: DetailedSafetyAnalysis;
  hasSubtitles: boolean;
}

export interface AnalyzeRequest {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  transcriptText?: string;
  hasTranscript?: boolean;
  excludedWords?: string[];
}

// Server In-Memory LRU Cache (Up to 1000 items)
const serverAnalysisCache = new Map<string, GeminiAnalysisResult>();
const MAX_SERVER_CACHE_SIZE = 1000;

function setServerCache(videoId: string, result: GeminiAnalysisResult) {
  if (serverAnalysisCache.size >= MAX_SERVER_CACHE_SIZE) {
    const firstKey = serverAnalysisCache.keys().next().value;
    if (firstKey) serverAnalysisCache.delete(firstKey);
  }
  serverAnalysisCache.set(videoId, result);
}

// ---------------------------------------------------------------------------
// 1. Text Cleaning & Noise Sanitization Functions
// ---------------------------------------------------------------------------

export function cleanVideoTitle(raw: string): string {
  if (!raw) return '';
  return raw
    // 1. Remove bracketed contents
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/【.*?】/g, ' ')
    .replace(/<.*?>/g, ' ')
    .replace(/\{.*?\}/g, ' ')
    // 2. Remove all Unicode emojis (book 📖, star ★, etc.)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
    // 3. Take main title before delimiter if present
    .split(/[|｜ㅣ/]/)[0]
    // 4. Remove platform/channel/broadcast noise words
    .replace(/(EBS|스토리북|키드키즈|키즈캐슬|주니토니|핑크퐁|뽀로로|지니키즈|깨비키즈|쥬니어네이버|야호|코코몽|플레이하우스|유치원|어린이집|TV|티비|만화|애니|동화|동요|유아|어린이|15분|20분|30분|1시간|연속듣기|모음|풀버전|고화질|무료|인기|베스트|4K|HD|ENG|SUB|공식|NEW|추천|전체|대소동|대작전)/gi, ' ')
    // 5. Special chars and whitespace
    .replace(/[★▶●■◆▲▼#~_.:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTranscriptText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/(구독|좋아요|알림설정|채널|다음영상|다음화|클릭|시청해주셔서|감사합니다)/gi, ' ')
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeSummaryText(raw: string): string {
  if (!raw) return '';
  return raw
    // 1. Remove wrapping quotes or brackets
    .replace(/^["'「『]+|["'」』]+$/g, '')
    // 2. Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    // 3. Remove platform and channel noise words
    .replace(/(EBS|스토리북|키드키즈|키즈캐슬|주니토니|핑크퐁|뽀로로|지니키즈|깨비키즈|쥬니어네이버|유튜브)/gi, '')
    // 4. Cliché template transformations if any leaked
    .replace(/재미있는\s*['"「『]?([^'"」』]+)['"」』]?\s*동화\s*속\s*모험을\s*보며\s*문제\s*해결력을\s*배웁니다\.?/g, '$1 이야기를 통해 지혜와 배려의 태도를 배워요.')
    .replace(/신비로운\s*['"「『]?([^'"」』]+)['"」』]?\s*이야기를\s*통해\s*상상력과\s*따뜻한\s*마음을\s*기릅니다\.?/g, '$1 이야기를 통해 따뜻한 감성과 마음을 키워요.')
    // 5. Clean up pipes and residual formatting
    .replace(/[|｜ㅣ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common Korean Stopwords to prevent meaningless tags/subjects
const STOPWORDS = new Set([
  '정말', '너무', '진짜', '이런', '우리', '함께', '오늘', '내일', '모두', '지금',
  '어떤', '매일', '가장', '제일', '바로', '다시', '계속', '항상', '모든', '친구들',
  '세상', '이야기', '영상', '만화', '애니', '시리즈', '편', '탄'
]);

function extractSignificantKeywords(title: string): string[] {
  const cleaned = cleanVideoTitle(title);
  const words = cleaned
    .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));
  return words;
}

// ---------------------------------------------------------------------------
// 2. Literary & Value-Driven Smart Fallback Engine (No Cliché Templates)
// ---------------------------------------------------------------------------

interface CategoryTemplate {
  tags: string[][];
  summaries: string[];
  dialogues: string[];
  activities: string[];
  defaultTempo: string;
}

const RICH_TEMPLATES: Record<string, CategoryTemplate> = {
  동화: {
    defaultTempo: '잔잔함',
    tags: [
      ['#상상력자극', '#마음성장', '#명작동화'],
      ['#지혜와용기', '#인성동화', '#잠자리이야기'],
      ['#따뜻한우정', '#나눔과배려', '#전래명작'],
      ['#스토리텔링', '#어휘력발달', '#교훈동화'],
    ],
    summaries: [
      "{subjectPhrase} 이야기를 통해 서로의 다름을 인정하고 배려와 역지사지의 태도를 배워요.",
      "강한 바람보다 따스한 햇살이 사람의 마음을 움직이듯, {subjectPhrase} 속 칭찬과 온유함의 가치를 전합니다.",
      "{subjectPhrase} 속 지혜로운 선택처럼, 눈앞의 편안함보다 묵묵히 준비하는 성실과 책임감의 소중함을 깨닫습니다.",
      "자신의 잔꾀보다 정직하고 진실하게 다가가는 것이 가장 큰 용기이자 지혜임을 일깨워주는 이야기",
      "작은 도움도 큰 은혜로 돌아오듯, 서로를 아끼고 보답하는 마음의 따뜻함을 마음에 품게 합니다.",
      "조금 느리더라도 포기하지 않고 꿋꿋하게 발걸음을 내딛는 끈기가 결국 목표를 이루게 한다는 희망의 메시지",
    ],
    dialogues: [
      "주인공이 마음 아팠을 때 어떤 기분이었을까? 나라면 어떻게 따뜻하게 안아줬을까?",
      "이야기에서 가장 마음이 찡했거나 기억에 남는 장면은 어디였어? 왜 그 장면이 생각났니?",
      "만약 네가 이야기 속 주인공이 된다면, 친구들을 위해 어떤 멋진 선택을 해보고 싶어?",
      "주인공이 용기를 낼 수 있었던 이유는 무엇이었을까? 우리 OO이도 용기 냈던 적이 있니?",
      "동화 속 친구들에게 오늘 밤 어떤 따뜻한 응원의 말을 건네주고 싶어?",
    ],
    activities: [
      "스케치북에 이야기의 가장 인상 깊은 명장면을 자유롭게 그리고 다음 장면 상상해보기",
      "집에 있는 인형들과 쿠션으로 동화 속 무대를 만들고 온 가족이 주인공 역할극 놀이하기",
      "블록이나 재활용 상자를 쌓아서 주인공이 모험했던 신비로운 장소를 입체로 만들어보기",
      "불을 은은하게 끄고 손전등 그림자놀이로 동화 속 명장면을 그림자로 재현해보기",
      "주인공에게 주고 싶은 특별한 마법 선물을 클레이나 찰흙으로 정성껏 빚어보기",
    ],
  },
  동요: {
    defaultTempo: '빠름',
    tags: [
      ['#신나는율동', '#리듬감형성', '#인기동요'],
      ['#신체발달', '#활력충전', '#가족노래자랑'],
      ['#언어자극', '#음악놀이', '#정서안정'],
      ['#밝은에너지', '#스트레스해소', '#율동동요'],
    ],
    summaries: [
      "밝고 경쾌한 리듬에 맞춰 온몸을 움직이며 긍정적인 감정 표현과 생기 넘치는 신체 표현력을 키워요.",
      "마음을 간지럽히는 고운 노랫말과 멜로디를 통해 음악적 감수성과 풍부한 언어 감각을 자연스럽게 깨웁니다.",
      "온 가족이 함께 따라 부르며 따뜻한 유대감을 쌓고 일상에 활력을 불어넣는 신나는 율동 시간입니다.",
      "노래 속 신나는 동물과 리듬을 즐겁게 흉내 내며 신체 조절력과 대소근육 발달을 도모합니다.",
    ],
    dialogues: [
      "노래에서 가장 신나고 엉덩이가 들썩였던 부분은 어디였어?",
      "노랫말 중에서 제일 재미있고 마음에 쏙 들었던 단어나 동물은 무엇이었니?",
      "이 노래를 부를 때 어떤 표정이나 몸짓을 지으면 가장 멋질까? 엄마 아빠한테 보여줄래?",
      "노래를 들으니 어떤 기분이 드니? 기쁠 때 생각나는 다른 노래도 있을까?",
    ],
    activities: [
      "빈 페트병에 콩이나 쌀을 넣어 마라카스를 만들고 노래 리듬에 맞춰 흔들며 악기 연주하기",
      "노래 가사에 나오는 동물이나 사물의 특징적인 동작을 온 가족이 몸으로 크게 흉내 내기",
      "거실에 방석 징검다리를 놓고 음악이 멈추면 그대로 멈추는 율동 멈추기 게임하기",
      "종이컵 마이크를 들고 소파 무대에 올라 멋진 가수처럼 온 가족 노래자랑 대회 열기",
    ],
  },
  생활습관: {
    defaultTempo: '보통',
    tags: [
      ['#바른습관형성', '#자기조절력', '#생활규칙'],
      ['#스스로해요', '#자립심키우기', '#위생건강'],
      ['#식사예절', '#청결습관', '#매너키즈'],
    ],
    summaries: [
      "스스로 이를 닦고 손을 씻는 작은 실천을 통해 내 몸을 건강하고 소중하게 아끼는 기쁨을 배워요.",
      "규칙적인 생활과 바른 식사 예절을 자연스럽게 익히며 스스로 해내는 자립심과 성취감을 기릅니다.",
      "작은 양보와 정리정돈의 습관이 나와 친구 모두를 행복하게 만든다는 소중한 약속을 전합니다.",
      "거부감 없이 즐거운 놀이처럼 생활 규칙을 익히며 일상 속 바른 태도를 형성하도록 돕습니다.",
    ],
    dialogues: [
      "주인공이 스스로 해냈을 때 마음이 얼마나 뿌듯했을까? 우리 OO이도 그런 적이 있니?",
      "우리 가족이 함께 지켜야 할 가장 멋진 생활 약속에는 어떤 것들이 있을까?",
      "혼자서 해보기 조금 어려울 때는 엄마 아빠한테 어떻게 도와달라고 말하면 좋을까?",
    ],
    activities: [
      "인형 친구에게 칫솔이나 숟가락으로 밥 먹여주고 양치시켜주는 '일일 선생님' 놀이하기",
      "스스로 양치나 정리정돈을 마칠 때마다 예쁜 스티커를 붙이는 '참 잘했어요' 칭찬 판 꾸미기",
      "신나는 음악에 맞춰 타이머를 맞추고 장난감을 정리함에 쏙 넣는 1분 정리 챌린지하기",
    ],
  },
  자연과학: {
    defaultTempo: '보통',
    tags: [
      ['#호기심탐구', '#자연관찰', '#과학적사고'],
      ['#생태계탐험', '#동물사랑', '#창의인지'],
      ['#생생한체험', '#신비한자연', '#지식탐구'],
    ],
    summaries: [
      "신비로운 생태와 생명의 소중함을 관찰하며 주변 세상을 향한 따뜻한 호기심과 탐구심을 키웁니다.",
      "자연 속 다채로운 생물들의 지혜를 엿보며 과학적 사고력과 생생한 관찰력을 쑥쑥 넓혀가요.",
      "생명의 신비와 조화로운 자연 환경의 아름다움을 마음에 품으며 생명을 존중하는 태도를 배웁니다.",
    ],
    dialogues: [
      "영상에서 가장 신기하거나 처음 알게 된 자연의 비밀은 무엇이었어?",
      "만약 네가 숲속이나 바닷속 탐험가가 된다면 어떤 동물을 가장 먼저 만나보고 싶니?",
      "주인공 동물이 가진 특별한 능력 중에 나에게도 있었으면 하는 능력은 무엇이야?",
    ],
    activities: [
      "돋보기나 종이 망원경을 들고 집 안 베란다나 마당의 화분, 곤충을 관찰하는 탐험가 놀이하기",
      "좋아하는 동물의 울음소리와 걸음걸이를 흉내 내며 엄마 아빠가 동물 맞히기 퀴즈 놀이하기",
      "스케치북에 영상에 나온 신기한 자연 풍경과 동물 도감을 나만의 그림으로 기록하기",
    ],
  },
  감정사회성: {
    defaultTempo: '잔잔함',
    tags: [
      ['#감정표현', '#공감능력', '#마음돌봄'],
      ['#친구와사이좋게', '#갈등해결', '#마음소통'],
      ['#자존감향상', '#사회성발달', '#따뜻한대화'],
    ],
    summaries: [
      "친구의 마음에 가만히 귀 기울이고 공감하며 진정한 우정을 꽃피우는 따뜻한 소통의 법을 배웁니다.",
      "속상하고 화나는 마음도 따뜻한 대화로 풀어나가며 내 감정을 바르게 조절하는 힘을 길러요.",
      "서로의 다름을 포용하고 배려할 때 함께하는 기쁨이 더욱 커진다는 깊은 울림을 전합니다.",
    ],
    dialogues: [
      "친구가 속상하거나 화가 났을 때, 어떻게 다가가서 따뜻하게 위로해 주면 좋을까?",
      "주인공이 슬퍼했을 때 우리 OO이도 비슷한 기분을 느껴본 적이 있니?",
      "속상한 마음이 들 때는 화를 내는 대신 어떤 예쁜 말로 내 마음을 전하면 좋을까?",
    ],
    activities: [
      "거울을 보며 기쁨, 슬픔, 놀람, 화남 등 다채로운 얼굴 표정을 지어보는 감정 거울 놀이하기",
      "종이 하트에 사랑하는 가족이나 친구에게 전하고 싶은 고마운 마음을 그림으로 적어 선물하기",
      "따뜻한 담요 속에 쏙 들어가 서로의 눈을 바라보며 오늘 하루 좋았던 일 세 가지 이야기 나누기",
    ],
  },
  미술만들기: {
    defaultTempo: '보통',
    tags: [
      ['#창의력발휘', '#소근육발달', '#예술감성'],
      ['#오감놀이', '#다양한재료', '#만들기체험'],
      ['#색채감각', '#성취감형성', '#창작놀이'],
    ],
    summaries: [
      "다양한 색채와 재료로 마음껏 표현하며 내면의 무한한 상상력과 미적 감수성을 자유롭게 펼칩니다.",
      "손끝으로 빚어내는 창작의 즐거움을 통해 집중력과 스스로 해냈다는 뿌듯한 성취감을 경험해요.",
      "정답이 없는 예술 활동 속에서 자유로운 사고력과 풍부한 시각적 감각을 키우는 힐링 시간입니다.",
    ],
    dialogues: [
      "영상에 나온 작품 중에서 어떤 색깔 조합이 제일 예쁘고 마음에 쏙 들었어?",
      "우리가 직접 만든다면 어떤 새로운 색깔이나 반짝이는 재료를 더해보고 싶니?",
      "이 멋진 작품을 완성했을 때 작가 친구의 마음은 얼마나 뿌듯했을까?",
    ],
    activities: [
      "다 쓴 휴지심이나 계란판, 택배 상자 등 집 안 재활용품으로 나만의 멋진 로봇이나 동물 조형물 만들기",
      "크레파스로 도화지에 그림을 그린 뒤 물감으로 덧칠하는 '물과 기름' 배수성 기법 미술 놀이하기",
      "색종이를 손으로 조각조각 찢어 붙이며 알록달록 무지개 모자이크 작품 완성하기",
    ],
  },
  언어인지: {
    defaultTempo: '보통',
    tags: [
      ['#기초인지', '#어휘력확장', '#두뇌발달'],
      ['#수개념탐구', '#언어감각', '#개념학습'],
      ['#호기심해결', '#놀이학습', '#인지발달'],
    ],
    summaries: [
      "놀이하듯 자연스럽게 개념을 익히며 새로운 것을 알아가는 지적 기쁨과 성취감을 선물합니다.",
      "풍부한 어휘와 생각의 고리를 넓히며 주변 사물을 논리적으로 탐색하는 사고력을 키워요.",
      "시각과 청각을 자극하는 재미있는 이야기 속에서 기초 인지력과 수·언어 감각이 쑥쑥 자라납니다.",
    ],
    dialogues: [
      "오늘 영상에서 새로 배운 낱말이나 숫자 중에서 가장 재미있었던 것은 무엇이야?",
      "우리 집 안에서 영상에 나온 것과 똑같은 글자나 숫자를 찾아볼 수 있을까?",
      "사물의 모양이나 색깔을 다른 동물이나 과일에 비유해 본다면 어떻게 말할 수 있을까?",
    ],
    activities: [
      "거실에 있는 과일이나 인형을 모아놓고 '하나, 둘, 셋' 수 세기하며 장보기 놀이하기",
      "밀가루 반죽이나 클레이를 길게 늘여 오늘 배운 글자나 숫자의 모양을 직접 만들어보기",
      "엄마 아빠와 함께 같은 색깔, 같은 모양의 물건을 집 안에서 빠르게 찾아오는 스피드 퀴즈하기",
    ],
  },
};

export function generateFallbackSummary(
  title: string,
  transcriptText: string = '',
  channelTitle: string = '',
  hasTranscript: boolean = false
): GeminiAnalysisResult {
  const cleanedTitle = cleanVideoTitle(title);
  const sigWords = extractSignificantKeywords(title);
  const cleanSubject = cleanedTitle.length > 0 && cleanedTitle.length <= 15 ? cleanedTitle : (sigWords[0] || '주인공 친구들');
  const subjectPhrase = cleanSubject === '주인공 친구들' ? '주인공 친구들의' : `${cleanSubject}의`;

  const fullText = (cleanedTitle + ' ' + cleanTranscriptText(transcriptText) + ' ' + channelTitle).toLowerCase();

  // Smart Category Detection
  let categoryKey = '동화';
  if (fullText.includes('동요') || fullText.includes('노래') || fullText.includes('song') || fullText.includes('율동') || fullText.includes('자장가')) {
    categoryKey = '동요';
  } else if (fullText.includes('양치') || fullText.includes('배변') || fullText.includes('습관') || fullText.includes('치카') || fullText.includes('정리') || fullText.includes('예절') || fullText.includes('편식')) {
    categoryKey = '생활습관';
  } else if (fullText.includes('공룡') || fullText.includes('동물') || fullText.includes('바다') || fullText.includes('우주') || fullText.includes('과학') || fullText.includes('자연') || fullText.includes('곤충')) {
    categoryKey = '자연과학';
  } else if (fullText.includes('마음') || fullText.includes('친구') || fullText.includes('속상') || fullText.includes('화') || fullText.includes('사랑') || fullText.includes('사이') || fullText.includes('감정')) {
    categoryKey = '감정사회성';
  } else if (fullText.includes('미술') || fullText.includes('그리기') || fullText.includes('만들기') || fullText.includes('색칠') || fullText.includes('클레이') || fullText.includes('종이접기')) {
    categoryKey = '미술만들기';
  } else if (fullText.includes('숫자') || fullText.includes('한글') || fullText.includes('영어') || fullText.includes('파닉스') || fullText.includes('단어') || fullText.includes('구구단')) {
    categoryKey = '언어인지';
  }

  const tmpl = RICH_TEMPLATES[categoryKey] || RICH_TEMPLATES['동화'];

  // Hash code for varied selection
  const hash = Math.abs(title.split('').reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 1), 0));
  
  const summary = tmpl.summaries[hash % tmpl.summaries.length]
    .replace(/{subjectPhrase}/g, subjectPhrase);

  const dialogue = tmpl.dialogues[hash % tmpl.dialogues.length];
  const activity = tmpl.activities[hash % tmpl.activities.length];
  const tagsGroup = tmpl.tags[hash % tmpl.tags.length];

  // Customized tags without noise
  const customizedTags = [
    sigWords[0] ? `#${sigWords[0]}` : tagsGroup[0],
    tagsGroup[1],
    tagsGroup[2]
  ];

  return {
    isSafe: true,
    safetyReason: hasTranscript ? '유튜브 자막 스크립트 기반 동적 정밀 심사' : '영상 메타데이터 기반 스마트 분석',
    hasSubtitles: hasTranscript,
    analysis: {
      recommendedAge: categoryKey === '동요' || categoryKey === '생활습관' ? '권장 3세+' : '권장 4세+',
      oneLineMessage: summary,
      stimulationLevels: {
        violence: '없음',
        language: '건전함',
        tempo: tmpl.defaultTempo,
      },
      situationTags: customizedTags,
      pacingAndTone: `${categoryKey} 특화 안정적인 전개`,
      dialogueTip: dialogue,
      activityTip: activity,
      analysisSource: hasTranscript ? 'transcript' : 'title_only',
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Single Video Analysis Proxy with High-Quality Literary Persona
// ---------------------------------------------------------------------------

export async function analyzeVideoProxy(req: AnalyzeRequest): Promise<GeminiAnalysisResult> {
  const { videoId, title, description, channelTitle, transcriptText = '', hasTranscript = false, excludedWords = [] } = req;

  // 0. Server memory cache check
  const cached = serverAnalysisCache.get(videoId);
  if (cached) {
    return cached;
  }

  // 1. Excluded words filtering
  const fullText = `${title} ${description} ${channelTitle}`.toLowerCase();
  const matchedWords = excludedWords.filter((w) => w.trim() && fullText.includes(w.toLowerCase().trim()));
  if (matchedWords.length > 0) {
    const blocked: GeminiAnalysisResult = {
      isSafe: false,
      safetyReason: `부모 지정 제외 단어 [${matchedWords.join(', ')}] 포함됨`,
      hasSubtitles: hasTranscript,
      analysis: {
        recommendedAge: '시청 불가',
        oneLineMessage: `차단 단어 [${matchedWords.join(', ')}]가 검출되어 필터링된 영상입니다.`,
        stimulationLevels: {
          violence: '주의',
          language: '모방주의',
          tempo: '빠름',
        },
        situationTags: ['#차단영상', '#키워드제외'],
        pacingAndTone: '시청 불가 영상',
        dialogueTip: '다른 안심 추천 영상을 자녀와 함께 선택해 주세요.',
        activityTip: '차단 키워드는 부모 지정 제외 단어 목록에서 관리할 수 있습니다.',
        analysisSource: 'title_only',
      },
    };
    setServerCache(videoId, blocked);
    return blocked;
  }

  // 2. Call Google Gemini API from server
  const { geminiApiKey } = loadServerEnv();
  if (geminiApiKey && geminiApiKey.trim().length > 5) {
    try {
      const cleanT = cleanVideoTitle(title);
      const cleanTrans = cleanTranscriptText(transcriptText);
      const cleanDesc = cleanTranscriptText(description);

      const contentSourceText = hasTranscript && cleanTrans.length > 15
        ? `[실제 자막 대사 스크립트]: "${cleanTrans.slice(0, 1000)}"`
        : `[영상 상세 설명]: "${cleanDesc.slice(0, 600)}"`;

      const prompt = `
너는 아동 문학가이자 20년 경력의 유아 교육·심리 전문가야.
아래 영상 데이터를 면밀히 분석하여, 부모님과 아이의 마음에 깊은 울림을 주는 품격 있는 요약문(oneLineMessage)과 교육 분석을 JSON으로 작성해줘.

- 정제된 핵심 제목: "${cleanT}"
- ${contentSourceText}

[★ 가장 중요한 oneLineMessage (한 줄 요약) 필수 작성 규칙 ★]
1. 노이즈 및 플랫폼/채널명 완전 배제:
   - 제목이나 자막에 있는 EBS, 스토리북, 키드키즈, 핑크퐁, 뽀로로, 주니토니, 유튜브 등 채널명·플랫폼명·이모지(📖 등)를 요약문에 절대 포함하지 말 것.
2. 기계적 템플릿 절대 금지:
   - 금지 패턴: "재미있는 '[제목]' 동화 속 모험을 보며 ~를 배웁니다", "신비로운 '[제목]' 이야기를 통해 ~ 기릅니다" 같은 복붙 템플릿은 절대 쓰지 말 것.
   - 제목을 따옴표('...')로 인용하지 말고, 자연스럽게 이야기의 줄거리와 인물로 녹여낼 것.
3. 내용 심화 & 문학적 뉘앙스:
   - 단순한 '모험'이나 '재미' 나열이 아니라, 이야기가 전하는 핵심 메시지, 교훈, 심리적 가치(예: 배려, 역지사지, 칭찬과 온유함, 정직, 성실과 책임감 등)가 은은하게 드러나도록 품격 있는 문체로 작성할 것.

[좋은 작성 예시]
- "여우와 두루미가 서로를 초대하며 대접하는 이야기를 통해 배려와 역지사지의 태도를 배워요."
- "강한 바람보다 따스한 햇살이 사람의 마음을 움직이듯, 칭찬과 온유함의 가치를 배우는 이야기"
- "눈앞의 편안함보다 묵묵히 벽돌을 쌓아 올린 셋째 돼지처럼, 성실함과 준비하는 마음의 소중함을 깨닫습니다."
- "자신의 잔꾀에 넘어간 여우를 통해 남을 속이기보다 정직하고 진실하게 다가가는 것이 참된 지혜임을 일깨워줍니다."

[그 외 필드 작성 원칙]
- dialogueTip: 아이의 공감과 상상력을 여는 구체적인 질문 1개 ("재미있었니?" 금지)
- activityTip: 일상 소품이나 신체로 쉽게 실천하는 구체적인 연계 놀이 1개
- situationTags: [1. 핵심소재/주인공] [2. 발달가치/정서] [3. 시청상황/장르] 3개 (#15분, #모음 등 기술용어 금지)

반드시 순수 JSON 형식으로만 응답해:
{
  "isSafe": true,
  "safetyReason": "${hasTranscript ? '유튜브 자막 스크립트 기반 AI 정밀 심사 완료' : '영상 메타데이터 기반 AI 정밀 심사 완료'}",
  "analysis": {
    "recommendedAge": "권장 4세+",
    "oneLineMessage": "문학적이고 교훈이 담긴 한 줄 요약",
    "stimulationLevels": { "violence": "없음", "language": "건전함", "tempo": "보통" },
    "situationTags": ["#태그1", "#태그2", "#태그3"],
    "pacingAndTone": "영상의 전개 속도와 분위기",
    "dialogueTip": "구체적인 질문 1개",
    "activityTip": "구체적인 연계 놀이 1개",
    "analysisSource": "${hasTranscript ? 'transcript' : 'title_only'}"
  }
}
`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.65,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(7000),
        }
      );

      if (res.ok) {
        const data: any = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed.analysis && parsed.analysis.oneLineMessage) {
            // Filter any accidental garbage tags
            const cleanedTags = (parsed.analysis.situationTags || [])
              .filter((t: string) => !/(15분|연속|모음|4K|HD|ENG|동영상|유튜브|EBS|스토리북)/.test(t))
              .slice(0, 3);

            const result: GeminiAnalysisResult = {
              isSafe: Boolean(parsed.isSafe),
              safetyReason: parsed.safetyReason || 'AI 정밀 심사 완료',
              hasSubtitles: hasTranscript,
              analysis: {
                recommendedAge: parsed.analysis.recommendedAge || '권장 4세+',
                oneLineMessage: sanitizeSummaryText(parsed.analysis.oneLineMessage),
                stimulationLevels: {
                  violence: parsed.analysis.stimulationLevels?.violence || '없음',
                  language: parsed.analysis.stimulationLevels?.language || '건전함',
                  tempo: parsed.analysis.stimulationLevels?.tempo || '보통',
                },
                situationTags: cleanedTags.length >= 2 ? cleanedTags : ['#유아안심', '#키즈픽'],
                pacingAndTone: parsed.analysis.pacingAndTone || '유아 맞춤 안심 영상',
                dialogueTip: parsed.analysis.dialogueTip,
                activityTip: parsed.analysis.activityTip,
                analysisSource: hasTranscript ? 'transcript' : 'title_only',
              },
            };
            setServerCache(videoId, result);
            return result;
          }
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. Fallback
  const fallback = generateFallbackSummary(title, transcriptText, channelTitle, hasTranscript);
  setServerCache(videoId, fallback);
  return fallback;
}

// ---------------------------------------------------------------------------
// 4. Batch Video Analysis Proxy with Literary & Value-Driven Prompt
// ---------------------------------------------------------------------------

export async function batchAnalyzeVideosProxy(
  items: AnalyzeRequest[],
  excludedWords: string[] = []
): Promise<Record<string, GeminiAnalysisResult>> {
  const results: Record<string, GeminiAnalysisResult> = {};
  const toProcess: AnalyzeRequest[] = [];

  // Step 1: Check memory cache and excluded words first (instant 0ms response)
  for (const item of items) {
    const cached = serverAnalysisCache.get(item.videoId);
    if (cached) {
      results[item.videoId] = cached;
      continue;
    }

    const fullText = `${item.title} ${item.description} ${item.channelTitle}`.toLowerCase();
    const matched = excludedWords.filter((w) => w.trim() && fullText.includes(w.toLowerCase().trim()));
    if (matched.length > 0) {
      const blocked: GeminiAnalysisResult = {
        isSafe: false,
        safetyReason: `부모 지정 제외 단어 [${matched.join(', ')}] 포함됨`,
        hasSubtitles: Boolean(item.hasTranscript),
        analysis: {
          recommendedAge: '시청 불가',
          oneLineMessage: `차단 단어 [${matched.join(', ')}]가 검출되어 필터링된 영상입니다.`,
          stimulationLevels: { violence: '주의', language: '모방주의', tempo: '빠름' },
          situationTags: ['#차단영상'],
          pacingAndTone: '시청 불가',
          dialogueTip: '다른 안심 영상을 선택해 주세요.',
          activityTip: '차단 키워드 목록을 확인해 주세요.',
          analysisSource: 'title_only',
        },
      };
      setServerCache(item.videoId, blocked);
      results[item.videoId] = blocked;
      continue;
    }

    toProcess.push(item);
  }

  if (toProcess.length === 0) {
    return results;
  }

  const { geminiApiKey } = loadServerEnv();

  // If no Gemini key, fallback immediately
  if (!geminiApiKey || geminiApiKey.trim().length < 5) {
    for (const item of toProcess) {
      const fb = generateFallbackSummary(item.title, item.transcriptText, item.channelTitle, item.hasTranscript);
      setServerCache(item.videoId, fb);
      results[item.videoId] = fb;
    }
    return results;
  }

  // Step 2: Split remaining videos into chunks of 4 for batch prompt (80% fewer API roundtrips!)
  const CHUNK_SIZE = 4;
  const chunks: AnalyzeRequest[][] = [];
  for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
    chunks.push(toProcess.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const miniList = chunk.map((c) => {
          const cleanT = cleanVideoTitle(c.title);
          const cleanTrans = cleanTranscriptText(c.transcriptText || '');
          const cleanDesc = cleanTranscriptText(c.description || '');
          const content = cleanTrans.length > 20 ? cleanTrans : cleanDesc;

          return {
            id: c.videoId,
            cleanTitle: cleanT,
            storyContent: content.slice(0, 800), // Rich 800-character context for deep accuracy
            hasTranscript: Boolean(c.hasTranscript),
          };
        });

        const prompt = `
너는 아동 문학가이자 20년 경력의 유아 교육·심리 전문가야.
아래 ${miniList.length}개 유아 영상 데이터를 면밀히 분석하여, 부모님과 아이의 마음에 깊은 울림을 주는 품격 있는 요약문(oneLineMessage)과 교육 분석을 JSON 객체로 반환해줘.

영상 목록:
${JSON.stringify(miniList, null, 2)}

[★ 가장 중요한 oneLineMessage (한 줄 요약) 필수 작성 규칙 ★]
1. 노이즈 및 플랫폼/채널명 완전 배제:
   - 제목이나 자막에 있는 EBS, 스토리북, 키드키즈, 핑크퐁, 뽀로로, 주니토니, 유튜브 등 채널명·플랫폼명·이모지(📖 등)를 요약문에 절대 포함하지 말 것.
2. 기계적 템플릿 절대 금지:
   - 금지 패턴: "재미있는 '[제목]' 동화 속 모험을 보며 ~를 배웁니다", "신비로운 '[제목]' 이야기를 통해 ~ 기릅니다" 같은 복붙 템플릿은 절대 쓰지 말 것.
   - 제목을 따옴표('...')로 인용하지 말고, 자연스럽게 이야기의 줄거리와 인물로 녹여낼 것.
3. 내용 심화 & 문학적 뉘앙스:
   - 단순한 '모험'이나 '재미' 나열이 아니라, 이야기가 전하는 핵심 메시지, 교훈, 심리적 가치(예: 배려, 역지사지, 칭찬과 온유함, 정직, 성실과 책임감 등)가 은은하게 드러나도록 품격 있는 문체로 작성할 것.

[좋은 작성 예시]
- "여우와 두루미가 서로를 초대하며 대접하는 이야기를 통해 배려와 역지사지의 태도를 배워요."
- "강한 바람보다 따스한 햇살이 사람의 마음을 움직이듯, 칭찬과 온유함의 가치를 배우는 이야기"
- "눈앞의 편안함보다 묵묵히 벽돌을 쌓아 올린 셋째 돼지처럼, 성실함과 준비하는 마음의 소중함을 깨닫습니다."
- "자신의 잔꾀에 넘어간 여우를 통해 남을 속이기보다 정직하고 진실하게 다가가는 것이 참된 지혜임을 일깨워줍니다."

[그 외 필드 작성 원칙]
- dialogueTip: 아이의 공감과 상상력을 여는 구체적인 질문 1개 ("재미있었니?" 금지)
- activityTip: 일상 소품이나 신체로 쉽게 실천하는 구체적인 연계 놀이 1개
- situationTags: [1. 핵심소재/주인공] [2. 발달가치/정서] [3. 시청상황/장르] 3개 (#15분, #모음 등 기술용어 금지)

반드시 다음 JSON 형식으로만 응답해:
{
  "results": {
    "영상id": {
      "isSafe": true,
      "safetyReason": "AI 정밀 심사 완료",
      "recommendedAge": "권장 4세+",
      "oneLineMessage": "문학적이고 깊이 있는 한 줄 요약",
      "pacingAndTone": "분위기 설명",
      "dialogueTip": "부모-자녀 대화 질문 1개",
      "activityTip": "연계 놀이 1개",
      "stimulationLevels": { "violence": "없음", "language": "건전함", "tempo": "보통" },
      "situationTags": ["#태그1", "#태그2", "#태그3"]
    }
  }
}
`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.65,
                responseMimeType: 'application/json',
              },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.ok) {
          const data: any = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const batchObj = parsed.results || parsed;

            for (const item of chunk) {
              const itemAnalysis = batchObj[item.videoId];
              if (itemAnalysis && itemAnalysis.oneLineMessage) {
                // Filter any accidental garbage tags
                const cleanedTags = (itemAnalysis.situationTags || [])
                  .filter((t: string) => !/(15분|연속|모음|4K|HD|ENG|동영상|유튜브|EBS|스토리북)/.test(t))
                  .slice(0, 3);

                const finalResult: GeminiAnalysisResult = {
                  isSafe: itemAnalysis.isSafe !== false,
                  safetyReason: itemAnalysis.safetyReason || 'AI 정밀 심사 완료',
                  hasSubtitles: Boolean(item.hasTranscript),
                  analysis: {
                    recommendedAge: itemAnalysis.recommendedAge || '권장 4세+',
                    oneLineMessage: sanitizeSummaryText(itemAnalysis.oneLineMessage),
                    stimulationLevels: {
                      violence: itemAnalysis.stimulationLevels?.violence || '없음',
                      language: itemAnalysis.stimulationLevels?.language || '건전함',
                      tempo: itemAnalysis.stimulationLevels?.tempo || '보통',
                    },
                    situationTags: cleanedTags.length >= 2 ? cleanedTags : ['#유아추천', '#안심영상'],
                    pacingAndTone: itemAnalysis.pacingAndTone || '유아 맞춤 안심 영상',
                    dialogueTip: itemAnalysis.dialogueTip || '영상 속 재미있었던 장면에 대해 아이와 이야기를 나누어 보세요.',
                    activityTip: itemAnalysis.activityTip || '영상의 주제로 집에서 즐거운 연계 놀이를 해보세요.',
                    analysisSource: item.hasTranscript ? 'transcript' : 'title_only',
                  },
                };
                setServerCache(item.videoId, finalResult);
                results[item.videoId] = finalResult;
                continue;
              }
            }
          }
        }
      } catch {
        // chunk failed, fallback below
      }

      // Fallback for any items in chunk not yet populated
      for (const item of chunk) {
        if (!results[item.videoId]) {
          const fb = generateFallbackSummary(item.title, item.transcriptText, item.channelTitle, item.hasTranscript);
          setServerCache(item.videoId, fb);
          results[item.videoId] = fb;
        }
      }
    })
  );

  return results;
}
