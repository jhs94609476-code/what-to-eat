// 마케팅 활성화 플래그 (구글 애드센스 승인 전에는 false로 두어 상업적 광고 및 쿠팡 링크 차단)
const ENABLE_MARKETING = false;

// 즐겨찾기(찜) 상태 관리 유틸리티
const FavoriteManager = {
  getFavorites() {
    return JSON.parse(localStorage.getItem('favoriteRecipes') || '{}');
  },
  isFavorite(id) {
    return !!this.getFavorites()[id];
  },
  toggleFavorite(id) {
    const favs = this.getFavorites();
    if (favs[id]) {
      delete favs[id];
    } else {
      favs[id] = true;
    }
    localStorage.setItem('favoriteRecipes', JSON.stringify(favs));
    return !favs[id]; // 반환값: 현재 토글된 찜 결과 상태
  }
};

// URL 파라미터 획득 유틸리티
const URLUtils = {
  getParam(key) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }
};

// 카테고리 영문 코드를 국문으로 변환
const categoryMap = {
  korean: '한식레시피',
  chinese: '중식레시피',
  western: '양식레시피',
  japanese: '일식레시피',
  global: '세계레시피',
  side: '반찬레시피',
  tip: '식재료팁'
};

// 국문 카테고리를 영문 탭 아이디 코드로 매핑
const reverseCategoryMap = {
  '한식레시피': 'korean',
  '중식레시피': 'chinese',
  '양식레시피': 'western',
  '일식레시피': 'japanese',
  '세계레시피': 'global',
  '반찬레시피': 'side',
  '식재료팁': 'tip'
};

// 국문 카테고리를 스프레드시트 영문 카테고리 코드 매핑
const categoryCodeMap = {
  '한식레시피': 'what-to-eat-kr',
  '중식레시피': 'what-to-eat-ch',
  '양식레시피': 'what-to-eat-western',
  '일식레시피': 'what-to-eat-jp',
  '세계레시피': 'what-to-eat-global',
  '반찬레시피': 'what-to-eat-side',
  '식재료팁': 'what-to-eat-ingredients'
};

// 스프레드시트 영문 카테고리 코드를 국문 카테고리로 매핑
const reverseCategoryCodeMap = {
  'what-to-eat-kr': '한식레시피',
  'what-to-eat-ch': '중식레시피',
  'what-to-eat-western': '양식레시피',
  'what-to-eat-jp': '일식레시피',
  'what-to-eat-global': '세계레시피',
  'what-to-eat-side': '반찬레시피',
  'what-to-eat-ingredients': '식재료팁'
};

// 동적 URL 규칙 생성 함수
function getRecipeURL(menu) {
  const catCode = categoryCodeMap[menu.category] || menu.category;
  const cleanCat = catCode.trim().replace(/\s+/g, '-');
  const cleanFood = menu.name.trim().replace(/\s+/g, '-');
  const cleanChef = menu.chefName.trim().replace(/\s+/g, '-');
  return `/recipe/${cleanCat}-${cleanFood}-${cleanChef}`;
}

// 동적 URL 규칙 파싱 함수
function parseRecipeURL(pathname) {
  const decoded = decodeURIComponent(pathname);
  const parts = decoded.replace(/^\/|\/$/g, '').split('/');
  const lastPart = parts[parts.length - 1];
  
  const prefixMatch = lastPart.match(/^(what-to-eat-[a-zA-Z0-9]+)-/i);
  if (prefixMatch) {
    const categoryCode = prefixMatch[1];
    const remaining = lastPart.substring(categoryCode.length + 1);
    const subParts = remaining.split('-');
    if (subParts.length >= 2) {
      const chefSlug = subParts.pop();
      const foodName = subParts.join('-');
      return {
        categoryCode,
        foodName,
        chefSlug
      };
    }
  }
  return null;
}

