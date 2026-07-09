const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

const SPREADSHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStAETGqwhy2ux_FQAzPeS_bPUu_pIk_F7n79vO7LKCgAZ1KYHnqJ37WX5c2Higqtzx8gG6HBq7zouS/pub?gid=0&single=true&output=csv';

const SITE_DOMAIN = 'https://what-to-eat-roulette.vercel.app';


const categoryCodeMap = {
  '한식레시피': 'what-to-eat-kr',
  '중식레시피': 'what-to-eat-ch',
  '양식레시피': 'what-to-eat-western',
  '일식레시피': 'what-to-eat-jp',
  '세계레시피': 'what-to-eat-global',
  '반찬레시피': 'what-to-eat-side',
  '식재료팁': 'what-to-eat-ingredients'
};

const reverseCategoryCodeMap = {
  'what-to-eat-kr': '한식레시피',
  'what-to-eat-ch': '중식레시피',
  'what-to-eat-western': '양식레시피',
  'what-to-eat-jp': '일식레시피',
  'what-to-eat-global': '세계레시피',
  'what-to-eat-side': '반찬레시피',
  'what-to-eat-ingredients': '식재료팁'
};


const foodImageKeywordMap = {
  '제육볶음': 'https://images.unsplash.com/photo-1664978735390-ea4f2e519280?auto=format&fit=crop&q=80&w=800',
  '김치찌개': 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=80&w=800',
  '까르보나라': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=800',
  '해장파스타': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800',
  '짬뽕': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800',
  '오야꼬동': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800',
  '오야코동': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800',
  '마파두부': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=80&w=800',
  '돈카츠': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=800',
  '계란말이': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&q=80&w=800',
  '짜장면': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800',
  '초밥 (스시)': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800',
  '초밥': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800',
  '소고기 고르는 법': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
  '생선 고르는 법': 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&q=80&w=800'
};

function getFoodImage(name) {
  const cleanName = name.trim();
  if (foodImageKeywordMap[cleanName]) {
    return foodImageKeywordMap[cleanName];
  }
  for (const key of Object.keys(foodImageKeywordMap)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return foodImageKeywordMap[key];
    }
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800';
}

// 유튜브 비디오 ID 파서
function getYoutubeId(url) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

// 디렉토리 및 파일 복사 유틸
function copyFileOrFolderSync(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((child) => {
      copyFileOrFolderSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
}

// RFC 4180 규격 준수 CSV 파서
function parseCSV(csvText) {
  const rows = [];
  let inQuotes = false;
  let currentField = '';
  let currentRow = [];

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some(x => x !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentField += char;
      }
    }
  }
  if (currentRow.length > 0 || currentField !== '') {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

// CSV 데이터를 JSON 객체로 파싱
function parseCSVToMenus(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];

  let backupLookup = {};
  try {
    const backupPath = path.join(SRC_DIR, 'data.json');
    if (fs.existsSync(backupPath)) {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      backupData.forEach(item => {
        backupLookup[item.name] = {
          image: item.image,
          coupangLink: item.coupangLink
        };
      });
    }
  } catch (e) {
    console.warn('백업 data.json 로드 실패:', e);
  }

  const menuList = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const categoryCode = row[0] ? row[0].trim() : '';
    const name = row[1] ? row[1].trim() : '';
    if (!name) continue;

    const chefName = row[2] ? row[2].trim() : '레시피';
    const description = row[3] ? row[3].trim() : '';
    const videoUrl = row[4] ? row[4].trim() : '';

    const displayCategory = reverseCategoryCodeMap[categoryCode] || categoryCode;

    // 음식명 기반 자동 이미지 추출 및 쿠팡링크 매칭
    const matchedMeta = backupLookup[name] || {};
    const image = getFoodImage(name);
    const coupangLink = matchedMeta.coupangLink || `https://www.coupang.com/np/search?q=${encodeURIComponent(name + ' 밀키트')}`;

    menuList.push({
      id: `${name}-${chefName}`,
      name: name,
      category: displayCategory,
      description: description,
      image: image,
      coupangLink: coupangLink,
      chefName: chefName,
      videoUrl: videoUrl,
      videoId: getYoutubeId(videoUrl)
    });
  }

  return menuList;
}

