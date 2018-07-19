const db = require("sqlite");
const fs = require('fs');
const path = require('path');


process.chdir('/home/samogot/Disser/Звук_дисер/txt2');
const data = fs.readFileSync('list3.txt', 'utf-8').split('\n').map(f => ({file: f}));
const all_opts = {};
const all_dicts = {};
let count_dicts = 0;
let count_opts = 0;
const data_opts = [];

const SEQUENCE_LENGTH_MIN = 1;
const SEQUENCE_LENGTH_MAX = 3;
const CROSS_VALIDATION_BLOCKS = 5;

function createTables() {
  return Promise.resolve()
  // Model
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reactions (
        reaction_id INTEGER PRIMARY KEY,
        txt         TEXT
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reaction_contexts (
        reaction_id INTEGER,
        context_id  INTEGER,
        PRIMARY KEY (reaction_id, context_id)
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS random_blocks (
        random_block INTEGER PRIMARY KEY
      )`))
    // Input
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS dictors (
        dictor_id INTEGER PRIMARY KEY,
        name      TEXT UNIQUE
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS stimuls (
        stimul_id    INTEGER PRIMARY KEY,
        random_block INTEGER,
        txt          TEXT,
        file         TEXT,
        dictor_id    INTEGER,
        reaction_id  INTEGER
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS phonemes (
        phoneme_id INTEGER PRIMARY KEY,
        txt        TEXT UNIQUE
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS stimul_phonemes (
        phoneme_id INTEGER,
        stimul_id  INTEGER,
        count_num  INTEGER,
        PRIMARY KEY (phoneme_id, stimul_id)
      )`))
    // DB Computation
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reactions_data (
        reaction_id  INTEGER,
        context_id   INTEGER,
        random_block INTEGER,
        count_num    INTEGER,
        p_A          REAL,
        d_A          REAL,
        i_A          REAL,
        PRIMARY KEY (reaction_id, context_id, random_block)
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reaction_phonemes_data (
        phoneme_id   INTEGER,
        reaction_id  INTEGER,
        context_id   INTEGER,
        random_block INTEGER,
        count_num    INTEGER,
        p_AB         REAL,
        d_AB         REAL,
        i_AB         REAL,
        dd_AB        REAL,
        PRIMARY KEY (phoneme_id, reaction_id, context_id, random_block)
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reaction_stimuls_data (
        stimul_id    INTEGER,
        reaction_id  INTEGER,
        context_id   INTEGER,
        random_block INTEGER,
        dsum_A       REAL,
        isum_A       REAL,
        d_ABsum      REAL,
        i_ABsum      REAL,
        p_ABsum      REAL,
        PRIMARY KEY (stimul_id, reaction_id, context_id, random_block)
      )`))
    // Output
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS results (
        context_id         INTEGER,
        stimul_id          INTEGER,
        result_reaction_id INTEGER,
        PRIMARY KEY (context_id, stimul_id)
      )`));
}