// 블로그 포스팅 형태의 상세 레시피 마크업 생성기
function formatBlogRecipe(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const sections = normalized.split(/\n?(?=\[[^\]]+\]|<[^>]+>|\([^\)]+\)|\{[^\}]+\})/);
  let html = '<div class="space-y-6">';

  sections.forEach(section => {
    const lines = section.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    if (lines.length === 0) return;

    const headerMatch = lines[0].match(/^[\[<({]([^\]>)}]+)[\]>)}]/);
    
    if (headerMatch) {
      const headerTitle = headerMatch[1].trim();
      const sectionLines = lines.slice(1)
        .filter(line => line !== '-' && line !== '*' && line !== '.');
      
      let colorClass = 'text-purple-400';
      let icon = '🧺';
      let isStepSection = false;
      
      const titleLower = headerTitle.toLowerCase();
      if (
        titleLower.includes('재료') || 
        titleLower.includes('기본') || 
        titleLower.includes('고기') || 
        titleLower.includes('채소') || 
        titleLower.includes('야채') ||
        titleLower.includes('해물') ||
        titleLower.includes('오징어') ||
        titleLower.includes('덮밥용') ||
        titleLower.includes('육수')
      ) {
        colorClass = 'text-purple-400';
        icon = '🧺';
      } else if (
        titleLower.includes('양념') || 
        titleLower.includes('소스') || 
        titleLower.includes('계량') || 
        titleLower.includes('스프') || 
        titleLower.includes('다대기') ||
        titleLower.includes('양념장') ||
        titleLower.includes('밑양념') ||
        titleLower.includes('추가양념')
      ) {
        colorClass = 'text-rose-400';
        icon = '🧪';
      } else if (
        titleLower.includes('순서') || 
        titleLower.includes('과정') || 
        titleLower.includes('방법') || 
        titleLower.includes('레시피') || 
        titleLower.includes('조리') ||
        titleLower.includes('만들기') ||
        titleLower.includes('만드는')
      ) {
        colorClass = 'text-orange-400';
        icon = '👩‍🍳';
        isStepSection = true;
      } else if (
        titleLower.includes('팁') || 
        titleLower.includes('마무리') ||
        titleLower.includes('포인트') ||
        titleLower.includes('비법')
      ) {
        colorClass = 'text-emerald-400';
        icon = '💡';
      } else {
        // Fallback default
        colorClass = 'text-purple-400';
        icon = '🧺';
      }

      let contentHtml = '';
      if (isStepSection) {
        sectionLines.forEach(line => {
          const matchColon = line.match(/^(\d+\.\s*[^:]+:)(.*)$/);
          if (matchColon) {
            const stepTitle = matchColon[1];
            const stepDesc = matchColon[2];
            contentHtml += `<div class="mb-5 last:mb-0 leading-[1.7] text-slate-200"><span class="font-bold text-orange-400">${stepTitle}</span>${stepDesc}</div>`;
          } else {
            const matchNumber = line.match(/^(\d+\.)(.*)$/);
            if (matchNumber) {
              const numPrefix = matchNumber[1];
              const remaining = matchNumber[2];
              contentHtml += `<div class="mb-5 last:mb-0 leading-[1.7] text-slate-200"><span class="font-bold text-orange-400">${numPrefix}</span>${remaining}</div>`;
            } else {
              contentHtml += `<div class="mb-5 last:mb-0 leading-[1.7] text-slate-200">${line}</div>`;
            }
          }
        });
      } else {
        sectionLines.forEach(line => {
          contentHtml += `<div class="leading-[1.7] mb-2 last:mb-0 text-slate-200">${line}</div>`;
        });
      }

      // Only add to html if we actually have some text in contentHtml (preventing empty blocks from rendering)
      if (contentHtml) {
        html += `
          <div class="bg-slate-800/50 border border-slate-700/30 rounded-xl p-5 mb-6 text-slate-100 shadow-lg">
            <h3 class="${colorClass} font-extrabold text-lg md:text-xl flex items-center space-x-2 border-b border-slate-700/50 pb-3 mb-4">
              <span>${icon}</span><span>${headerTitle}</span>
            </h3>
            <div class="font-medium" style="font-size: 1.05rem; padding: 0 0.25rem;">${contentHtml}</div>
          </div>
        `;
      }
    } else {
      const rawTextLines = lines
        .filter(line => line !== '-' && line !== '*' && line !== '.');
        
      if (rawTextLines.length > 0) {
        let contentHtml = '';
        rawTextLines.forEach(line => {
          contentHtml += `<div class="leading-[1.7] mb-2 last:mb-0 text-slate-200">${line}</div>`;
        });
        
        if (contentHtml) {
          html += `
            <div class="bg-slate-800/50 border border-slate-700/30 rounded-xl p-5 mb-6 text-slate-100 shadow-lg">
              <div class="font-medium" style="font-size: 1.05rem; padding: 0 0.25rem;">${contentHtml}</div>
            </div>
          `;
        }
      }
    }
  });

  html += '</div>';
  return html;
}

