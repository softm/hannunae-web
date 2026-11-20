(function (global) {
'use strict';

const APP_VERSION = 1;
const QUESTIONS = [
  { id: 'contact', title: '연락은 어느 정도가 편안한가요?', caption: '좋고 나쁨보다, 내가 편한 리듬을 골라요.', options: ['매일 짧게 안부를 나눠요', '서로 여유가 있을 때 충분히 해요', '나누고 싶은 일이 생기면 해요'], topic: '연락의 리듬', prompt: '서로 바쁜 날에는 어떤 연락 방식이 편할까요?' },
  { id: 'time', title: '함께하는 시간은 어떻게 만들고 싶나요?', caption: '일상 속에 관계를 놓는 나만의 방식이에요.', options: ['자주, 조금씩 시간을 나눠요', '시간을 정해 길게 함께해요', '각자의 시간을 충분히 지켜요'], topic: '함께하는 시간', prompt: '이번 주에 함께할 시간과 각자 보낼 시간을 어떻게 정할까요?' },
  { id: 'affection', title: '어떤 표현에 마음이 가장 잘 전해지나요?', caption: '지금의 나에게 가까운 표현을 하나 골라요.', options: ['다정한 말과 솔직한 표현', '작지만 세심한 행동', '온전히 함께하는 시간'], topic: '마음을 전하는 법', prompt: '최근에 마음에 오래 남은 작은 표현이 있었나요?' },
  { id: 'weekend', title: '쉬는 날, 둘이 무엇을 하고 싶나요?', caption: '평소의 모습을 떠올려보세요.', options: ['조용한 곳에서 편안하게 쉬어요', '밖으로 나가 새로운 것을 만나요', '그날의 기분에 맞춰 정해요'], topic: '쉬는 날의 모습', prompt: '둘 다 편안하게 보낼 수 있는 하루를 함께 그려볼까요?' },
  { id: 'conflict', title: '마음이 어긋났을 때 어떻게 풀고 싶나요?', caption: '서로를 이해하기 위한 대화의 시작이에요.', options: ['가능하면 바로 차분히 이야기해요', '마음을 정리한 뒤 이야기해요', '다시 이야기할 시간을 함께 정해요'], topic: '마음을 푸는 시간', prompt: '대화를 잠시 쉬고 싶을 때 어떤 말로 알려주면 좋을까요?' },
  { id: 'plan', title: '함께할 약속은 어떻게 정하는 편인가요?', caption: '작은 취향의 차이도 좋은 대화가 될 수 있어요.', options: ['시간과 장소를 미리 정해요', '큰 방향만 정하고 여유를 둬요', '즉흥적인 제안도 좋아해요'], topic: '약속을 만드는 방식', prompt: '미리 정하고 싶은 것과 즉흥으로 남겨둘 것은 무엇인가요?' },
  { id: 'support', title: '지친 날, 어떤 곁이 필요하나요?', caption: '내가 받고 싶은 도움의 모양을 생각해요.', options: ['해결보다 먼저 이야기를 들어줘요', '함께 방법을 찾아주면 좋아요', '잠시 혼자 쉴 시간을 주면 좋아요'], topic: '힘이 되어주는 방식', prompt: '힘든 날에는 먼저 어떻게 물어봐 주면 좋을까요?' },
  { id: 'pace', title: '새로운 관계를 어떤 속도로 알아가고 싶나요?', caption: '답은 언제든 달라질 수 있어요.', options: ['천천히 알아가며 마음을 확인해요', '마음이 생기면 솔직하게 표현해요', '서로 편한 속도를 이야기하며 정해요'], topic: '가까워지는 속도', prompt: '우리가 지금 편안하게 느끼는 관계의 속도는 어떤가요?' }
];
const cardGroups = [
  ['처음 만날 때', [
    '요즘 일상에서 가장 기다려지는 순간은 언제인가요?',
    '쉬는 날, 계획 없이 시간이 생기면 무엇을 하나요?',
    '최근에 맛있게 먹은 음식 하나를 소개해줄래요?',
    '나만 알고 싶은 작은 장소가 있나요?',
    '자꾸 다시 보게 되는 영화나 책은 무엇인가요?',
    '처음 가는 동네에서 가장 먼저 찾는 곳은 어디인가요?',
    '좋아하는 계절과 그 계절의 작은 즐거움은 무엇인가요?',
    '오늘 하루를 세 단어로 표현한다면 무엇인가요?'
  ]],
  ['조금 가까워질 때', [
    '별것 아니지만 누군가 기억해주면 기쁜 취향은 무엇인가요?',
    '나에게 편안한 대화는 어떤 모습인가요?',
    '함께 해보고 싶었던 작은 활동이 있나요?',
    '하루 중 혼자만의 시간이 가장 필요한 때는 언제인가요?',
    '칭찬을 들었을 때 가장 오래 기억에 남는 말은 무엇인가요?',
    '친해졌다고 느끼는 순간은 언제인가요?',
    '즉흥적인 약속과 미리 정한 약속, 각각 어떤 점이 좋은가요?',
    '누군가 나를 오해하기 쉬운 모습이 있나요?'
  ]],
  ['마음을 나눌 때', [
    '힘든 날, 어떤 말을 들으면 조금 편안해지나요?',
    '마음을 표현할 때 가장 자연스러운 방법은 무엇인가요?',
    '서운한 마음을 이야기하기 좋은 때는 언제인가요?',
    '바쁜 날에도 서로 지켜주고 싶은 작은 약속이 있나요?',
    '혼자 있고 싶을 때 어떤 말로 알려주면 좋을까요?',
    '서로 다르다고 느낄 때 가장 먼저 확인하고 싶은 것은 무엇인가요?',
    '함께 있는 시간에 충분히 존중받는다고 느끼는 순간은 언제인가요?',
    '오늘 고맙다고 말하고 싶은 작은 일이 있나요?'
  ]],
  ['함께 그릴 때', [
    '이번 달에 둘이 만들어보고 싶은 기억은 무엇인가요?',
    '함께 보내는 평범한 하루를 상상하면 무엇이 떠오르나요?',
    '둘만의 작은 습관을 만든다면 무엇이 좋을까요?',
    '서로의 새로운 도전을 어떻게 응원하면 좋을까요?',
    '기념일을 어떤 방식으로 기억하고 싶나요?',
    '함께 배우거나 해보고 싶은 일이 있나요?',
    '각자의 생활에서 계속 소중히 지키고 싶은 것은 무엇인가요?',
    '나중에 오늘을 떠올리면 어떤 순간이 남았으면 좋겠나요?'
  ]]
];
const CATEGORIES = cardGroups.map(function(g) { return g[0]; });
const CARDS = cardGroups.flatMap(function(g, group) {
  return g[1].map(function(question, index) {
    return { id: 'card-' + (group * 8 + index + 1), category: g[0], question: question };
  });
});
function emptyState() {
  return { version: APP_VERSION, answers: Array(QUESTIONS.length).fill(null), favorites: [], questionIndex: 0, savedAt: null };
}
function validateAnswers(value, complete) {
  return Array.isArray(value) && value.length === QUESTIONS.length && value.every(function(answer, index) {
    return (!complete && answer === null) || (Number.isInteger(answer) && answer >= 0 && answer < QUESTIONS[index].options.length);
  });
}
function isComplete(answers) { return validateAnswers(answers, true); }
function answeredCount(answers) { return answers.filter(function(a) { return a !== null; }).length; }
function validateState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== APP_VERSION) throw new Error('지원하지 않는 저장 형식이에요.');
  if (!validateAnswers(value.answers, false)) throw new Error('문답 데이터가 올바르지 않아요.');
  if (!Array.isArray(value.favorites) || value.favorites.length > CARDS.length || value.favorites.some(function(id) { return !CARDS.some(function(card) { return card.id === id; }); })) throw new Error('저장한 질문 데이터가 올바르지 않아요.');
  if (!Number.isInteger(value.questionIndex) || value.questionIndex < 0 || value.questionIndex > QUESTIONS.length) throw new Error('문답 진행 정보가 올바르지 않아요.');
  if (value.savedAt !== null && (typeof value.savedAt !== 'string' || value.savedAt.length > 40 || !Number.isFinite(Date.parse(value.savedAt)))) throw new Error('저장 날짜가 올바르지 않아요.');
  return { version: APP_VERSION, answers: value.answers.slice(), favorites: Array.from(new Set(value.favorites)), questionIndex: value.questionIndex === QUESTIONS.length && !isComplete(value.answers) ? value.answers.indexOf(null) : value.questionIndex, savedAt: value.savedAt };
}
function makeBackup(state, now) {
  return { app: 'hannunae', version: APP_VERSION, exportedAt: now || new Date().toISOString(), data: validateState(state) };
}
function parseBackup(text) {
  if (typeof text !== 'string' || text.length > 100000) throw new Error('100KB 이하의 한눈애 백업 파일을 선택해주세요.');
  let value;
  try { value = JSON.parse(text); } catch (_) { throw new Error('JSON 파일을 읽을 수 없어요. 한눈애에서 받은 백업 파일인지 확인해주세요.'); }
  if (!value || value.app !== 'hannunae' || value.version !== APP_VERSION || !value.data) throw new Error('한눈애에서 만든 버전 1 백업 파일만 가져올 수 있어요.');
  return validateState(value.data);
}
function encodeAscii(value) {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function makeShareFragment(answers, peerAnswers) {
  if (!validateAnswers(answers, true) || (peerAnswers && !validateAnswers(peerAnswers, true))) throw new Error('8개 질문에 모두 답한 뒤 공유해주세요.');
  if (peerAnswers) return '#compare=' + encodeAscii({ v: APP_VERSION, t: 'compare', a: peerAnswers.slice(), b: answers.slice() });
  return '#invite=' + encodeAscii({ v: APP_VERSION, t: 'invite', a: answers.slice() });
}
function parseShareFragment(hash) {
  if (!hash) return null;
  if (typeof hash !== 'string' || hash.length > 2048) throw new Error('초대 링크가 너무 길거나 올바르지 않아요.');
  const match = /^#(invite|compare)=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!match) throw new Error('읽을 수 없는 초대 링크예요. 보낸 사람에게 새 링크를 부탁해주세요.');
  let data;
  try {
    let encoded = match[2].replace(/-/g, '+').replace(/_/g, '/');
    encoded += '='.repeat((4 - encoded.length % 4) % 4);
    data = JSON.parse(atob(encoded));
  } catch (_) { throw new Error('초대 링크가 손상되었어요. 전체 링크를 다시 열어주세요.'); }
  if (!data || Array.isArray(data) || data.v !== APP_VERSION || data.t !== match[1] || !validateAnswers(data.a, true)) throw new Error('지원하지 않는 초대 데이터예요.');
  const expectedKeys = data.t === 'compare' ? ['a', 'b', 't', 'v'] : ['a', 't', 'v'];
  if (JSON.stringify(Object.keys(data).sort()) !== JSON.stringify(expectedKeys)) throw new Error('초대 링크에 알 수 없는 정보가 포함되어 있어요.');
  if (data.t === 'compare' && !validateAnswers(data.b, true)) throw new Error('비교 답변을 읽을 수 없어요.');
  return { type: data.t, first: data.a.slice(), second: data.t === 'compare' ? data.b.slice() : null };
}
function compareAnswers(first, second) {
  if (!isComplete(first) || !isComplete(second)) throw new Error('두 사람 모두 문답을 완료해야 해요.');
  return QUESTIONS.map(function(q, index) {
    return { id: q.id, topic: q.topic, first: q.options[first[index]], second: q.options[second[index]], same: first[index] === second[index], prompt: q.prompt };
  });
}
function dailyCard(date) {
  const day = date || new Date();
  const seed = Number('' + day.getFullYear() + String(day.getMonth() + 1).padStart(2, '0') + String(day.getDate()).padStart(2, '0'));
  return CARDS[seed % CARDS.length];
}

global.HannunaeCore = Object.freeze({
  APP_VERSION, QUESTIONS, CATEGORIES, CARDS, emptyState, validateAnswers, isComplete, answeredCount, validateState, makeBackup, parseBackup, makeShareFragment, parseShareFragment, compareAnswers, dailyCard
});
})(window);