function addReactionInfo() {
  return Promise.resolve()
    .then(() => db.run(`
      DELETE
      FROM reactions;
    `))
    .then(() => db.run(`
      INSERT INTO reactions(reaction_id, txt)
      VALUES(1, 'Виїхав зі складу'),
            (2, 'Прибув у точку, починаю виконання'),
            (3, 'Точка виконана успішно'),
            (4, 'Переходжу до наступної точки'),
            (5, 'Так'),
            (6, 'Ні'),
            (7, 'Точка не виконана'),
            (8, 'Відбій, я ще не на місці'),
            (9, 'Клієнт відсутній на місці'),
            (10, 'Немає можливості виконати доставку'),
            (11, 'Помилка в замовленні'),
            (12, 'Відмова клієнта прийняти товар'),
            (13, 'Клієнт забув про доставку'),
            (14, 'Клієнт не зміг бути вчасно'),
            (15, 'Немає на місці, немає зв''язку'),
            (16, 'Невчасний приїзд на точку доставки'),
            (17, 'Не працює ліфт'),
            (18, 'Закрито доступ до приміщення кліента'),
            (19, 'У кліента відсутні необхідні документи'),
            (20, 'Не замовляли взагалі'),
            (21, 'Замовляли на інший день'),
            (22, 'Замовляли на іншу адресу'),
            (23, 'Замовляли на інший час'),
            (24, 'Замовляли інший товар'),
            (25, 'Відмова на місці'),
            (26, 'Немає грошей'),
            (27, 'Пошкоджений або відсутній товар'),
            (28, 'Часткове виконання замовлення'),
            (29, 'Задвоєне замовлення, половина повертається'),
            (30, 'У документах зазначено товар, який клієнт не замовляв'),
            (31, 'Інше'),
            (32, 'Показати маршрутний лист'),
            (33, 'Показати мапу маршруту'),
            (34, 'Показати інформацію про точку'),
            (35, 'Набрати диспетчера'),
            (36, 'Набрати клієнта'),
            (37, 'Затримки у русі'),
            (38, 'Проблемна точка'),
            (39, 'Неможливо досягти точки'),
            (40, 'Неможливо продовжувати маршрут'),
            (41, 'X хвилин'),
            (42, 'Транспортний затор'),
            (43, 'Тимчасово перекриті дороги'),
            (44, 'Помилка мапи, дорога не існує'),
            (45, 'Транспортний засіб потрапив у ДТП'),
            (46, 'Несправність транспортного засобу на маршруті'),
            (47, 'Складні погодні умови'),
            (48, 'Помилка геокодування'),
            (49, 'Похибка при складанні маршруту'),
            (50, 'Під''їзд до будинку з іншої вулиці'),
            (51, 'Немає під''їзду до будинку'),
            (52, 'Неправильна адреса чи недостатньо інформації'),
            (53, 'Не було місця для парковки'),
            (54, 'Транспортний засіб не пройшов по габаритах'),
            (55, 'Затримка на складі'),
            (56, 'Проблеми з вантажем'),
            (57, 'Проблеми з транспортним засобом'),
            (58, 'Запізнення прибуття на склад'),
            (59, 'Затримка завантаження товару'),
            (60, 'Відсутня частина товару'),
            (61, 'Забруднена чи пошкоджена частина товару'),
            (62, 'Немає накладної'),
            (63, 'Неправильно розрахований тонаж чи об''єм продукції'),
            (64, 'Поломка транспортного засобу'),
            (65, 'Транспортний засіб не заводится');
    `));
}

function addContextInfo() {
  return Promise.resolve()
    .then(() => db.run(`
      DELETE
      FROM reaction_contexts;
    `))
    .then(() => db.run(`
      INSERT INTO reaction_contexts(context_id, reaction_id)
      VALUES(1, 6),
            (1, 5),
            (2, 41),
            (2, 6),
            (3, 57),
            (3, 56),
            (3, 55),
            (3, 35),
            (3, 33),
            (3, 32),
            (3, 1),
            (4, 59),
            (4, 58),
            (4, 31),
            (4, 8),
            (5, 63),
            (5, 62),
            (5, 61),
            (5, 60),
            (5, 31),
            (5, 8),
            (6, 65),
            (6, 64),
            (6, 31),
            (6, 8),
            (7, 40),
            (7, 39),
            (7, 38),
            (7, 37),
            (7, 36),
            (7, 35),
            (7, 34),
            (7, 33),
            (7, 32),
            (7, 2),
            (8, 54),
            (8, 53),
            (8, 52),
            (8, 51),
            (8, 31),
            (8, 8),
            (9, 50),
            (9, 49),
            (9, 48),
            (9, 31),
            (9, 8),
            (10, 44),
            (10, 43),
            (10, 42),
            (10, 31),
            (10, 8),
            (11, 47),
            (11, 46),
            (11, 45),
            (11, 31),
            (11, 8),
            (12, 36),
            (12, 35),
            (12, 34),
            (12, 33),
            (12, 32),
            (12, 28),
            (12, 8),
            (12, 7),
            (12, 3),
            (13, 6),
            (13, 5),
            (13, 4),
            (14, 31),
            (14, 12),
            (14, 11),
            (14, 10),
            (14, 9),
            (14, 8),
            (15, 31),
            (15, 16),
            (15, 15),
            (15, 14),
            (15, 13),
            (15, 8),
            (16, 31),
            (16, 19),
            (16, 18),
            (16, 17),
            (16, 8),
            (17, 31),
            (17, 24),
            (17, 23),
            (17, 22),
            (17, 21),
            (17, 20),
            (17, 8),
            (18, 31),
            (18, 27),
            (18, 26),
            (18, 25),
            (18, 8),
            (19, 31),
            (19, 30),
            (19, 29),
            (19, 8),
            (20, 65),
            (20, 64),
            (20, 63),
            (20, 62),
            (20, 61),
            (20, 60),
            (20, 59),
            (20, 58),
            (20, 57),
            (20, 56),
            (20, 55),
            (20, 54),
            (20, 53),
            (20, 52),
            (20, 51),
            (20, 50),
            (20, 49),
            (20, 48),
            (20, 47),
            (20, 46),
            (20, 45),
            (20, 44),
            (20, 43),
            (20, 42),
            (20, 40),
            (20, 39),
            (20, 38),
            (20, 37),
            (20, 36),
            (20, 35),
            (20, 34),
            (20, 33),
            (20, 32),
            (20, 31),
            (20, 30),
            (20, 29),
            (20, 28),
            (20, 27),
            (20, 26),
            (20, 25),
            (20, 24),
            (20, 23),
            (20, 22),
            (20, 21),
            (20, 20),
            (20, 19),
            (20, 18),
            (20, 17),
            (20, 16),
            (20, 15),
            (20, 14),
            (20, 13),
            (20, 12),
            (20, 11),
            (20, 10),
            (20, 9),
            (20, 8),
            (20, 7),
            (20, 6),
            (20, 5),
            (20, 4),
            (20, 3),
            (20, 2),
            (20, 1),
            (21, 3),
            (21, 2),
            (21, 1);
    `));
}