// 둥글고 감성적인 Lucide 스타일의 즐겨찾기(별) SVG 아이콘 생성 헬퍼
function getFavoriteIcon(isFav) {
  if (isFav) {
    return `<svg class="w-5 h-5 text-amber-400 fill-amber-400 transition-all duration-300 pointer-events-none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }
  return `<svg class="w-5 h-5 text-slate-400 hover:text-amber-400 transition-all duration-300 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
}

// 1. 목록 페이지 (category.html) 제어 로직
function initCategoryPage(allMenus) {
  const typeParam = URLUtils.getParam('type') || 'korean';
  const recipeListContainer = document.getElementById('recipeListContainer');
  const categoryTitle = document.getElementById('categoryTitle');
  const categorySubtitle = document.getElementById('categorySubtitle');

  // 모든 탭 스타일 초기화
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

  // 활성 탭 하이라이트 스타일 적용
  const activeNav = document.getElementById(`nav-${typeParam}`);
  if (activeNav) {
    activeNav.classList.remove('text-slate-400', 'font-medium', 'font-semibold');
    const activeColor = typeParam === 'tip' ? 'text-emerald-400' : (typeParam === 'favorite' ? 'text-amber-400' : 'text-purple-400');
    activeNav.classList.add(activeColor, 'bg-slate-800/80', 'border', 'border-slate-700/60', 'font-bold');
  }

  // 데이터 필터링
  let filteredList = [];
  if (typeParam === 'favorite') {
    categoryTitle.textContent = '⭐️ 찜한 레시피 모음';
    categorySubtitle.textContent = '즐겨찾기에 등록된 나만의 보관함 요리입니다.';
    filteredList = allMenus.filter(menu => FavoriteManager.isFavorite(menu.id));
  } else {
    const koreanCategory = categoryMap[typeParam] || '한식';
    if (typeParam === 'tip') {
      categoryTitle.textContent = '📝 식재료 고르는 팁';
      categorySubtitle.textContent = '구글 애드센스 승인을 돕는 유익하고 알찬 식재료 정보 가이드북입니다.';
    } else {
      categoryTitle.textContent = `${koreanCategory} 레시피`;
      categorySubtitle.textContent = `엄선된 오늘의 추천 ${koreanCategory} 요리 리스트입니다.`;
    }
    filteredList = allMenus.filter(menu => menu.category === koreanCategory);
  }

  // 음식 이름(name)을 기준으로 중복 카드 제거 (목록 화면에는 요리당 1개 카드만 노출)
  const uniqueFilteredList = [];
  const seenNames = new Set();
  filteredList.forEach(menu => {
    if (!seenNames.has(menu.name)) {
      seenNames.add(menu.name);
      uniqueFilteredList.push(menu);
    }
  });

  // 렌더링 초기화
  recipeListContainer.innerHTML = '';

  // 결과가 없을 경우 (Empty State)
  if (uniqueFilteredList.length === 0) {
    recipeListContainer.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center glassmorphism rounded-3xl border border-slate-800/60 flex flex-col items-center justify-center space-y-4">
        <span class="text-5xl">🍽️</span>
        <h4 class="text-xl font-bold text-slate-300">표시할 요리가 없습니다.</h4>
        <p class="text-sm text-slate-500 max-w-sm">
          ${typeParam === 'favorite' 
            ? '룰렛을 돌리거나 메뉴 목록에서 마음에 드는 요리 카드의 별(⭐️) 버튼을 눌러 레시피를 보관해 보세요!' 
            : '아직 등록된 레시피 데이터가 없습니다. 스프레드시트 게시 설정을 점검해 주세요.'}
        </p>
      </div>
    `;
    return;
  }

  // 카드 렌더링 루프
  uniqueFilteredList.forEach((menu) => {
    const card = document.createElement('div');
    card.className = 'group relative flex flex-col justify-between p-6 rounded-3xl border border-slate-800/60 bg-slate-900/20 hover:bg-slate-900/40 hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-neon-purple/5 cursor-pointer overflow-hidden';
    
    const isFav = FavoriteManager.isFavorite(menu.id);

    card.innerHTML = `
      <!-- Background decorative blur inside card -->
      <div class="absolute -right-20 -bottom-20 w-44 h-44 bg-purple-900/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-500"></div>

      <div class="relative space-y-3">
        <!-- Card Image Header -->
        <div class="h-44 w-full rounded-2xl overflow-hidden border border-slate-800/80 shadow-md">
          <img src="${menu.image}" alt="${menu.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        </div>

        <!-- Meta Tag & Fav Btn -->
        <div class="flex items-center justify-between pt-1">
          <span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-bold">
            ${menu.category}
          </span>
          <button class="fav-btn p-1.5 rounded-xl hover:bg-slate-800 transition-colors z-10">
            ${getFavoriteIcon(isFav)}
          </button>
        </div>

        <!-- Title & Description -->
        <div class="space-y-1.5">
          <h4 class="text-lg font-black text-white group-hover:text-purple-300 transition-colors">
            ${menu.name}
          </h4>
          <p class="text-xs text-slate-400 leading-relaxed font-medium line-clamp-2">
            ${menu.description}
          </p>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
            ${menu.category}
          </span>
          <span class="text-xs text-purple-400 group-hover:text-purple-300 font-semibold flex items-center space-x-1">
            <span>${menu.category === '식재료 팁' ? '정보 보기' : '레시피 보기'}</span>
            <span class="inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    `;

    // 카드 바디 클릭 시 셰프 선택 페이지로 이동 (징검다리 다리 연결)
    card.addEventListener('click', (e) => {
      // 별표 버튼 클릭 시에는 상세 이동 방지
      if (e.target.closest('.fav-btn')) return;
      const catCode = categoryCodeMap[menu.category] || menu.category;
      window.location.href = `/chefs.html?category=${encodeURIComponent(catCode)}&food=${encodeURIComponent(menu.name)}`;
    });

    // 별표 버튼 클릭 핸들러
    const favBtn = card.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      FavoriteManager.toggleFavorite(menu.id);
      
      if (typeParam === 'favorite') {
        // 즐겨찾기 목록인 경우 카드 자체를 서서히 페이드아웃 후 삭제
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          card.remove();
          // 만약 마지막 카드가 사라졌다면 새로고침하여 Empty State 띄움
          if (recipeListContainer.children.length === 0) {
            initCategoryPage(allMenus);
          }
        }, 300);
      } else {
        // 일반 카테고리 목록인 경우 별표 아이콘만 갱신
        const updatedFav = FavoriteManager.isFavorite(menu.id);
        favBtn.innerHTML = getFavoriteIcon(updatedFav);
      }
    });

    recipeListContainer.appendChild(card);
  });
}

