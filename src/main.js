// Web Audio API를 활용한 사운드 제어 클래스
class AudioPlayer {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTick() {
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    // 맑고 경쾌한 틱 소리를 위해 triangle 타입 오실레이터 사용
    osc.type = 'triangle';
    // 짧은 주파수 변화로 타격감 제공
    osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.04);

    // 급격히 감쇠하는 볼륨 엔벨로프 설정 (틱 느낌 극대화)
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.05);
  }
}

// 룰렛 애플리케이션 상태 관리
const state = {
  allMenus: [],        // 전체 메뉴 데이터
  activeMenus: [],     // 현재 필터링되어 활성화된 메뉴 데이터
  activeTab: 'all',    // 현재 활성화된 상단 헤더 탭 ('all' 또는 카테고리 영문 코드)
  isSpinning: false,   // 회전 중 여부
  currentAngle: 0,     // 룰렛의 현재 회전 각도 (라디안)
  angularVelocity: 0,  // 현재 회전 속도
  friction: 0.982,     // 감속 마찰력 (자연스러운 멈춤을 위해 조율)
  lastSectionIndex: -1,// 틱 소리 중복 방지를 위한 직전 인덱스 기록
  colors: [            // 룰렛 세그먼트 고대비 네온/파스텔 컬러 테마
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F97316', // Orange
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
  ]
};

// 즐겨찾기(찜) 상태 관리 유틸리티 (메인 탭 연동을 위해 추가)
const FavoriteManager = {
  getFavorites() {
    return JSON.parse(localStorage.getItem('favoriteRecipes') || '{}');
  },
  isFavorite(id) {
    return !!this.getFavorites()[id];
  }
};

// DOM 요소 획득
const canvas = document.getElementById('rouletteCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const pointerArrow = document.getElementById('pointerArrow');
const categoryFilterContainer = document.getElementById('categoryFilterContainer');
const activeMenuCountEl = document.getElementById('activeMenuCount');
const resultModal = document.getElementById('resultModal');
const modalCard = document.getElementById('modalCard');
const winnerImage = document.getElementById('winnerImage');
const winnerCategory = document.getElementById('winnerCategory');
const winnerName = document.getElementById('winnerName');
const winnerDescription = document.getElementById('winnerDescription');
const viewRecipeBtn = document.getElementById('viewRecipeBtn');
const shareKakaoBtn = document.getElementById('shareKakaoBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBtnTop = document.getElementById('closeModalBtnTop');

const audio = new AudioPlayer();

// Canvas High-DPI 지원 해상도 맞춤 (Retina 등 텍스트 선명도 개선)
function adjustCanvasResolution() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}

// 룰렛 그리기 로직
function drawRoulette() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  // 캔버스 클리어
  ctx.clearRect(0, 0, width, height);

  const len = state.activeMenus.length;

  if (len === 0) {
    // 선택된 카테고리가 없을 때 빈 룰렛 상태 표시
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Noto Sans KR';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('카테고리를 선택해 주세요', centerX, centerY);
    ctx.restore();
    return;
  }

  const arc = (2 * Math.PI) / len;

  state.activeMenus.forEach((menu, i) => {
    const angle = state.currentAngle + i * arc;

    // 1. 부채꼴 조각 그리기
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.closePath();

    // 순환 컬러 적용
    ctx.fillStyle = state.colors[i % state.colors.length];
    ctx.fill();

    // 조각 경계선 입체감을 주기 위한 내부 드로잉
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.restore();

    // 2. 부채꼴 내 텍스트 렌더링
    ctx.save();
    ctx.translate(centerX, centerY);
    // 부채꼴의 중간 각도로 회전
    ctx.rotate(angle + arc / 2);

    // 텍스트 위치 및 스타일링 (부채꼴 칸의 정중앙에 오도록 조율)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Noto Sans KR';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 그림자 효과로 가독성 확보
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // 반지름의 약 58% 지점에 텍스트를 배치하여 정중앙 정렬
    const textX = radius * 0.58;
    
    // 텍스트 길이에 따라 말줄임 처리
    let displayName = menu.name;
    if (displayName.length > 7) {
      displayName = displayName.substring(0, 6) + '..';
    }
    ctx.fillText(displayName, textX, 0);
    ctx.restore();
  });

  // 룰렛 테두리 장식 마감
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#334155';
  ctx.stroke();
  ctx.restore();
}