function fillModelData() {
  return Promise.resolve()
    .then(addReactionInfo)
    .then(addContextInfo)
    .then(() => db.run(`
      DELETE
      FROM random_blocks;
    `))
    .then(() => db.run(
      "INSERT INTO random_blocks(random_block) VALUES " +
      Array.from(Array(CROSS_VALIDATION_BLOCKS), () => '(?)').join(','),
      Array.from(Array(CROSS_VALIDATION_BLOCKS).keys())));
}

const getReactionIdFromRecordId = (() => {
  const data = [];
  data[0] = 1;
  data[1] = 2;
  data[2] = 2;
  data[3] = 3;
  data[4] = 4;
  data[5] = 4;
  data[6] = 5;
  data[7] = 5;
  data[8] = 5;
  data[9] = 6;
  data[10] = 6;
  data[11] = 7;
  data[12] = 8;
  data[13] = 9;
  data[14] = 10;
  data[15] = 11;
  data[16] = 12;
  data[17] = 13;
  data[18] = 14;
  data[19] = 15;
  data[20] = 15;
  data[21] = 16;
  data[22] = 17;
  data[23] = 18;
  data[24] = 19;
  data[25] = 20;
  data[26] = 21;
  data[27] = 22;
  data[28] = 23;
  data[29] = 24;
  data[30] = 25;
  data[31] = 26;
  data[32] = 27;
  data[33] = 28;
  data[34] = 29;
  data[35] = 30;
  data[36] = 31;
  data[37] = 32;
  data[38] = 33;
  data[39] = 34;
  data[40] = 35;
  data[41] = 36;
  data[42] = 37;
  data[43] = 38;
  data[44] = 39;
  data[45] = 40;
  data[46] = 41;
  data[47] = 41;
  data[48] = 41;
  data[49] = 41;
  data[50] = 41;
  data[51] = 41;
  data[52] = 41;
  data[53] = 41;
  data[54] = 41;
  data[55] = 41;
  data[56] = 41;
  data[57] = 41;
  data[58] = 41;
  data[59] = 41;
  data[60] = 41;
  data[61] = 41;
  data[62] = 41;
  data[63] = 41;
  data[64] = 41;
  data[65] = 41;
  data[66] = 41;
  data[67] = 41;
  data[68] = 42;
  data[69] = 43;
  data[70] = 44;
  data[71] = 44;
  data[72] = 45;
  data[73] = 45;
  data[74] = 45;
  data[75] = 45;
  data[76] = 46;
  data[77] = 46;
  data[78] = 46;
  data[79] = 46;
  data[80] = 47;
  data[81] = 48;
  data[82] = 48;
  data[83] = 49;
  data[84] = 50;
  data[85] = 51;
  data[86] = 52;
  data[87] = 52;
  data[88] = 53;
  data[89] = 53;
  data[90] = 54;
  data[91] = 54;
  data[92] = 54;
  data[93] = 54;
  data[94] = 55;
  data[95] = 56;
  data[96] = 57;
  data[97] = 57;
  data[98] = 57;
  data[99] = 57;
  data[100] = 58;
  data[101] = 59;
  data[102] = 59;
  data[103] = 60;
  data[104] = 61;
  data[105] = 61;
  data[106] = 61;
  data[107] = 62;
  data[108] = 63;
  data[109] = 63;
  data[110] = 64;
  data[111] = 64;
  data[112] = 64;
  data[113] = 64;
  data[114] = 65;
  data[115] = 65;
  data[116] = 65;
  data[117] = 65;
  return rec_id => data[rec_id];
})();

