const fs = require('fs');
const crypto = require('crypto');

const data = JSON.parse(fs.readFileSync('SF6FrameData.json', 'utf8'));

const CHAR_MAP = {
  'A.K.I.': 'A.K.I.', 'Akuma': 'Akuma', 'Blanka': 'Blanka',
  'C.Viper': 'C.Viper', 'Cammy': 'Cammy', 'Chun-Li': 'Chun-Li',
  'Dee Jay': 'Dee Jay', 'Dhalsim': 'Dhalsim', 'E.Honda': 'Honda',
  'Ed': 'Ed', 'Elena': 'Elena', 'Guile': 'Guile',
  'Jamie': 'Jamie', 'JP': 'JP', 'Juri': 'Juri',
  'Ken': 'Ken', 'Kimberly': 'Kimberly', 'Lily': 'Lily',
  'Luke': 'Luke', 'M.Bison': 'M. Bison', 'Mai': 'Mai',
  'Manon': 'Manon', 'Marisa': 'Marisa', 'Rashid': 'Rashid',
  'Ryu': 'Ryu', 'Sagat': 'Sagat', 'Terry': 'Terry',
  'Zangief': 'Zangief',
};

function mapCategory(moveType) {
  const m = {
    'normal': 'normal', 'special': 'special', 'super': 'super',
    'throw': 'throw', 'command-grab': 'throw', 'drive': 'unique',
    'movement-special': 'unique', 'taunt': 'unique',
  };
  return m[moveType] || 'normal';
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/'/g, "''");
}

function toInt(v) {
  if (v == null || v === '' || v === '-') return 'NULL';
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 'NULL' : n;
}

const rows = [];

for (const [fatChar, charData] of Object.entries(data)) {
  const appChar = CHAR_MAP[fatChar];
  if (!appChar) { console.error('Unknown:', fatChar); continue; }
  
  let sortOrder = 0;
  const seenMoves = new Set();
  
  for (const [catKey, moves] of Object.entries(charData.moves)) {
    for (const [moveName, m] of Object.entries(moves)) {
      // For variant categories (D1-D4, Super Install, etc), 
      // prefix the move name if it's a duplicate
      let finalName = m.moveName;
      if (catKey !== 'normal') {
        // If already seen in base, prefix with category
        if (seenMoves.has(finalName)) {
          finalName = `${finalName} [${catKey}]`;
        }
        // If still duplicate, skip
        if (seenMoves.has(finalName)) continue;
      } else {
        if (seenMoves.has(finalName)) continue;
      }
      
      seenMoves.add(finalName);
      sortOrder++;
      
      const id = crypto.randomUUID();
      const category = mapCategory(m.moveType);
      const input = esc(m.numCmd || m.plnCmd || '');
      const cancel = Array.isArray(m.xx) ? m.xx.join(', ') : (m.xx || '');
      const notes = Array.isArray(m.extraInfo) ? m.extraInfo.join('; ') : (m.extraInfo || '');
      const guard = esc(m.atkLvl || '');
      
      rows.push(`('${id}','${esc(appChar)}','${esc(finalName)}','','${esc(input)}','${category}',${toInt(m.startup)},${toInt(m.active)},${toInt(m.recovery)},${toInt(m.onBlock)},${toInt(m.onHit)},${toInt(m.dmg)},'${guard}','${esc(cancel)}','${esc(notes)}',${sortOrder},datetime('now'),datetime('now'))`);
    }
  }
}

const batchSize = 50;
const sqlParts = ["DELETE FROM frame_data;"];

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  sqlParts.push(`INSERT INTO frame_data (id,character,move_name,move_name_jp,input,category,startup,active,recovery,on_block,on_hit,damage,guard,cancel_into,notes,sort_order,updated_at,created_at) VALUES\n${batch.join(',\n')};`);
}

fs.writeFileSync('import-frame-data.sql', sqlParts.join('\n\n'), 'utf8');
console.log(`Generated ${rows.length} rows in ${Math.ceil(rows.length/batchSize)} batches`);
