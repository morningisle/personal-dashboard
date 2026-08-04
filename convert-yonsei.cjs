// 生成紧凑版延世韩国语数据（仅前端必需字段）
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'yonsei-data', 'data', 'json');
const outDir = path.join(__dirname, 'src', 'data');

const volumeToTopik = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
const originLabels = { native: '固有词', hanja: '汉字词', loanword: '外来词', expression: '表达', hybrid: '混合词', grammar: '语法' };

const allWords = [];
const chapters = {};

for (let vol = 1; vol <= 6; vol++) {
  const file = path.join(dataDir, `vol-0${vol}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

  data.metadata.chapters.forEach(ch => {
    const key = `v${vol}-c${ch.chapter}`;
    chapters[key] = { v: vol, c: ch.chapter, ko: ch.ko, zh: ch.zh, w: [] };
  });

  data.rows.forEach(row => {
    // 紧凑格式: [id, ko, zh, volume, chapter, unit, topik, origin, originDetail, pos]
    const w = [
      row.entry_id,
      row.korean,
      row.chinese,
      vol,
      row.chapter,
      row.unit,
      volumeToTopik[vol],
      originLabels[row.origin_type] || '',
      row.origin_detail || '',
      row.pos_zh || '',
    ];
    allWords.push(w);

    const chKey = `v${vol}-c${row.chapter}`;
    if (chapters[chKey]) chapters[chKey].w.push(allWords.length - 1);
  });

  console.log(`Vol ${vol}: ${data.rows.length} words`);
}

console.log(`\nTotal: ${allWords.length} words, ${Object.keys(chapters).length} chapters`);

// 生成紧凑 JS 模块
const output = `// 延世韩国语 1-6 册词汇（紧凑版）| ${allWords.length} 条 | CC BY-SA 3.0
// https://github.com/Amulopapa67/open-yonsei-korean-vocabulary
// 字段: [id, ko, zh, volume, chapter, unit, topik, origin, originDetail, pos]

export const yonseiWords = ${JSON.stringify(allWords)};

export const yonseiChapters = ${JSON.stringify(chapters)};

// 辅助函数
export const getWord = (i) => {
  const w = yonseiWords[i];
  return { id: w[0], ko: w[1], zh: w[2], volume: w[3], chapter: w[4], unit: w[5], topik: w[6], origin: w[7], originDetail: w[8], pos: w[9] };
};

export const getByTopik = (level) => yonseiWords.filter(w => w[6] === level);
export const getByOrigin = (type) => yonseiWords.filter(w => w[7] === type);
export const getByChapter = (vol, ch) => {
  const key = \`v\${vol}-c\${ch}\`;
  const chapter = yonseiChapters[key];
  return chapter ? chapter.w.map(i => getWord(i)) : [];
};
`;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'yonseiVocab.js'), output, 'utf-8');

const sizeKB = (fs.readFileSync(path.join(outDir, 'yonseiVocab.js')).length / 1024).toFixed(1);
console.log(`Output: src/data/yonseiVocab.js (${sizeKB} KB)`);

// 统计
const byTopik = {};
allWords.forEach(w => { byTopik[w[6]] = (byTopik[w[6]] || 0) + 1; });
console.log('\nBy TOPIK:');
Object.entries(byTopik).sort().forEach(([k, v]) => console.log(`  TOPIK ${k}: ${v}`));