function readPhonemes() {
  return Promise.resolve()
    .then(() => {
      for (const i of data.keys()) data[i].i = i
      for (const d of data) {
        d.text = fs.readFileSync(d.file, 'utf-8');
        d.text_f = d.text.replace(/((?<=[^ ].)|^) */g, '');
        d.dictor = path.basename(path.dirname(d.file));
        d.reaction = getReactionIdFromRecordId(path.basename(d.file).split('_')[1]);
        d.opts = {};
        for (let l = SEQUENCE_LENGTH_MIN; l <= SEQUENCE_LENGTH_MAX; ++l)
          for (let i = 0; i <= d.text_f.length - l * 2; i += 2)
            d.opts[d.text_f.substr(i, l * 2)] = (d.opts[d.text_f.substr(i, l * 2)] || 0) + 1;
        for (const [o, c] of Object.entries(d.opts)) {
          if (!all_opts[o])
            all_opts[o] = ++count_opts;
          data_opts.push([all_opts[o], d.i, c]);
        }
        if (!all_dicts[d.dictor])
          all_dicts[d.dictor] = ++count_dicts;
      }
    })
    .then(() => db.run(`
      DELETE
      FROM dictors;
    `))
    .then(() => db.run(
      "INSERT INTO dictors(name, dictor_id) VALUES " +
      Object.entries(all_dicts).map(x => '(?,?)').join(','),
      [].concat.apply([], Object.entries(all_dicts))))
    .then(() => db.run(`
      DELETE
      FROM phonemes;
    `))
    .then(() => {
      let entries = Object.entries(all_opts);
      const n = 499;
      const chunks = Array.from(Array(Math.ceil(entries.length / n)), (_, i) => entries.slice(i * n, i * n + n));
      return Promise.all(chunks.map(chunk => db.run(
        "INSERT INTO phonemes(txt, phoneme_id) VALUES " +
        chunk.map(x => '(?,?)').join(','),
        [].concat.apply([], chunk))));
    })
    .then(() => db.run(`
      DELETE
      FROM stimuls;
    `))
    .then(() => {
      const n = 199;
      const chunks = Array.from(Array(Math.ceil(data.length / n)), (_, i) => data.slice(i * n, i * n + n));
      return Promise.all(chunks.map(chunk => db.run(
        "INSERT INTO stimuls(stimul_id, txt, file, dictor_id, reaction_id, random_block) VALUES " +
        chunk.map(x => `(?,?,?,?,?,ABS(RANDOM() % ${CROSS_VALIDATION_BLOCKS}))`).join(','),
        [].concat.apply([], chunk.map(d => [d.i, d.text_f, d.file, all_dicts[d.dictor], d.reaction])))));
    })
    .then(() => db.run(`
      DELETE
      FROM stimul_phonemes;
    `))
    .then(() => {
      const n = 333;
      const chunks = Array.from(Array(Math.ceil(data_opts.length / n)), (_, i) => data_opts.slice(i * n, i * n + n));
      return Promise.all(chunks.map(chunk => db.run(
        "INSERT INTO stimul_phonemes(phoneme_id, stimul_id, count_num) VALUES " +
        chunk.map(x => '(?,?,?)').join(','),
        [].concat.apply([], chunk))));
    });
}