// 로컬 data.json 평탄화 (스프레드시트 로드 실패 시 폴백용)
function flattenData(nestedMenus) {
  const flat = [];
  nestedMenus.forEach(menu => {
    if (menu.chefs && menu.chefs.length > 0) {
      menu.chefs.forEach(chef => {
        const tipPart = chef.tip ? `[추천 팁]\n${chef.tip}\n\n` : '';
        const ingPart = chef.ingredients && chef.ingredients.length > 0 
          ? `[일반 재료]\n${chef.ingredients.join(', ')}\n\n` 
          : '';
        const recipePart = chef.recipe && chef.recipe.length > 0 
          ? `[조리 순서]\n${chef.recipe.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}` 
          : '';
        const blogText = `${tipPart}${ingPart}${recipePart}`;

        flat.push({
          id: chef.id || `${menu.id}-${chef.chefName.split(' ')[0]}`,
          name: menu.name,
          category: menu.category,
          description: chef.description || blogText,
          image: menu.image,
          coupangLink: menu.coupangLink,
          chefName: chef.chefName.split(' ')[0],
          videoUrl: chef.videoUrl || '',
          videoId: getYoutubeId(chef.videoUrl || '')
        });
      });
    } else {
      flat.push({
        id: menu.id,
        name: menu.name,
        category: menu.category,
        description: menu.description,
        image: menu.image,
        coupangLink: menu.coupangLink,
        chefName: '레시피',
        videoUrl: '',
        videoId: ''
      });
    }
  });
  return flat;
}

// 블로그 포스팅 형태의 상세 레시피 마크업 생성기
function formatBlogRecipe(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n');
  const sections = normalized.split(/\n?(?=\[[^\]]+\])/);
  let html = '<div class="space-y-10">';

  sections.forEach(section => {
    const lines = section.trim().split('\n');
    const headerMatch = lines[0].match(/^\[([^\]]+)\]/);
    
    if (headerMatch) {
      const headerTitle = headerMatch[1];
      const contentText = lines.slice(1).join('\n').trim();
      
      let colorClass = 'text-purple-700';
      let icon = '🧺';
      
      if (headerTitle.includes('재료')) {
        colorClass = 'text-purple-700';
        icon = '🧺';
      } else if (headerTitle.includes('양념') || headerTitle.includes('소스') || headerTitle.includes('계량')) {
        colorClass = 'text-rose-600';
        icon = '🧪';
      } else if (headerTitle.includes('순서') || headerTitle.includes('과정') || headerTitle.includes('방법') || headerTitle.includes('레시피')) {
        colorClass = 'text-orange-600';
        icon = '👩‍🍳';
      } else if (headerTitle.includes('팁')) {
        colorClass = 'text-emerald-700';
        icon = '💡';
      }

      html += `
        <div class="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl relative text-slate-800">
          <h3 class="${colorClass} font-black text-xl md:text-2xl flex items-center space-x-2.5 border-b border-slate-200 pb-4 mb-6">
            <span>${icon}</span><span>${headerTitle}</span>
          </h3>
          <div class="whitespace-pre-wrap tracking-wide font-medium" style="font-size: 1.1rem; line-height: 1.8; color: #333333; padding: 0 0.5rem;">
            ${contentText}
          </div>
        </div>
      `;
    } else {
      const rawText = section.trim();
      if (rawText) {
        html += `
          <div class="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl text-slate-800">
            <div class="whitespace-pre-wrap tracking-wide font-medium" style="font-size: 1.1rem; line-height: 1.8; color: #333333; padding: 0 0.5rem;">
              ${rawText}
            </div>
          </div>
        `;
      }
    }
  });

  html += '</div>';
  return html;
}

