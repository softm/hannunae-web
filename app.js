(function () {
'use strict';

const { QUESTIONS, CARDS, CATEGORIES, emptyState, validateState, isComplete, answeredCount, makeBackup, parseBackup, makeShareFragment, parseShareFragment, compareAnswers, dailyCard } = window.HannunaeCore;

const STORAGE_KEY = 'hannunae.maeum.v1';
const PUBLIC_APP_URL = 'https://softm.github.io/hannunae-web/';
function shareUrl(fragment) {
  // Bundled Android pages must share a public link, never the private asset-loader address.
  const bundled = location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net';
  const url = new URL(bundled ? PUBLIC_APP_URL : location.origin + location.pathname);
  url.hash = fragment;
  return url.href;
}
const $ = function(selector) { return document.querySelector(selector); };
const escapeHtml = function(value) { return String(value).replace(/[&<>"']/g, function(c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); };
const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  quiz: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  compare: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  cards: '<rect x="7" y="7" width="14" height="14" rx="3"/><path d="M17 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2M11 12h6M11 16h4"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-.6 2.2-2 .9-2.1-.6-2 3.5L4 10.6v2.3l-1.7 1.7 2 3.5 2.1-.6 2 .9L9 21h4l.6-2.2 2-.9 2.1.6 2-3.5-1.7-1.6v-2.3L19.7 9l-2-3.5-2.1.6-2-.9L13 3Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  edit: '<path d="m15 4 5 5M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15Z"/>',
  shuffle: '<path d="m16 3 5 0 0 5M4 4l16 16M16 21h5v-5M4 20l5-5M15 9l6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>',
  leaf: '<path d="M20 3C10 2 3 5 3 12a7 7 0 0 0 7 7c7 0 10-7 10-16ZM4 20l11-11"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>'
};
function icon(name, cls) { return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.heart) + '</svg>'; }
const routes = [{id:'home',label:'오늘',icon:'home'},{id:'quiz',label:'마음문답',icon:'quiz'},{id:'compare',label:'둘이 비교',icon:'compare'},{id:'cards',label:'대화카드',icon:'cards'},{id:'settings',label:'설정',icon:'settings'}];
let state = emptyState();
let storageIssue = '';
let storageLocked = false;
let route = 'home';
let peer = null;
let shareError = '';
let generatedLink = '';
let cardFilter = 'all';
let featuredCard = null;
let toastTimer;
let confirmationCallback = null;

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    state = validateState(JSON.parse(raw));
    if (isComplete(state.answers)) state.questionIndex = QUESTIONS.length;
  }
} catch (_) {
  storageLocked = true;
  storageIssue = '이 브라우저의 저장 데이터를 읽을 수 없어요. 지금은 임시로 사용할 수 있고, 설정에서 백업을 복원하거나 저장 데이터를 초기화할 수 있어요.';
}
function readInvitation() {
  peer = null;
  shareError = '';
  if (location.hash && !location.hash.startsWith('#main-content')) {
    try { peer = parseShareFragment(location.hash); route = 'compare'; }
    catch (error) { shareError = error.message; route = 'compare'; }
  }
}
readInvitation();
function persist() {
  state.savedAt = new Date().toISOString();
  if (storageLocked) { updateStorageNotice(); return false; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(validateState(state))); storageIssue = ''; updateStorageNotice(); return true; }
  catch (_) { storageIssue = '브라우저 저장 공간을 사용할 수 없어 변경 내용이 임시로만 남아 있어요. 화면을 닫기 전에 설정에서 JSON 백업을 받아주세요.'; updateStorageNotice(); return false; }
}
function updateStorageNotice() {
  const node = $('#storage-notice');
  node.hidden = !storageIssue;
  node.innerHTML = storageIssue ? escapeHtml(storageIssue) + '<button type="button" data-route="settings">설정으로 이동</button>' : '';
}
function toast(message) {
  clearTimeout(toastTimer);
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  toastTimer = setTimeout(function() { node.classList.remove('visible'); }, 3300);
}
function ask(title, message, action, confirmLabel) {
  const dialog = $('#confirm-dialog');
  $('#dialog-title').textContent = title;
  $('#dialog-message').textContent = message;
  $('#dialog-confirm').textContent = confirmLabel || '확인';
  confirmationCallback = action;
  dialog.showModal();
  $('#dialog-cancel').focus();
}
function heading(eyebrow, title, subtitle, right) {
  return '<div class="page-heading"><div><p class="eyebrow">' + escapeHtml(eyebrow) + '</p><h1 id="page-title">' + title + '</h1><p>' + subtitle + '</p></div>' + (right || '') + '</div>';
}
function favoriteButton(card) {
  const saved = state.favorites.includes(card.id);
  return '<button type="button" class="icon-button' + (saved ? ' saved' : '') + '" data-action="favorite" data-id="' + card.id + '" aria-pressed="' + saved + '" aria-label="' + escapeHtml(card.question + (saved ? ' — 저장 취소' : ' — 질문 저장')) + '">' + icon('heart') + '</button>';
}
function heroArt() {
  return '<svg class="hero-art" viewBox="0 0 290 290" fill="none" aria-hidden="true"><ellipse cx="153" cy="254" rx="83" ry="12" fill="#d7b4c0" opacity=".25"/><circle cx="155" cy="139" r="102" fill="#f2dce1"/><g transform="rotate(-13 116 140)"><rect x="55" y="64" width="120" height="170" rx="15" fill="#cf98aa"/><rect x="50" y="57" width="120" height="170" rx="15" fill="#fffafa"/><rect x="68" y="77" width="46" height="5" rx="2.5" fill="#e8c4cf"/><path d="M110 122c-19-20-41 7 0 35 41-28 19-55 0-35Z" fill="#cb8298"/><rect x="76" y="177" width="67" height="4" rx="2" fill="#ecd7df"/><rect x="87" y="188" width="45" height="4" rx="2" fill="#f1e3e8"/></g><g transform="rotate(15 186 151)"><rect x="128" y="87" width="112" height="157" rx="15" fill="#e0b2bf"/><rect x="124" y="80" width="112" height="157" rx="15" fill="#fffdf9"/><rect x="141" y="99" width="40" height="4" rx="2" fill="#e5c5ce"/><path d="M154 144c0-11 9-19 21-19h11c12 0 21 8 21 19s-9 19-21 19h-14l-14 9 3-13c-4-4-7-9-7-15Z" fill="#efc8cf"/><path d="M175 145h17m-17 6h10" stroke="#bc7d93" stroke-width="3" stroke-linecap="round"/><rect x="148" y="190" width="65" height="4" rx="2" fill="#ecdae0"/><rect x="159" y="201" width="43" height="4" rx="2" fill="#f0e4e8"/></g><path d="m214 37 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#c794a6"/><path d="m46 153 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#bf91a5"/><circle cx="249" cy="99" r="3" fill="#dfb2c1"/><circle cx="76" cy="38" r="3" fill="#dfb2c1"/></svg>';
}
function renderHome() {
  const count = answeredCount(state.answers);
  const complete = isComplete(state.answers);
  const card = dailyCard();
  const date = new Date().toLocaleDateString('ko-KR', {month:'long',day:'numeric',weekday:'long'});
  const action = complete ? '나의 관계 카드 보기' : count ? '마음문답 이어하기' : '나의 마음 알아보기';
  return heading('A LITTLE CLOSER, EVERY DAY', '오늘, 어떤 마음인가요?', '나를 알아가고, 서로에게 조금 더 가까워지는 시간.', '<span class="heading-date optional-mobile">' + escapeHtml(date) + '</span>') +
    '<div class="hero-grid"><section class="hero"><div class="hero-copy"><span class="badge">♡ &nbsp;관계를 위한 작은 질문</span><h1>마음이 닿는<br><em>시작, 한눈애.</em></h1><p>여덟 가지 질문으로 내 마음을 알아보고,<br>소중한 사람과 대화를 시작해요.</p><button type="button" class="button primary" data-action="start-quiz">' + action + '' + '</button>' + (count && !complete ? '<p class="hint" style="margin:11px 0 0">' + count + ' / 8개 답변을 남겼어요</p>' : '') + '</div>' + heroArt() + '</section>' +
    '<section class="daily-card"><div class="card-meta"><span class="mini-label">TODAY’S QUESTION</span>' + favoriteButton(card) + '</div><div class="quote-mark">“</div><h2 class="daily-question">' + escapeHtml(card.question) + '</h2><span class="topic-tag">' + escapeHtml(card.category) + '</span><div class="daily-bottom"><span>오늘의 대화 한 장</span><button type="button" class="text-button" data-route="cards">더 만나보기 ' + '' + '</button></div></section></div>' +
    '<div class="section-heading"><div><h2>우리의 마음이 가까워지는 방법</h2><p>정답 없이, 편안한 속도로 시작해보세요.</p></div></div>' +
    '<div class="step-grid">' +
    '<section class="step-card"><div class="step-top"><span class="step-icon">' + icon('quiz') + '</span><span class="step-number">01</span></div><h3>먼저, 나를 알아가요</h3><p>나에게 편안한 관계의 모습을<br>짧은 문답으로 정리해요.</p><button class="text-button" type="button" data-action="start-quiz">마음문답 시작 ' + '' + '</button></section>' +
    '<section class="step-card"><div class="step-top"><span class="step-icon">' + icon('compare') + '</span><span class="step-number">02</span></div><h3>서로의 마음을 나눠요</h3><p>초대 링크로 답변을 나누고<br>같은 점과 다른 점을 살펴봐요.</p><button class="text-button" type="button" data-route="compare">둘이 비교하기 ' + '' + '</button></section>' +
    '<section class="step-card"><div class="step-top"><span class="step-icon">' + icon('cards') + '</span><span class="step-number">03</span></div><h3>질문 하나로 가까워져요</h3><p>어색한 첫 만남부터 깊은 대화까지,<br>마음에 닿는 질문을 골라요.</p><button class="text-button" type="button" data-route="cards">대화카드 보기 ' + '' + '</button></section></div>' +
    '<div class="soft-strip">' + icon('lock') + '<p><strong>나의 답변은, 내가 나누고 싶을 때만.</strong><br>로그인 없이 이 브라우저에 저장돼요. 초대 링크를 만들기 전 공개할 내용을 안내해요.</p><button type="button" class="text-button" data-route="settings">저장 안내 ' + '' + '</button></div>';
}
function renderQuiz() {
  if (state.questionIndex >= QUESTIONS.length && isComplete(state.answers)) return renderResult();
  const index = Math.min(state.questionIndex, QUESTIONS.length - 1);
  const question = QUESTIONS[index];
  return '<div class="narrow">' + heading('GET TO KNOW MY HEART', '나를 알아가는 마음문답', '정답은 없어요. 지금 내 마음에 가까운 쪽을 골라주세요.') +
    '<section class="panel quiz-panel"><div class="progress-row"><span>' + escapeHtml(question.topic) + '</span><span>' + (index + 1) + ' / ' + QUESTIONS.length + '</span></div><div class="progress" role="progressbar" aria-label="마음문답 진행" aria-valuemin="0" aria-valuemax="8" aria-valuenow="' + answeredCount(state.answers) + '"><span style="width:' + (answeredCount(state.answers) / QUESTIONS.length * 100) + '%"></span></div>' +
    '<fieldset class="quiz-question"><legend>' + escapeHtml(question.title) + '</legend><p class="quiz-caption">' + escapeHtml(question.caption) + '</p><div class="answer-options">' +
    question.options.map(function(option, i) { return '<label class="answer"><input type="radio" name="answer" value="' + i + '" ' + (state.answers[index] === i ? 'checked' : '') + '><span>' + escapeHtml(option) + '</span></label>'; }).join('') +
    '</div></fieldset><div class="quiz-actions"><button type="button" class="button secondary" data-action="previous-question" ' + (index === 0 ? 'disabled' : '') + '>이전 질문</button><button type="button" class="button primary" data-action="next-question" ' + (state.answers[index] === null ? 'disabled' : '') + '>' + (index === QUESTIONS.length - 1 ? '나의 관계 카드 보기' : '다음 질문') + '' + '</button></div></section><p class="quiz-footnote">' + (storageIssue ? '현재 답변은 임시로 유지돼요. 저장 안내를 확인해주세요.' : '답변은 이 브라우저에 저장돼요. 언제든 이어서 작성할 수 있어요.') + '</p></div>';
}
function renderResult() {
  return '<div class="narrow">' + heading('THIS IS MY WAY TO CONNECT', '나의 관계 카드', '지금의 내가 편안하게 느끼는 관계의 모습이에요.') +
    '<section class="panel"><div class="result-banner">' + icon('heart') + '<div><h2>내 마음의 모양을 발견했어요.</h2><p>서로를 알아가기 위한 작은 실마리예요.<br>마음이 달라지면 언제든 다시 골라도 괜찮아요.</p></div></div>' +
    '<div class="result-list">' + QUESTIONS.map(function(q, i) { return '<article class="result-item"><span class="item-label">' + escapeHtml(q.topic) + '</span><p>' + escapeHtml(q.options[state.answers[i]]) + '</p><button type="button" class="edit-answer" data-action="edit-answer" data-index="' + i + '" aria-label="' + escapeHtml(q.topic + ' 답변 수정') + '">' + icon('edit') + '</button></article>'; }).join('') + '</div>' +
    '<div class="button-row"><button type="button" class="button primary" data-route="compare">' + icon('compare') + '둘이 비교하기</button><button type="button" class="button secondary" data-action="copy-result">' + icon('copy') + '관계 카드 복사</button></div><p class="center-note">이 카드는 내가 고른 답변의 요약이에요. 성격 진단이나 궁합 평가가 아니에요.</p>' +
    (peer && peer.type === 'invite' ? '<div class="inline-note" style="margin-top:21px">초대받은 상대의 답변이 있어요. 둘이 비교하기에서 함께 살펴볼 수 있어요.</div>' : '') + '</section></div>';
}
function renderSharePanel(mode) {
  const returning = mode === 'return';
  return '<section class="share-panel"><h3>' + (returning ? '함께 볼 비교 링크 만들기' : '대화에 초대하기') + '</h3><p class="share-warning">' +
    (returning ? '비교 링크에는 초대한 사람과 내가 고른 8개 답변이 모두 담겨요. 초대받은 상대에게 링크를 직접 보내주세요.' : '초대 링크에는 내가 고른 8개 답변이 담겨요. 상대는 자신의 문답을 마친 뒤 서로의 답변을 비교할 수 있어요.') +
    ' <strong>링크를 가진 누구나 답변을 읽을 수 있으며</strong>, 메신저나 브라우저 방문 기록에 남을 수 있어요. 링크 공개를 나중에 취소할 수는 없어요.</p>' +
    '<label class="consent-label"><input type="checkbox" id="share-consent"><span>' + (returning ? '두 사람의 답변을 담은 비교 링크를 만듭니다. 링크를 가진 사람이 답변을 볼 수 있음을 이해했어요.' : '내 8개 답변을 링크로 공개하고, 상대가 내 답변을 포함한 비교 링크를 만들 수 있음을 이해했어요.') + '</span></label>' +
    '<button type="button" class="button primary" data-action="generate-link" data-mode="' + mode + '" id="generate-link-button" disabled>' + icon('share') + (returning ? '비교 링크 만들기' : '동의하고 초대 링크 만들기') + '</button>' +
    '<div id="generated-link" class="generated-link" hidden><label for="share-url">직접 전달할 링크</label><textarea id="share-url" class="share-url" readonly spellcheck="false"></textarea><div class="button-row"><button type="button" class="button secondary" data-action="copy-link">' + icon('copy') + '링크 복사</button>' + ((typeof navigator.share === 'function' || window.HannunNativeWeb.available()) ? '<button type="button" class="button secondary" data-action="native-share">' + icon('share') + '공유하기</button>' : '') + '</div><p class="hint">답변은 링크의 # 뒤에 담깁니다. 상대방에게 링크 전체를 전달해주세요.</p></div></section>';
}
function renderComparisonRows(first, second, firstLabel, secondLabel) {
  const rows = compareAnswers(first, second);
  const matches = rows.filter(function(item) { return item.same; }).length;
  return '<div class="comparison-intro"><div class="comparison-count">' + matches + '<small> / 8</small></div><p><strong>개 항목에서 같은 답을 골랐어요.</strong><br>다른 선택은 서로를 알아갈 대화의 시작이에요. 점수나 궁합이 아니에요.</p></div><div class="comparison-grid">' +
    rows.map(function(item) { return '<article class="compare-item"><div class="compare-head"><h3>' + escapeHtml(item.topic) + '</h3><span class="compare-badge' + (item.same ? ' same' : '') + '">' + (item.same ? '같은 선택' : '다른 선택') + '</span></div><div class="compare-answer"><span>' + firstLabel + '</span><b>' + escapeHtml(item.first) + '</b></div><div class="compare-answer"><span>' + secondLabel + '</span><b>' + escapeHtml(item.second) + '</b></div><p class="compare-prompt"><strong>함께 나눠볼 질문</strong>' + escapeHtml(item.prompt) + '</p></article>'; }).join('') + '</div>';
}
function renderCompare() {
  let content = heading('TWO HEARTS, ONE CONVERSATION', '둘이 비교해요', '같은 마음을 발견하고, 다른 마음을 편안하게 나눠보세요.');
  if (shareError) return content + '<section class="panel"><h2>초대 링크를 확인해주세요</h2><p class="panel-lead">' + escapeHtml(shareError) + '</p><button class="button secondary" type="button" data-action="clear-invite">초대 링크 닫기</button></section>';
  if (peer && peer.type === 'compare') {
    return content + '<section class="panel"><p class="panel-lead">링크에 담긴 두 사람의 답변을 함께 살펴보세요. 이 비교는 현재 브라우저에 저장된 내 문답을 바꾸지 않아요.</p>' + renderComparisonRows(peer.first, peer.second, '초대한 사람', '응답한 사람') + '<div class="button-row" style="margin-top:25px"><button type="button" class="button secondary" data-action="copy-current-compare">' + icon('copy') + '이 비교 링크 복사</button><button type="button" class="button soft" data-action="clear-invite">비교 링크 닫기</button></div></section>';
  }
  if (peer && !isComplete(state.answers)) {
    return content + '<section class="panel"><div class="invite-banner"><h2>대화 초대가 도착했어요.</h2><p>상대가 자신의 관계 카드를 나눴어요. 먼저 나의 마음을 골라주면 두 사람의 답변을 나란히 볼 수 있어요.</p><button class="button primary" type="button" data-action="start-quiz">내 마음문답 작성하기 ' + '' + '</button></div><p class="hint">답변을 작성하는 동안 상대의 답변은 따로 보여주지 않아요. 내 답변은 공유에 동의하기 전까지 이 브라우저에만 저장돼요.</p><button class="text-button" type="button" data-action="clear-invite">이 초대 닫기</button></section>';
  }
  if (peer && isComplete(state.answers)) {
    return content + '<section class="panel"><div class="card-meta"><p class="eyebrow">OUR CONNECTION CARD</p><button class="text-button" type="button" data-action="clear-invite">초대 닫기</button></div>' + renderComparisonRows(peer.first, state.answers, '초대한 사람', '나의 답변') + renderSharePanel('return') + '</section>';
  }
  if (!isComplete(state.answers)) {
    return content + '<section class="empty-state"><div class="empty-heart">♡</div><h2>나의 마음부터 알아볼까요?</h2><p>8개의 문답을 마치면 초대 링크를 만들 수 있어요.<br>상대가 답하면 같은 점과 다른 점을 함께 살펴봐요.</p><button type="button" class="button primary" data-action="start-quiz">마음문답 시작하기 ' + '' + '</button></section><div class="soft-strip">' + icon('leaf') + '<p>알고 있는 사람과 링크를 직접 나누는 기능이에요. 새로운 상대를 자동으로 소개하거나 메시지를 보내지는 않아요.</p></div>';
  }
  return content + '<section class="panel"><div class="result-banner">' + icon('compare') + '<div><h2>대화에 초대할 준비가 됐어요.</h2><p>내 답변을 링크로 나누고, 상대가 고른 마음도 만나보세요.<br>이름이나 연락처는 입력하지 않아도 돼요.</p></div></div><div class="inline-note"><strong>이렇게 함께해요</strong><br>① 아래에서 공개에 동의하고 초대 링크 만들기<br>② 원하는 사람에게 링크 직접 전달하기<br>③ 상대가 문답 후 만들어준 비교 링크로 함께 보기</div>' + renderSharePanel('invite') + '</section>';
}
function filteredCards() {
  return CARDS.filter(function(card) { return cardFilter === 'all' || (cardFilter === 'saved' ? state.favorites.includes(card.id) : card.category === cardFilter); });
}
function conversationCard(card, featured) {
  return '<article class="conversation-card' + (featured ? ' featured' : '') + '"><div class="card-meta"><span class="topic-tag">' + escapeHtml(card.category) + '</span>' + favoriteButton(card) + '</div><h2 class="question-text">' + escapeHtml(card.question) + '</h2><div class="question-bottom"><span class="question-number">' + (featured ? '지금 나눠볼 질문' : 'A MOMENT TO CONNECT') + '</span><button type="button" class="text-button" data-action="copy-question" data-id="' + card.id + '">' + icon('copy') + '질문 복사</button></div></article>';
}
function renderCards() {
  const cards = filteredCards();
  const filters = [{value:'all',label:'전체 질문'}].concat(CATEGORIES.map(function(category) { return {value:category,label:category}; })).concat([{value:'saved',label:'저장한 질문 ' + state.favorites.length}]);
  return heading('LET’S START WITH A QUESTION', '마음을 나누는 대화카드', '오늘의 우리에게 어울리는 질문을 골라보세요.') +
    '<div class="filters" aria-label="대화카드 주제">' + filters.map(function(filter) { return '<button type="button" class="filter-button' + (cardFilter === filter.value ? ' active' : '') + '" data-action="filter" data-filter="' + escapeHtml(filter.value) + '" aria-pressed="' + (cardFilter === filter.value) + '">' + escapeHtml(filter.label) + '</button>'; }).join('') + '</div>' +
    '<div class="cards-toolbar"><p>' + (cardFilter === 'saved' ? '마음에 닿아 저장해둔 ' : '함께 나눌 수 있는 ') + cards.length + '개의 질문</p><button type="button" class="button secondary small" data-action="draw-card" ' + (!cards.length ? 'disabled' : '') + '>' + icon('shuffle') + '질문 하나 뽑기</button></div>' +
    (featuredCard && cards.some(function(card) { return card.id === featuredCard.id; }) ? '<div class="featured-area" style="margin-bottom:22px">' + conversationCard(featuredCard, true) + '</div>' : '') +
    (cards.length ? '<div class="cards-grid">' + cards.map(function(card) { return conversationCard(card); }).join('') + '</div>' : '<section class="empty-state"><div class="empty-heart">♡</div><h2>아직 저장한 질문이 없어요.</h2><p>다시 나누고 싶은 질문의 하트를 눌러보세요.<br>마음에 남은 질문을 여기에서 만날 수 있어요.</p><button type="button" class="button secondary" data-action="filter" data-filter="all">전체 질문 둘러보기</button></section>');
}
function renderSettings() {
  const savedText = state.savedAt ? new Date(state.savedAt).toLocaleString('ko-KR', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '아직 저장한 기록이 없어요';
  return heading('MY SPACE, MY CHOICE', '나의 저장 공간', '내 답변과 질문을 직접 관리할 수 있어요.') +
    '<div class="settings-grid"><section class="panel"><h2>이 브라우저에 남긴 마음</h2><p>별도 계정 없이 현재 기기의 이 브라우저에 저장해요. 다른 기기에는 자동으로 동기화되지 않아요.</p><div class="settings-summary"><div><b>' + answeredCount(state.answers) + '<small> / 8</small></b>작성한 문답</div><div><b>' + state.favorites.length + '</b>저장한 질문</div></div><p class="hint">최근 변경: ' + escapeHtml(savedText) + '</p><button type="button" class="button secondary" data-action="start-quiz">' + (isComplete(state.answers) ? '관계 카드 보기' : '문답 이어하기') + '</button></section>' +
    '<section class="panel"><h2>백업하고 이어서 쓰기</h2><p>브라우저 데이터가 지워지면 기록도 사라질 수 있어요. JSON 파일로 내려받아 보관하거나 다른 기기에서 복원해보세요.</p><div class="button-row"><button type="button" class="button secondary" data-action="export">' + icon('download') + 'JSON 백업</button><button type="button" class="button secondary" data-action="import">' + icon('upload') + '백업 가져오기</button></div><p class="hint">백업에는 내 답변과 저장한 질문만 포함돼요. 초대 링크로 받은 상대 답변은 백업하지 않아요. 파일은 암호화되지 않으므로 직접 안전하게 보관해주세요.</p></section>' +
    '<section class="panel wide"><h2>저장과 공유 안내</h2><p>문답과 저장한 질문을 서버로 전송하지 않아요. 직접 만든 초대·비교 링크에는 답변이 포함되므로 링크를 가진 사람이 읽을 수 있어요. 외부 분석 도구, 광고, 유료 API는 사용하지 않아요.</p><details><summary>링크로 공유하면 무엇이 공개되나요?</summary><p>초대 링크에는 초대한 사람이 선택한 8개 답변, 비교 링크에는 두 사람이 선택한 각 8개 답변이 담겨요. 이름·연락처·브라우저의 다른 데이터는 담지 않아요. 링크의 # 뒤 데이터는 일반 웹 요청에서 서버로 전송되지 않지만, 링크를 복사한 메신저나 브라우저 기록에는 남을 수 있어요. 공유한 링크의 공개를 취소하는 기능은 없어요.</p></details><details><summary>문답 결과는 어떤 의미인가요?</summary><p>관계 카드는 내가 선택한 답변을 정리한 것이에요. 성격·심리 진단, 상담, 검증된 궁합 점수를 제공하지 않아요. 같은 답과 다른 답을 계기로 직접 대화해보세요.</p></details><details><summary>브라우저 저장의 한계가 있나요?</summary><p>기기 교체, 시크릿 모드 종료, 브라우저 데이터 삭제 시 기록이 사라질 수 있어요. 공용 기기에서는 사용 후 전체 삭제를 권해요. 앱 자체 잠금이나 암호화 보관 기능은 없으며 로그인·서버 동기화도 지원하지 않아요. 중요한 기록은 JSON 백업을 받아주세요.</p></details></section>' +
    '<section class="panel wide"><h2>처음부터 다시 시작하기</h2><p>이 브라우저에 저장된 내 답변과 질문을 모두 삭제해요. 현재 열려 있는 초대 데이터도 닫아요. 이미 전달한 링크와 내려받은 백업 파일은 삭제되지 않아요.</p><button type="button" class="button danger" data-action="delete-all">내 데이터 전체 삭제</button></section></div>';
}
function renderNavigation() {
  const html = routes.map(function(item) { return '<button type="button" class="nav-button" data-route="' + item.id + '" ' + (route === item.id ? 'aria-current="page"' : '') + '>' + icon(item.icon) + '<span>' + item.label + '</span></button>'; }).join('');
  $('.desktop-nav').innerHTML = html;
  $('.mobile-nav').innerHTML = html;
  $('#route-label').textContent = routes.find(function(item) { return item.id === route; }).label;
}
function render() {
  generatedLink = '';
  renderNavigation();
  const views = {home:renderHome,quiz:renderQuiz,compare:renderCompare,cards:renderCards,settings:renderSettings};
  $('#main-content').innerHTML = views[route]();
  document.title = (route === 'home' ? '마음이 닿는 시작' : routes.find(function(item) { return item.id === route; }).label) + ' — 한눈애';
  updateStorageNotice();
}
function focusTitle() {
  const title = $('#page-title');
  if (title) { title.tabIndex = -1; title.focus({preventScroll:true}); }
}
function navigate(next) {
  if (!routes.some(function(item) { return item.id === next; })) return;
  route = next;
  render();
  window.scrollTo({top:0,behavior:'instant'});
  focusTitle();
}
function startQuiz() {
  if (isComplete(state.answers)) state.questionIndex = QUESTIONS.length;
  else if (state.questionIndex >= QUESTIONS.length) state.questionIndex = state.answers.indexOf(null);
  navigate('quiz');
}
async function copyText(text, successMessage) {
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('fallback');
    await navigator.clipboard.writeText(text);
    toast(successMessage || '복사했어요.');
    return true;
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('aria-label','복사할 내용');
    area.style.position = 'fixed';
    area.style.top = '-10000px';
    document.body.appendChild(area);
    area.select();
    let success = false;
    try { success = document.execCommand('copy'); } catch (_) {}
    area.remove();
    if (success) toast(successMessage || '복사했어요.');
    else toast('자동 복사가 되지 않아요. 표시된 링크나 문구를 길게 눌러 복사해주세요.');
    return success;
  }
}
function cleanInvite() {
  history.replaceState(null, '', location.pathname + location.search);
  peer = null;
  shareError = '';
  generatedLink = '';
}
function exportBackup() {
  try {
    const text = JSON.stringify(makeBackup(state), null, 2);
    const stamp = new Date().toISOString().slice(0,10);
    if (window.HannunNativeWeb.post({ type: 'downloadText', name: 'hannunae-backup-' + stamp + '.json', mime: 'application/json', text: text })) {
      toast('백업 파일 저장 위치를 선택해 주세요.');
      return;
    }
    const blob = new Blob([text],{type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'hannunae-backup-' + stamp + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    toast('백업 파일 내려받기를 시작했어요.');
  } catch (_) { toast('백업 파일을 만들지 못했어요. 브라우저의 다운로드 설정을 확인해주세요.'); }
}
function deleteAll() {
  let removed = true;
  try { localStorage.removeItem(STORAGE_KEY); }
  catch (_) { removed = false; }
  if (!removed) {
    toast('브라우저 저장소에 접근할 수 없어 삭제 여부를 확인할 수 없어요. 브라우저 설정에서 사이트 데이터를 삭제해주세요.');
    return;
  }
  state = emptyState();
  storageLocked = false;
  storageIssue = '';
  cardFilter = 'all';
  featuredCard = null;
  cleanInvite();
  navigate('home');
  toast('이 브라우저의 한눈애 데이터를 모두 삭제했어요.');
}
document.addEventListener('click', async function(event) {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main-content').focus({preventScroll:false}); return; }
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { navigate(routeButton.dataset.route); return; }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'start-quiz') startQuiz();
  else if (action === 'next-question') {
    if (state.answers[state.questionIndex] === null) return;
    if (state.questionIndex < QUESTIONS.length - 1) state.questionIndex += 1;
    else if (isComplete(state.answers)) state.questionIndex = QUESTIONS.length;
    else state.questionIndex = state.answers.indexOf(null);
    persist();
    render();
    window.scrollTo({top:0,behavior:'instant'});
    focusTitle();
  } else if (action === 'previous-question') {
    state.questionIndex = Math.max(0,state.questionIndex - 1);
    persist(); render(); focusTitle();
  } else if (action === 'edit-answer') {
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= QUESTIONS.length) return;
    state.questionIndex = index;
    persist();
    navigate('quiz');
  } else if (action === 'favorite') {
    const id = button.dataset.id;
    if (!CARDS.some(function(card) { return card.id === id; })) return;
    const saved = state.favorites.includes(id);
    state.favorites = saved ? state.favorites.filter(function(value) { return value !== id; }) : state.favorites.concat(id);
    const stored = persist();
    render();
    const focus = document.querySelector('[data-action="favorite"][data-id="' + id + '"]');
    if (focus) focus.focus({preventScroll:true});
    toast(stored ? (saved ? '저장한 질문에서 지웠어요.' : '다시 나누고 싶은 질문에 저장했어요.') : (saved ? '이 탭에서만 질문을 제외했어요. 저장 안내를 확인해주세요.' : '이 탭에 임시로 보관했어요. 저장 안내를 확인해주세요.'));
  } else if (action === 'copy-question') {
    const card = CARDS.find(function(item) { return item.id === button.dataset.id; });
    if (card) await copyText(card.question + '\n\n한눈애 — 마음을 나누는 대화카드', '대화 질문을 복사했어요.');
  } else if (action === 'copy-result') {
    if (!isComplete(state.answers)) return;
    const lines = QUESTIONS.map(function(q, i) { return q.topic + ': ' + q.options[state.answers[i]]; });
    await copyText('한눈애 — 나의 관계 카드\n\n' + lines.join('\n') + '\n\n내가 선택한 답변의 요약입니다. 심리 진단이나 궁합 평가가 아닙니다.', '나의 관계 카드를 복사했어요.');
  } else if (action === 'filter') {
    const value = button.dataset.filter;
    if (value !== 'all' && value !== 'saved' && !CATEGORIES.includes(value)) return;
    cardFilter = value;
    featuredCard = null;
    render();
    const current = document.querySelector('.filter-button.active');
    if (current) current.focus({preventScroll:true});
  } else if (action === 'draw-card') {
    let cards = filteredCards();
    if (!cards.length) return;
    if (featuredCard && cards.length > 1) cards = cards.filter(function(card) { return card.id !== featuredCard.id; });
    featuredCard = cards[Math.floor(Math.random() * cards.length)];
    render();
    const area = $('.featured-area');
    if (area) { area.scrollIntoView({behavior:'smooth',block:'center'}); const title = area.querySelector('h2'); title.tabIndex = -1; title.focus({preventScroll:true}); }
  } else if (action === 'generate-link') {
    const consent = $('#share-consent');
    if (!consent || !consent.checked || !isComplete(state.answers)) return;
    const returning = button.dataset.mode === 'return';
    if (returning && (!peer || peer.type !== 'invite')) return;
    try {
      const fragment = makeShareFragment(state.answers, returning ? peer.first : null);
      generatedLink = shareUrl(fragment);
      $('#share-url').value = generatedLink;
      $('#generated-link').hidden = false;
      $('#share-url').focus();
      $('#share-url').select();
      toast('링크를 만들었어요. 원하는 사람에게 직접 전달해주세요.');
    } catch (error) { toast(error.message); }
  } else if (action === 'copy-link') {
    if (generatedLink && $('#share-consent') && $('#share-consent').checked) await copyText(generatedLink, '링크를 복사했어요. 원하는 사람에게 직접 보내주세요.');
  } else if (action === 'native-share') {
    if (!generatedLink || !$('#share-consent') || !$('#share-consent').checked) return;
    if (window.HannunNativeWeb.post({ type: 'share', title: '한눈애 — 우리 마음을 나눠볼까요?', text: '8개의 질문으로 서로를 조금 더 알아가요.', url: generatedLink })) return;
    if (typeof navigator.share !== 'function') return;
    try { await navigator.share({title:'한눈애 — 우리 마음을 나눠볼까요?',text:'8개의 질문으로 서로를 조금 더 알아가요.',url:generatedLink}); }
    catch (error) { if (error.name !== 'AbortError') toast('공유 창을 열지 못했어요. 링크 복사를 이용해주세요.'); }
  } else if (action === 'copy-current-compare') {
    if (peer && peer.type === 'compare') await copyText(shareUrl(location.hash),'두 사람의 답변이 담긴 비교 링크를 복사했어요.');
  } else if (action === 'clear-invite') {
    cleanInvite(); navigate('compare'); toast('현재 초대 데이터를 닫았어요.');
  } else if (action === 'export') exportBackup();
  else if (action === 'import') { $('#backup-input').value = ''; $('#backup-input').click(); }
  else if (action === 'delete-all') ask('저장한 마음을 모두 지울까요?', '내 문답과 저장한 질문을 이 브라우저에서 삭제합니다. 되돌릴 수 없으니 필요하면 먼저 JSON 백업을 받아주세요. 이미 공유한 링크와 내려받은 파일은 삭제되지 않습니다.', deleteAll, '전체 삭제');
});
document.addEventListener('change', function(event) {
  if (event.target.matches('input[name="answer"]')) {
    const value = Number(event.target.value);
    if (!QUESTIONS[state.questionIndex] || !Number.isInteger(value) || value < 0 || value >= QUESTIONS[state.questionIndex].options.length) return;
    state.answers[state.questionIndex] = value;
    const stored = persist();
    if (!stored && $('.quiz-footnote')) $('.quiz-footnote').textContent = '현재 답변은 이 탭에 임시로 남아 있어요. 저장 안내를 확인해주세요.';
    const next = $('[data-action="next-question"]');
    if (next) next.disabled = false;
    const progress = $('.progress');
    if (progress) { progress.setAttribute('aria-valuenow',String(answeredCount(state.answers))); progress.firstElementChild.style.width = (answeredCount(state.answers) / QUESTIONS.length * 100) + '%'; }
  } else if (event.target.id === 'share-consent') {
    $('#generate-link-button').disabled = !event.target.checked;
    if (!event.target.checked) {
      generatedLink = '';
      $('#generated-link').hidden = true;
      $('#share-url').value = '';
    }
  }
});
$('#backup-input').addEventListener('change', async function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 100000) { toast('100KB 이하의 한눈애 JSON 백업 파일을 선택해주세요.'); return; }
  let imported;
  try { imported = parseBackup(await file.text()); }
  catch (error) { toast(error.message); return; }
  ask('백업 파일로 바꿀까요?', '현재 내 문답과 저장한 질문을 백업 파일의 내용으로 바꿉니다. 현재 기록을 남기려면 취소하고 먼저 백업해주세요. 상대방의 초대 답변은 가져오지 않습니다.', function() {
    state = imported;
    if (isComplete(state.answers)) state.questionIndex = QUESTIONS.length;
    storageLocked = false;
    const saved = persist();
    featuredCard = null;
    navigate('settings');
    toast(saved ? '백업을 가져왔어요.' : '백업을 화면에 불러왔지만 브라우저 저장은 실패했어요. 원본 파일을 보관해주세요.');
  }, '백업 가져오기');
});
$('#dialog-cancel').addEventListener('click', function() { confirmationCallback = null; $('#confirm-dialog').close(); });
$('#dialog-confirm').addEventListener('click', function() {
  const action = confirmationCallback;
  confirmationCallback = null;
  $('#confirm-dialog').close();
  if (action) action();
});
$('#confirm-dialog').addEventListener('cancel', function() { confirmationCallback = null; });
window.addEventListener('hashchange', function() { readInvitation(); render(); focusTitle(); });
window.addEventListener('storage', function(event) {
  if (event.key === STORAGE_KEY || event.key === null) {
    storageLocked = true;
    storageIssue = '다른 탭에서 기록이 바뀌어 현재 탭의 저장을 멈췄어요. 현재 작업을 백업한 뒤 새로고침하면 최신 기록을 볼 수 있어요.';
    updateStorageNotice();
  }
});
render();

window.addEventListener('hannun-native-result', function (event) {
  const result = event.detail;
  if (!result || result.type !== 'downloadResult') return;
  if (result.ok) toast('파일을 저장했어요.');
  else if (result.cancelled) toast('파일 저장을 취소했어요.');
  else toast('파일을 저장하지 못했어요. 저장 위치와 공간을 확인해 주세요.');
});

})();