// 2. 상세 페이지 (detail.html) 제어 로직
function initDetailPage(allMenus) {
  const urlInfo = parseRecipeURL(window.location.pathname);
  let menu = null;

  if (urlInfo) {
    const categoryName = reverseCategoryCodeMap[urlInfo.categoryCode];
    // 음식명과 셰프이름(slug)이 모두 일치하는 flat 레시피 데이터 조회
    menu = allMenus.find(item => 
      item.name === urlInfo.foodName && 
      item.category === categoryName &&
      item.chefName.includes(urlInfo.chefSlug)
    );
  }

  // 폴백: URL 매핑 실패 시 id 쿼리 파라미터 기반 매핑 지원
  if (!menu) {
    const idParam = URLUtils.getParam('id');
    menu = allMenus.find(item => item.id === idParam);
  }

  if (!menu) {
    alert('해당하는 요리 정보를 찾을 수 없습니다.');
    window.location.href = '/';
    return;
  }

  // 0. 상단 카테고리 바 하이라이트 활성화
  const catType = reverseCategoryMap[menu.category] || 'korean';
  const activeNav = document.getElementById(`nav-${catType}`);
  if (activeNav) {
    activeNav.classList.remove('text-slate-400', 'font-medium', 'font-semibold');
    const activeColor = catType === 'tip' ? 'text-emerald-400' : 'text-purple-400';
    activeNav.classList.add(activeColor, 'bg-slate-800/80', 'border', 'border-slate-700/60', 'font-bold');
  }

  // 1. 기본 메인 정보 바인딩
  document.getElementById('dishImage').src = menu.image;
  document.getElementById('dishImage').alt = menu.name;
  document.getElementById('dishCategory').textContent = menu.category;
  document.getElementById('dishName').textContent = menu.name;
  document.getElementById('dishDescription').textContent = menu.description.split('\n')[0]; // 첫 줄만 한줄 요약으로 추출

  // 2. 찜 버튼 제어
  const favBtn = document.getElementById('detailFavoriteBtn');
  const updateFavBtnStyle = () => {
    const isFav = FavoriteManager.isFavorite(menu.id);
    favBtn.innerHTML = getFavoriteIcon(isFav);
    if (isFav) {
      favBtn.classList.add('border-amber-500/40', 'bg-amber-950/20');
    } else {
      favBtn.classList.remove('border-amber-500/40', 'bg-amber-950/20');
    }
  };
  updateFavBtnStyle();

  favBtn.addEventListener('click', () => {
    FavoriteManager.toggleFavorite(menu.id);
    updateFavBtnStyle();
  });

  // 3. 블로그 포스트 렌더링 및 하이드레이션 제어
  const recipeBlogContainer = document.getElementById('recipeBlogContainer');
  const recipeChefTitle = document.getElementById('recipeChefTitle');
  if (recipeChefTitle) {
    recipeChefTitle.textContent = `${menu.chefName} ${menu.name} 레시피`;
  }

  // Pre-rendered 콘텐츠가 이미 있는지 확인
  const isPrerendered = recipeBlogContainer && recipeBlogContainer.children.length > 0;

  if (!isPrerendered && recipeBlogContainer) {
    // CSR: 상세 레시피 D열 포스팅 변환 및 노출
    recipeBlogContainer.innerHTML = formatBlogRecipe(menu.description);
  }

  // 4. 동일 메뉴 타 셰프 추천 리스트 동적 구성
  const otherChefsContainer = document.getElementById('otherChefsContainer');
  const otherChefsSection = document.getElementById('otherChefsSection');

  if (otherChefsContainer) {
    otherChefsContainer.innerHTML = '';
    const otherRecipes = allMenus.filter(item => item.name === menu.name && item.id !== menu.id);

    if (otherRecipes.length === 0) {
      if (otherChefsSection) otherChefsSection.style.display = 'none';
    } else {
      if (otherChefsSection) otherChefsSection.style.display = 'block';
      otherRecipes.forEach(recipe => {
        const catCode = categoryCodeMap[recipe.category] || 'what-to-eat-kr';
        const chefSlug = recipe.chefName.split(' ')[0] || '레시피';
        const detailUrl = `/recipe/${catCode}-${recipe.name}-${chefSlug}`;

        const link = document.createElement('a');
        link.href = detailUrl;
        link.className = 'px-4 py-2.5 rounded-2xl border border-slate-800 hover:border-purple-500/50 bg-slate-900/40 hover:bg-purple-950/10 text-xs font-bold text-slate-300 hover:text-purple-300 transition-all duration-300';
        link.textContent = `${recipe.chefName} 레시피 보러가기`;
        
        otherChefsContainer.appendChild(link);
      });
    }
  }

  // 5. 하단 외부 연동 버튼 타겟 설정
  const watchVideoBtn = document.getElementById('watchVideoBtn');
  const shareRecipeBtn = document.getElementById('shareRecipeBtn');

  // 유튜브 영상 링크 매핑
  if (watchVideoBtn) {
    watchVideoBtn.setAttribute('target', '_blank');
    watchVideoBtn.setAttribute('rel', 'noopener noreferrer');
    watchVideoBtn.querySelector('span').textContent = '유튜브 영상 보러가기 🎬';
    if (menu.videoUrl) {
      watchVideoBtn.href = menu.videoUrl;
    } else {
      const searchQuery = menu.category === '식재료 팁' ? menu.name : `${menu.name} ${menu.chefName} 레시피`;
      watchVideoBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    }
  }

  // 레시피 공유 기능
  if (shareRecipeBtn) {
    shareRecipeBtn.onclick = () => {
      const shareText = menu.category === '식재료 팁' 
        ? `📝 유익한 식재료 고르는 가이드 추천!\n주제: '${menu.name}'\n셰프: '${menu.chefName}'\n\n지금 '오늘 뭐 먹지?'에서 상세한 식재료 선별법을 확인해 보세요!`
        : `🎯 셰프의 황금 레시피 추천!\n요리: '${menu.name}'\n셰프: '${menu.chefName}'\n\n지금 '오늘 뭐 먹지?'에서 상세한 조리 비법을 확인해 보세요!`;
      
      if (navigator.share) {
        navigator.share({
          title: `오늘 뭐 먹지? - ${menu.name} (${menu.chefName})`,
          text: shareText,
          url: window.location.href
        }).catch(err => console.log('공유 실패:', err));
      } else {
        navigator.clipboard.writeText(`${shareText}\n\n레시피 링크: ${window.location.href}`)
          .then(() => alert('📋 공유 링크가 클립보드에 복사되었습니다!\n친구에게 붙여넣기(Ctrl+V)하여 전송해 보세요.'))
          .catch(() => alert('공유하기가 지원되지 않는 브라우저 환경입니다.'));
      }
    };
  }

  // 6. 유튜브 라이트박스 모달 연동
  const videoModal = document.getElementById('videoModal');
  const videoModalCard = document.getElementById('videoModalCard');
  const videoPlayerIframe = document.getElementById('videoPlayerIframe');
  const closeVideoModalBtn = document.getElementById('closeVideoModalBtn');

  // 유튜브 라이트박스 모달 연동 (기존 인라인 영상 재생용 모달 제거/비활성화)

  const closeVideoModal = () => {
    videoModal.classList.add('opacity-0');
    videoModalCard.classList.remove('scale-100');
    videoModalCard.classList.add('scale-95');
    setTimeout(() => {
      videoModal.classList.add('hidden');
      videoPlayerIframe.src = ''; // 비디오 정지
    }, 300);
  };

  if (closeVideoModalBtn) {
    closeVideoModalBtn.addEventListener('click', closeVideoModal);
  }
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }
}

// 3. 공통 데이터 캐싱 및 초기화 진입점
let globalAllMenus = null;

async function initApp() {
  try {
    if (!globalAllMenus) {
      globalAllMenus = await SheetsManager.fetchSheetData();
    }

    // 현재 페이지 구분에 따라 라우팅 처리
    const pathname = window.location.pathname;
    if (pathname.includes('category')) {
      initCategoryPage(globalAllMenus);
    } else if (pathname.includes('detail')) {
      initDetailPage(globalAllMenus);
    }
  } catch (error) {
    console.error('레시피 로드 에러:', error);
  }
}

// pageshow 이벤트를 사용해 bfcache(뒤로가기 캐시) 복원 시에도 항상 최신 찜 데이터로 화면을 갱신하도록 처리
window.addEventListener('pageshow', initApp);
