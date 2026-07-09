// Google Sheets 연동 및 CSV 파서 매니저
const SheetsManager = {
  // ★ 구글 스프레드시트 웹 게시(Publish to web) 후 생성되는 CSV 형식의 URL을 여기에 입력하세요.
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStAETGqwhy2ux_FQAzPeS_bPUu_pIk_F7n79vO7LKCgAZ1KYHnqJ37WX5c2Higqtzx8gG6HBq7zouS/pub?gid=0&single=true&output=csv',

  // A열 카테고리 값과 화면 상 카테고리의 매핑 관계 정의
  categoryMap: {
    'what-to-eat-kr': '한식레시피',
    'what-to-eat-ch': '중식레시피',
    'what-to-eat-western': '양식레시피',
    'what-to-eat-jp': '일식레시피',
    'what-to-eat-global': '세계레시피',
    'what-to-eat-side': '반찬레시피',
    'what-to-eat-ingredients': '식재료팁'
  },

  // 유튜브 URL에서 11자리 비디오 ID 추출 헬퍼 함수
  getYoutubeId(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  },

  // RFC 4180 규격을 충족하는 경량 CSV 파서
  parseCSV(csvText) {
    let inQuotes = false;
    let currentField = '';
    let currentRow = [];
    const rows = [];

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++; // 다음 큰따옴표 건너뜀
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
          if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
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
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }
    return rows;
  },

  foodImageKeywordMap: {
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
  },

  getFoodImage(name) {
    const cleanName = name.trim();
    if (this.foodImageKeywordMap[cleanName]) {
      return this.foodImageKeywordMap[cleanName];
    }
    for (const key of Object.keys(this.foodImageKeywordMap)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        return this.foodImageKeywordMap[key];
      }
    }
    return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800';
  },

  // 구글 스프레드시트 데이터 로드 및 파싱 후 메뉴 오브젝트 배열 반환
  async fetchSheetData() {
    try {
      // 로컬 data.json에서 기존 이미지와 쿠팡링크 정보를 색인하기 위한 룩업 맵 빌드
      let backupLookup = {};
      try {
        const response = await fetch('data.json');
        if (response.ok) {
          const backupData = await response.json();
          // 백업 데이터는 nested structure가 반환되므로 각 항목명으로 메타데이터 추출
          backupData.forEach(item => {
            backupLookup[item.name] = {
              image: item.image,
              coupangLink: item.coupangLink
            };
          });
        }
      } catch (e) {
        console.warn('백업 data.json 프리로드 실패:', e);
      }

      const response = await fetch(this.spreadsheetUrl);
      if (!response.ok) throw new Error(`스프레드시트 데이터 수신 실패 (상태 코드: ${response.status})`);
      
      const csvText = await response.text();
      const rows = this.parseCSV(csvText);
      
      if (rows.length <= 1) return [];

      const menuList = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        // A열: 카테고리 (what-to-eat-kr 등)
        const categoryCode = row[0] ? row[0].trim() : '';
        // B열: 음식명
        const name = row[1] ? row[1].trim() : '';
        if (!name) continue;

        // C열: 셰프 이름
        const chefName = row[2] ? row[2].trim() : '레시피';
        // D열: 레시피 텍스트
        const description = row[3] ? row[3].trim() : '';
        // E열: 레시피 링크 (유튜브 영상 링크 등)
        const videoUrl = row[4] ? row[4].trim() : '';

        const displayCategory = this.categoryMap[categoryCode] || categoryCode;

        // 음식명 기반 자동 이미지 추출 및 쿠팡링크 매칭
        const matchedMeta = backupLookup[name] || {};
        const image = this.getFoodImage(name);
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
          videoId: this.getYoutubeId(videoUrl)
        });
      }

      return menuList;
    } catch (error) {
      console.error('fetchSheetData 에러 발생:', error);
      console.warn('로컬 data.json 데이터 백업을 로드합니다.');
      try {
        const response = await fetch('data.json');
        const nestedData = await response.json();
        return this.flattenData(nestedData);
      } catch (innerError) {
        console.error('백업 데이터 로드 실패:', innerError);
        return [];
      }
    }
  },

  // 중첩 구조의 data.json 백업 데이터를 flat 구조로 평탄화하는 함수
  flattenData(nestedMenus) {
    const flat = [];
    nestedMenus.forEach(menu => {
      if (menu.chefs && menu.chefs.length > 0) {
        menu.chefs.forEach(chef => {
          // tip, ingredients, recipe를 D열 텍스트 블록 형태로 자동 병합
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
            videoId: this.getYoutubeId(chef.videoUrl || '')
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
};