// 룰렛 정지 시 당첨 결과 판정
function getWinnerMenu() {
  const len = state.activeMenus.length;
  if (len === 0) return null;

  const arc = (2 * Math.PI) / len;
  
  // 12시 방향(상단 중앙)의 각도는 270도, 즉 3/2 * PI 라디안입니다.
  // 룰렛이 시계방향으로 currentAngle만큼 회전했으므로, 
  // 12시 바늘이 가리키는 내부의 상대 각도는 다음과 같이 역산합니다.
  let relativeAngle = (1.5 * Math.PI - state.currentAngle) % (2 * Math.PI);
  if (relativeAngle < 0) {
    relativeAngle += 2 * Math.PI;
  }

  const winnerIndex = Math.floor(relativeAngle / arc) % len;
  return state.activeMenus[winnerIndex];
}

// 핀 통과 시 물리적 '틱' 사운드 및 바늘 흔들림 모션 제어
function updateTickMotion() {
  const len = state.activeMenus.length;
  if (len === 0) return;

  const arc = (2 * Math.PI) / len;
  let relativeAngle = (1.5 * Math.PI - state.currentAngle) % (2 * Math.PI);
  if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

  const currentSectionIndex = Math.floor(relativeAngle / arc) % len;

  // 이전 프레임과 가리키는 인덱스 조각이 달라졌을 때 틱 사운드 발동
  if (currentSectionIndex !== state.lastSectionIndex) {
    state.lastSectionIndex = currentSectionIndex;
    audio.playTick();

    // 핀 튕김 애니메이션 (CSS 트랜지션을 통해 잠깐 기울임)
    pointerArrow.style.transform = 'translateX(-50%) rotate(18deg)';
    setTimeout(() => {
      pointerArrow.style.transform = 'translateX(-50%) rotate(0deg)';
    }, 60);
  }
}

// 룰렛 회전 애니메이션 프레임 루프
function spinLoop() {
  if (state.angularVelocity > 0.0005) {
    // 회전량 누적 및 마찰력 감속
    state.currentAngle += state.angularVelocity;
    state.angularVelocity *= state.friction;

    // 틱 판별
    updateTickMotion();

    // 룰렛 재렌더링
    drawRoulette();

    requestAnimationFrame(spinLoop);
  } else {
    // 완전 멈춤 처리
    state.isSpinning = false;
    spinBtn.disabled = false;

    const changeFoodBtn = document.getElementById('changeFoodBtn');
    const resetBtn = document.getElementById('resetBtn');
    if (changeFoodBtn) changeFoodBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;
    
    // 당첨 메뉴 팝업
    const winner = getWinnerMenu();
    if (winner) {
      showModal(winner);
    }
  }
}

// 룰렛 돌리기 트리거
function startSpin() {
  if (state.isSpinning || state.activeMenus.length === 0) return;

  // Web Audio 초기화
  audio.init();

  state.isSpinning = true;
  spinBtn.disabled = true;

  const changeFoodBtn = document.getElementById('changeFoodBtn');
  const resetBtn = document.getElementById('resetBtn');
  if (changeFoodBtn) changeFoodBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = true;

  // 예측 불가능하도록 초기 속도를 랜덤화 (0.28 ~ 0.48 라디안/프레임)
  state.angularVelocity = 0.28 + Math.random() * 0.2;
  state.lastSectionIndex = -1;

  requestAnimationFrame(spinLoop);
}