function computeResult() {
  return Promise.resolve()
    .then(() => db.run(`
      DELETE
      FROM reactions_data;
    `))
    .then(() => db.run(`
      INSERT INTO reactions_data(random_block, context_id, reaction_id, count_num)
      SELECT r.random_block, context_id, s.reaction_id, count(*)
      FROM stimuls s
             INNER JOIN reaction_contexts c ON (s.reaction_id = c.reaction_id)
             INNER JOIN random_blocks r ON (s.random_block != r.random_block)
      GROUP BY r.random_block, context_id, s.reaction_id;
    `))
    .then(() => db.run(`
      UPDATE reactions_data
      SET p_A = count_num * 1.0 / (SELECT sum(count_num)
                                   FROM reactions_data d
                                   WHERE reactions_data.random_block = d.random_block
                                     AND reactions_data.context_id = d.context_id);
    `))
    .then(() => db.run(`
      UPDATE reactions_data
      SET d_A = 0.5 * sqrt(p_A / (1 - p_A) + (1 - p_A) / p_A - 2);
    `))
    .then(() => db.run(`
      UPDATE reactions_data
      SET i_A = sqrt(d_A * d_A + 1);
    `))
    .then(() => db.run(`
      DELETE
      FROM reaction_phonemes_data;
    `))
    .then(() => db.run(`
      INSERT INTO reaction_phonemes_data(random_block, context_id, reaction_id, phoneme_id, count_num)
      SELECT r.random_block, context_id, s.reaction_id, p.phoneme_id, sum(p.count_num)
      FROM stimuls s
             INNER JOIN reaction_contexts c ON (s.reaction_id = c.reaction_id)
             INNER JOIN random_blocks r ON (s.random_block != r.random_block)
             INNER JOIN stimul_phonemes p ON (s.stimul_id = p.stimul_id)
      GROUP BY r.random_block, context_id, s.reaction_id, p.phoneme_id;
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes_data
      SET p_AB = count_num * 1.0 / (SELECT sum(count_num)
                                    FROM reaction_phonemes_data d
                                    WHERE reaction_phonemes_data.random_block = d.random_block
                                      AND reaction_phonemes_data.context_id = d.context_id)
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes_data
      SET d_AB = 0.5 * sqrt(p_AB / (1 - p_AB) + (1 - p_AB) / p_AB - 2);
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes_data
      SET i_AB = sqrt(d_AB * d_AB + 1);
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes_data
      SET dd_AB = (SELECT d_AB * i_A - d_A * i_AB
                   FROM reactions_data
                   WHERE reactions_data.reaction_id = reaction_phonemes_data.reaction_id
                     AND reactions_data.random_block = reaction_phonemes_data.random_block
                     AND reactions_data.context_id = reaction_phonemes_data.context_id);
    `))
    .then(() => db.run(`
      DELETE
      FROM reaction_stimuls_data;
    `))
    .then(() => db.run(`
      INSERT INTO reaction_stimuls_data(random_block, context_id, reaction_id, stimul_id, dsum_A)
      SELECT rd.random_block, rd.context_id, rd.reaction_id, sp.stimul_id, sum(dd_AB)
      FROM reactions_data rd
             INNER JOIN reaction_phonemes_data rpd
               ON (rd.reaction_id = rpd.reaction_id AND rd.random_block = rpd.random_block AND rd.context_id = rpd.context_id)
             INNER JOIN stimul_phonemes sp ON (rpd.phoneme_id = sp.phoneme_id)
             INNER JOIN stimuls s ON (s.stimul_id = sp.stimul_id)
             INNER JOIN reaction_contexts c ON (c.reaction_id = s.reaction_id)
      where c.context_id = rd.context_id
      GROUP BY rd.random_block, rd.context_id, rd.reaction_id, sp.stimul_id;
    `))
    .then(() => db.run(`
      UPDATE reaction_stimuls_data
      SET isum_A = sqrt(dsum_A * dsum_A + 1);
    `))
    .then(() => db.run(`
      UPDATE reaction_stimuls_data
      SET d_ABsum = (SELECT dsum_A * i_A - d_A * isum_A
                   FROM reactions_data
                   WHERE reactions_data.reaction_id = reaction_stimuls_data.reaction_id
                     AND reactions_data.random_block = reaction_stimuls_data.random_block
                     AND reactions_data.context_id = reaction_stimuls_data.context_id);
    `))
    .then(() => db.run(`
      UPDATE reaction_stimuls_data
      SET i_ABsum = sqrt(d_ABsum * d_ABsum + 1);
    `))
    .then(() => db.run(`
      UPDATE reaction_stimuls_data
      SET p_ABsum = 0.5 + d_ABsum / (2 * i_ABsum);
    `))
    .then(() => db.run(`
      DELETE
      FROM results;
    `))
  .then(() => db.run(`
    INSERT INTO results(context_id, stimul_id, result_reaction_id)
    SELECT context_id,
           stimul_id,
           (SELECT d.reaction_id
            FROM reaction_stimuls_data d
                   INNER JOIN stimuls s ON (d.stimul_id = s.stimul_id)
            WHERE d.random_block = s.random_block
              AND context_id = ccc.context_id
              AND d.stimul_id = sss.stimul_id
            ORDER BY context_id, s.stimul_id, p_ABsum DESC
            LIMIT 1) AS result_reaction_id
    FROM stimuls sss
           INNER JOIN reaction_contexts ccc ON (sss.reaction_id = ccc.reaction_id)
    ORDER BY context_id, stimul_id
  `));
}

db.open('data3c.sqlite')
  .then(() => db.driver.loadExtension('/home/samogot/Downloads/extension-functions'))
  // .then(createTables)
  // .then(fillModelData)
  // .then(readPhonemes)
  .then(computeResult)
  .catch((e) => console.error(e));