// 비동기 빌드 프로세스 실행기
async function runBuild() {
  console.log('🚀 완벽한 클린 정적 사이트 생성(SSG) 빌드를 시작합니다...');

  // 1단계: 기존 dist 폴더 완벽 삭제 (클린 빌드)
  if (fs.existsSync(DIST_DIR)) {
    console.log('🧹 기존 dist 폴더를 완벽하게 삭제하는 중...');
    let retries = 5;
    while (retries > 0) {
      try {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
        console.log('✅ dist 폴더 삭제 완료.');
        break;
      } catch (err) {
        retries--;
        console.warn(`⚠️ dist 폴더 삭제 오류 (재시도 중... 남은 횟수: ${retries}):`, err.message);
        if (retries === 0) {
          console.error('❌ dist 폴더 강제 비우기를 진행합니다.');
          try {
            const files = fs.readdirSync(DIST_DIR);
            for (const file of files) {
              fs.rmSync(path.join(DIST_DIR, file), { recursive: true, force: true });
            }
          } catch (cleanErr) {
            console.error('❌ dist 폴더 내부 비우기 실패:', cleanErr.message);
          }
        } else {
          // 100ms 대기 후 재시도
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
      }
    }
  }

  // dist 폴더 생성
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // 2단계: 구글 스프레드시트 CSV URL로부터 데이터 패칭
  let allMenus = [];
  console.log(`🌐 구글 스프레드시트 CSV 데이터를 패칭하는 중:\n   ${SPREADSHEET_CSV_URL}`);
  try {
    const response = await fetch(SPREADSHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
    const csvText = await response.text();
    allMenus = parseCSVToMenus(csvText);
    console.log(`✅ 구글 스프레드시트 파싱 완료: 총 ${allMenus.length}개의 레시피 획득`);
  } catch (err) {
    console.warn('❌ 구글 스프레드시트 로드 중 에러 발생. 로컬 data.json으로 대체합니다.', err.message);
    try {
      const nestedData = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'data.json'), 'utf-8'));
      allMenus = flattenData(nestedData);
      console.log(`✅ 로컬 data.json 폴백 적용 완료: 총 ${allMenus.length}개의 레시피 로드`);
    } catch (fallbackErr) {
      console.error('❌ 로컬 data.json 로드 실패. 빌드를 중단합니다.', fallbackErr.message);
      process.exit(1);
    }
  }

  // 3단계: 기본 정적 리소스 파일 복사 (src -> dist)
  console.log('📁 정적 자산 및 기본 파일 복사 중...');
  if (fs.existsSync(SRC_DIR)) {
    fs.readdirSync(SRC_DIR).forEach((item) => {
      copyFileOrFolderSync(path.join(SRC_DIR, item), path.join(DIST_DIR, item));
    });
  }

  // 최신화된 allMenus를 dist/data.json에 기록
  fs.writeFileSync(path.join(DIST_DIR, 'data.json'), JSON.stringify(allMenus, null, 2), 'utf-8');

  // 4단계: 레시피 정적 빌드 템플릿 로드
  const detailTemplatePath = path.join(SRC_DIR, 'detail.html');
  if (!fs.existsSync(detailTemplatePath)) {
    console.error('❌ detail.html 템플릿 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
  const detailHtmlTemplate = fs.readFileSync(detailTemplatePath, 'utf-8');

  // 5단계: 각 레시피 및 셰프별 SSG 정적 HTML 파일 생성
  console.log('🍳 레시피 상세 페이지 정적 빌드(Pre-render) 진행 중...');
  let pagesCount = 0;

  allMenus.forEach((menu) => {
    const catCode = categoryCodeMap[menu.category] || menu.category;
    const cleanCat = catCode.trim().replace(/\s+/g, '-');
    const cleanFood = menu.name.trim().replace(/\s+/g, '-');
    const cleanChef = menu.chefName.trim().replace(/\s+/g, '-');
    const folderName = `${cleanCat}-${cleanFood}-${cleanChef}`;
    const pageDir = path.join(DIST_DIR, 'recipe', folderName);
    
    fs.mkdirSync(pageDir, { recursive: true });

    let html = detailHtmlTemplate;

    // 1) SEO Meta 바인딩
    const titleText = `${menu.name} 황금 레시피 모음 - ${menu.chefName} | 맛있는 레시피 포털`.replace(/"/g, "'");
    const descText = `${menu.category} 추천 메뉴! ${menu.chefName}의 ${menu.name} 레시피 정보입니다. 재료와 조리 방법을 확인하고 오늘 맛있는 한 끼를 요리해 보세요.`.replace(/"/g, "'").replace(/\n/g, ' ');

    html = html.replace('<title>요리 상세 레시피 - 오늘 뭐 먹지?</title>', `<title>${titleText}</title>`);
    
    const metaReplacement = `<meta name="description" content="${descText}">
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${titleText}">
  <meta property="og:description" content="${descText}">
  <meta property="og:image" content="${menu.image}">
  <meta property="og:url" content="${SITE_DOMAIN}/recipe/${cleanCat}-${cleanFood}-${cleanChef}/">
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:title" content="${titleText}">
  <meta property="twitter:description" content="${descText}">
  <meta property="twitter:image" content="${menu.image}">`;

    html = html.replace(
      /<meta name="description" content="[^"]*">/,
      metaReplacement
    );

    // 2) 요리 기본 정보 주입
    html = html.replace(/<img id="dishImage" src="[^"]*"/, `<img id="dishImage" src="${menu.image}"`);
    html = html.replace(/alt="음식 대표 이미지"/, `alt="${menu.name}"`);
    html = html.replace(/<span id="dishCategory"[^>]*>([\s\S]*?)<\/span>/, `<span id="dishCategory" class="px-3 py-1 text-xs font-bold rounded-full bg-purple-500 text-white shadow-neon-purple">${menu.category}</span>`);
    html = html.replace(/<h2 id="dishName"[^>]*>([\s\S]*?)<\/h2>/, `<h2 id="dishName" class="text-3xl sm:text-4xl font-extrabold text-white mt-2 drop-shadow-md">${menu.name}</h2>`);
    html = html.replace(/<p id="dishDescription"[^>]*>([\s\S]*?)<\/p>/, `<p id="dishDescription" class="text-slate-200 text-sm mt-1 max-w-xl drop-shadow">${menu.description.split('\n')[0]}</p>`);

    // 3) 쿠팡 파트너스 링크 사전 적용
    const coupangLink = menu.coupangLink || `https://www.coupang.com/np/search?q=${encodeURIComponent(menu.name + ' 밀키트')}`;
    html = html.replace(/id="buyIngredientsBtn" href="#"/g, `id="buyIngredientsBtn" href="${coupangLink}"`);

    // 4) 유튜브 관련 비디오 링크 주입
    const youtubeLink = menu.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(menu.category === '식재료 팁' ? menu.name : `${menu.name} ${menu.chefName} 레시피`)}`;
    html = html.replace(/id="watchVideoBtn" href="#"/g, `id="watchVideoBtn" href="${youtubeLink}"`);

    // 5) 셰프 정보 블로그 HTML 사전 조립 및 치환
    const blogHtml = formatBlogRecipe(menu.description);
    html = html.replace(/<div id="recipeBlogContainer" class="space-y-6">[\s\S]*?레시피 데이터를 불러오는 중\.\.\.<\/p>\s*<\/div>\s*<\/div>/, `<div id="recipeBlogContainer" class="space-y-6">${blogHtml}</div>`);

    // 6) 셰프 타이틀 교체
    html = html.replace(
      /<h3 class="text-xl font-extrabold text-white" id="recipeChefTitle">레시피 노트<\/h3>/,
      `<h3 class="text-xl font-extrabold text-white" id="recipeChefTitle">${menu.chefName} ${menu.name} 레시피</h3>`
    );

    // 7) 다른 셰프 레시피 추천 리스트 정적 사전 생성
    const otherRecipes = allMenus.filter(item => item.name === menu.name && item.id !== menu.id);
    let otherChefsHtml = '';
    if (otherRecipes.length === 0) {
      // 다른 셰프 레시피가 전혀 없는 경우 섹션 숨김 처리
      html = html.replace('id="otherChefsSection"', 'id="otherChefsSection" style="display: none;"');
    } else {
      otherRecipes.forEach(recipe => {
        const catCode = categoryCodeMap[recipe.category] || 'what-to-eat-kr';
        const cleanCatCode = catCode.trim().replace(/\s+/g, '-');
        const cleanFoodName = recipe.name.trim().replace(/\s+/g, '-');
        const cleanChefName = recipe.chefName.trim().replace(/\s+/g, '-');
        const detailUrl = `/recipe/${cleanCatCode}-${cleanFoodName}-${cleanChefName}/`;

        otherChefsHtml += `<a href="${detailUrl}" class="px-4 py-2.5 rounded-2xl border border-slate-800 hover:border-purple-500/50 bg-slate-900/40 hover:bg-purple-950/10 text-xs font-bold text-slate-300 hover:text-purple-300 transition-all duration-300">${recipe.chefName} 레시피 보러가기</a>\n`;
      });
      html = html.replace(
        '<!-- Other chef link buttons will be dynamically generated here -->',
        otherChefsHtml
      );
    }

    // 8) 상단 카테고리 네비게이션 액티브 탭 하이라이트 정적 빌드
    const reverseCategoryMap = {
      '한식레시피': 'korean',
      '중식레시피': 'chinese',
      '양식레시피': 'western',
      '일식레시피': 'japanese',
      '세계레시피': 'global',
      '반찬레시피': 'side',
      '식재료팁': 'tip'
    };
    const catType = reverseCategoryMap[menu.category] || 'korean';
    const activeColorClass = catType === 'tip' ? 'text-emerald-400' : 'text-purple-400';
    
    const activeLinkPattern = new RegExp(`id="nav-${catType}"\\s+class="([^"]*)"`);
    html = html.replace(activeLinkPattern, (match, classes) => {
      const updatedClasses = classes
        .replace('text-slate-400', activeColorClass)
        .concat(' bg-slate-800/80 border border-slate-700/60 font-bold');
      return `id="nav-${catType}" class="${updatedClasses}"`;
    });

    // 9) 찜 버튼에 고유 메뉴 ID 주입
    html = html.replace('id="detailFavoriteBtn"', `id="detailFavoriteBtn" data-menu-id="${menu.id}"`);

    // index.html 정적 파일 쓰기
    fs.writeFileSync(path.join(pageDir, 'index.html'), html, 'utf-8');
    pagesCount++;
  });

  // 6단계: sitemap.xml 자동 생성
  console.log('📄 sitemap.xml 자동 생성 중...');
  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_DOMAIN}/index.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

  allMenus.forEach((menu) => {
    const catCode = categoryCodeMap[menu.category] || menu.category;
    const cleanCat = catCode.trim().replace(/\s+/g, '-');
    const cleanFood = menu.name.trim().replace(/\s+/g, '-');
    const cleanChef = menu.chefName.trim().replace(/\s+/g, '-');
    const pathName = `recipe/${cleanCat}-${cleanFood}-${cleanChef}/`;
    
    sitemapContent += `  <url>
    <loc>${SITE_DOMAIN}/${pathName}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
  });

  sitemapContent += `</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapContent, 'utf-8');
  console.log('✅ sitemap.xml 생성 완료.');

  // 7단계: robots.txt 자동 생성
  console.log('🤖 robots.txt 자동 생성 중...');
  const robotsContent = `User-agent: *
Allow: /
Sitemap: ${SITE_DOMAIN}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsContent, 'utf-8');
  console.log('✅ robots.txt 생성 완료.');

  console.log(`✨ 빌드가 완료되었습니다! 총 ${pagesCount}개의 레시피 정적 상세 페이지가 성공적으로 구워졌습니다.`);
}

runBuild();