// 피셔-예이츠 셔플 함수
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 카테고리 필터 기반 메뉴 동적 갱신
function updateFilteredMenus(keepExistingShuffle = false) {
  let filtered = [];

  if (state.activeTab && state.activeTab !== 'all') {
    // 상단 탭 기준 필터링
    if (state.activeTab === 'favorite') {
      filtered = state.allMenus.filter(menu => FavoriteManager.isFavorite(menu.id));
    } else {
      const tabMap = {
        korean: '한식',
        chinese: '중식',
        western: '양식',
        japanese: '일식',
        side: '반찬',
        tip: '식재료 팁'
      };
      const categoryName = tabMap[state.activeTab];
      filtered = state.allMenus.filter(menu => menu.category === categoryName);
    }
  } else {
    // 좌측 체크박스 기준 필터링
    const checkedBoxes = Array.from(document.querySelectorAll('.category-checkbox:checked'));
    const checkedCategories = checkedBoxes.map(cb => cb.value);

    // 식재료 팁은 정보 콘텐츠이므로 룰렛 추천 풀에서 제외하고 요리 카테고리만 필터링
    filtered = state.allMenus.filter(menu => 
      menu.category !== '식재료 팁' && checkedCategories.includes(menu.category)
    );
  }
  
  // 음식 이름(name)을 기준으로 중복된 레시피 데이터 제거 (룰렛판에는 고유 요리만 노출)
  const uniqueFiltered = [];
  const seenNames = new Set();
  filtered.forEach(item => {
    if (!seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueFiltered.push(item);
    }
  });

  // UI 개수 표기 업데이트 (선택된 카테고리의 고유 메뉴 개수)
  activeMenuCountEl.textContent = uniqueFiltered.length;

  if (uniqueFiltered.length === 0) {
    state.activeMenus = [];
  } else {
    // 기존 셔플 상태 유지가 필요한 경우가 아니라면 새로 랜덤 8개 추출
    if (!keepExistingShuffle) {
      const shuffled = shuffleArray(uniqueFiltered);
      state.activeMenus = shuffled.slice(0, 8);
    }
  }

  const hasMenus = state.activeMenus.length > 0;
  
  // 필터링 결과가 없을 경우 돌리기 및 유틸 버튼 잠금
  const changeFoodBtn = document.getElementById('changeFoodBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  if (changeFoodBtn) changeFoodBtn.disabled = !hasMenus || state.isSpinning;
  if (resetBtn) resetBtn.disabled = state.isSpinning;

  if (!hasMenus) {
    spinBtn.disabled = true;
    spinBtn.classList.add('from-slate-600', 'to-slate-700');
    spinBtn.classList.remove('from-purple-600', 'to-orange-500');
  } else {
    if (!state.isSpinning) {
      spinBtn.disabled = false;
      spinBtn.classList.remove('from-slate-600', 'to-slate-700');
      spinBtn.classList.add('from-purple-600', 'to-orange-500');
    }
  }

  // 각도 초기화 후 재정비된 룰렛 그리기
  state.currentAngle = 0;
  drawRoulette();
}

// 당첨 모달 활성화 및 바인딩
function showModal(menu) {
  // 당첨 정보 입력
  winnerImage.src = menu.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800';
  winnerCategory.textContent = menu.category;
  winnerName.textContent = menu.name;
  winnerDescription.textContent = menu.description;

  // '레시피 보러 가기' 버튼에 동적 액션 (징검다리 셰프 리스트 화면 이동)
  viewRecipeBtn.onclick = () => {
    window.location.href = `/chefs.html?food=${encodeURIComponent(menu.name)}`;
  };

  // '카카오톡으로 공유하기' 네이티브 브라우저 공유 연동
  shareKakaoBtn.onclick = () => {
    const shareText = `🎯 오늘 추천된 음식은 바로 '${menu.name}'입니다!\n"${menu.description}"\n\n지금 메뉴 추천 룰렛을 돌려보세요!`;
    
    if (navigator.share) {
      navigator.share({
        title: '오늘 뭐 먹지? 음식 추천 결과',
        text: shareText,
        url: window.location.href
      }).catch(err => console.log('공유 실패:', err));
    } else {
      // 대체 클립보드 복사
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
        .then(() => alert('📋 추천 결과와 사이트 링크가 클립보드에 복사되었습니다! 카카오톡에 붙여넣기 하세요.'))
        .catch(() => alert('공유하기가 지원되지 않는 환경입니다.'));
    }
  };

  // 모달 페이드인 애니메이션
  resultModal.classList.remove('hidden');
  // 디스플레이 활성화 후 다음 프레임에 트랜지션 실행
  setTimeout(() => {
    resultModal.classList.remove('opacity-0');
    modalCard.classList.remove('scale-95');
    modalCard.classList.add('scale-100');
  }, 50);
}

// 모달 닫기
function closeModal() {
  resultModal.classList.add('opacity-0');
  modalCard.classList.remove('scale-100');
  modalCard.classList.add('scale-95');

  // 트랜지션 지속시간(300ms) 대기 후 실제 hidden 속성 토글
  setTimeout(() => {
    resultModal.classList.add('hidden');
  }, 300);
}

// 상단 헤더 탭 UI 업데이트 함수
function updateActiveTabUI(tabType) {
  const allNavs = document.querySelectorAll('nav a');
  allNavs.forEach(nav => {
    nav.classList.remove('text-purple-400', 'text-emerald-400', 'text-amber-400', 'bg-slate-800/80', 'border', 'border-slate-700/60', 'font-bold');
    nav.classList.add('text-slate-400');
    if (nav.id === 'nav-favorite') {
      nav.classList.remove('font-medium');
      nav.classList.add('font-semibold');
    } else {
      nav.classList.remove('font-bold');
      nav.classList.add('font-medium');
    }
  });

  if (tabType && tabType !== 'all') {
    const activeNav = document.getElementById(`nav-${tabType}`);
    if (activeNav) {
      activeNav.classList.remove('text-slate-400', 'font-medium', 'font-semibold');
      const activeColor = tabType === 'tip' ? 'text-emerald-400' : (tabType === 'favorite' ? 'text-amber-400' : 'text-purple-400');
      activeNav.classList.add(activeColor, 'bg-slate-800/80', 'border', 'border-slate-700/60', 'font-bold');
    }
  }
}

// 초기 이벤트 설정
function initEvents() {
  // 룰렛 회전 버튼
  spinBtn.addEventListener('click', startSpin);

  // 카테고리 필터 체크박스 바인딩
  categoryFilterContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('category-checkbox')) {
      // 체크박스를 마우스로 개별 토글하면 상단 헤더 탭 선택 상태 해제
      state.activeTab = 'all';
      updateActiveTabUI('all');
      updateFilteredMenus();
    }
  });

  // 헤더 탭 메뉴 클릭 이벤트 바인딩 (메인 화면에서 탭 변경 시 페이지 이동을 막고 필터 연동)
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // 페이지 리다이렉트 방지
      
      if (state.isSpinning) return; // 룰렛 회전 중에는 필터 교체 금지

      const id = link.id; // nav-korean, nav-chinese, etc.
      const tabType = id.replace('nav-', '');

      if (state.activeTab === tabType) {
        // 동일한 탭 클릭 시 필터 해제 및 전체 체크박스 켜기
        state.activeTab = 'all';
        updateActiveTabUI('all');
        const checkboxes = categoryFilterContainer.querySelectorAll('.category-checkbox');
        checkboxes.forEach(cb => cb.checked = true);
      } else {
        state.activeTab = tabType;
        updateActiveTabUI(tabType);

        // 체크박스 동기화 (선택한 탭의 카테고리만 체크 활성화, 나머지는 해제)
        const checkboxes = categoryFilterContainer.querySelectorAll('.category-checkbox');
        const tabToCheckboxValue = {
          korean: '한식',
          chinese: '중식',
          western: '양식',
          japanese: '일식',
          side: '반찬'
        };
        const activeCheckboxValue = tabToCheckboxValue[tabType];
        checkboxes.forEach(cb => {
          cb.checked = cb.value === activeCheckboxValue;
        });
      }

      updateFilteredMenus();
    });
  });

  // 룰렛 음식 변경하기 버튼 바인딩
  const changeFoodBtn = document.getElementById('changeFoodBtn');
  if (changeFoodBtn) {
    changeFoodBtn.addEventListener('click', () => {
      if (!state.isSpinning) {
        updateFilteredMenus(false); // 강제 재셔플
      }
    });
  }

  // 리셋하기 버튼 바인딩
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!state.isSpinning) {
        state.activeTab = 'all';
        updateActiveTabUI('all');
        const checkboxes = categoryFilterContainer.querySelectorAll('.category-checkbox');
        checkboxes.forEach(cb => cb.checked = true);
        updateFilteredMenus(false); // 전체 셔플 초기화
      }
    });
  }

  // 모달 닫기 바인딩
  closeModalBtn.addEventListener('click', closeModal);
  closeModalBtnTop.addEventListener('click', closeModal);
  resultModal.addEventListener('click', (e) => {
    if (e.target === resultModal) closeModal();
  });

  // 윈도우 리사이즈 시 해상도 조정
  window.addEventListener('resize', () => {
    adjustCanvasResolution();
    drawRoulette();
  });
}

// 애플리케이션 진입점
async function initApp() {
  try {
    // 구글 스프레드시트 데이터 연동
    state.allMenus = await SheetsManager.fetchSheetData();

    // 초기 해상도 조율 및 그리기
    adjustCanvasResolution();
    initEvents();
    updateFilteredMenus();
  } catch (error) {
    console.error('애플리케이션 초기화 에러:', error);
    alert('음식 데이터 로드에 실패했습니다. 스프레드시트 게시 상태 및 sheets.js 설정을 확인해 주세요.');
  }
}

// 실행
document.addEventListener('DOMContentLoaded', initApp);
