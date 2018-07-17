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

function createTables() {
  return Promise.resolve()
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS dictors (
        dictor_id INTEGER PRIMARY KEY,
        name      TEXT UNIQUE
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS stimuls (
        stimul_id   INTEGER PRIMARY KEY,
        txt         TEXT,
        file        TEXT,
        dictor_id   INTEGER,
        reaction_id INTEGER,
        count_num   INTEGER
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
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reactions (
        reaction_id    INTEGER PRIMARY KEY,
        reaction_block INTEGER,
        txt            TEXT,
        count_num      INTEGER,
        p_A            REAL,
        d_A            REAL,
        i_A            REAL
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reaction_contexts (
        reaction_block INTEGER,
        context        INTEGER,
        PRIMARY KEY (reaction_block, context)
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS reaction_phonemes (
        phoneme_id  INTEGER,
        reaction_id INTEGER,
        count_num   INTEGER,
        p_AB        REAL,
        d_AB        REAL,
        i_AB        REAL,
        dd_AB       REAL,
        PRIMARY KEY (phoneme_id, reaction_id)
      )`))
    .then(() => db.run(`
      CREATE TABLE IF NOT EXISTS results (
        stimul_id             INTEGER PRIMARY KEY,
        result_reaction_block INTEGER
      )`));
}

function readPhonemes() {
  return Promise.resolve()
    .then(() => {
      for (const i of data.keys()) data[i].i = i
      for (const d of data) {
        d.text = fs.readFileSync(d.file, 'utf-8');
        d.text_f = d.text.replace(/((?<=[^ ].)|^) */g, '');
        d.dictor = path.basename(path.dirname(d.file));
        d.reaction = path.basename(d.file).split('_')[1];
        d.opts = {};
        for (let l = 1; l <= 3; ++l)
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
        "INSERT INTO stimuls(stimul_id, txt, file, dictor_id, reaction_id, count_num) VALUES " +
        chunk.map(x => '(?,?,?,?,?,0)').join(','),
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

function addReactionInfo() {
  return Promise.resolve()
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 1,
          txt            = 'Виїхав зі складу'
      WHERE reaction_id = 0;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 2,
          txt            = 'Прибув у точку, починаю виконання'
      WHERE reaction_id = 1;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 2,
          txt            = 'Прибув у точку'
      WHERE reaction_id = 2;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 3,
          txt            = 'Точка виконана успішно'
      WHERE reaction_id = 3;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 4,
          txt            = 'Переходжу до наступної точки'
      WHERE reaction_id = 4;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 4,
          txt            = 'Наступна точка'
      WHERE reaction_id = 5;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 5,
          txt            = 'Так'
      WHERE reaction_id = 6;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 5,
          txt            = 'Підтверджую'
      WHERE reaction_id = 7;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 5,
          txt            = 'Добре'
      WHERE reaction_id = 8;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 6,
          txt            = 'Ні'
      WHERE reaction_id = 9;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 6,
          txt            = 'Відбій'
      WHERE reaction_id = 10;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 7,
          txt            = 'Точка не виконана'
      WHERE reaction_id = 11;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 8,
          txt            = 'Відбій, я ще не на місці'
      WHERE reaction_id = 12;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 9,
          txt            = 'Клієнт відсутній на місці'
      WHERE reaction_id = 13;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 10,
          txt            = 'Немає можливості виконати доставку'
      WHERE reaction_id = 14;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 11,
          txt            = 'Помилка в замовленні'
      WHERE reaction_id = 15;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 12,
          txt            = 'Відмова клієнта прийняти товар'
      WHERE reaction_id = 16;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 13,
          txt            = 'Клієнт забув про доставку'
      WHERE reaction_id = 17;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 14,
          txt            = 'Клієнт не зміг бути вчасно'
      WHERE reaction_id = 18;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 15,
          txt            = 'Немає на місці, немає зв''язку'
      WHERE reaction_id = 19;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 15,
          txt            = 'Немає на місці'
      WHERE reaction_id = 20;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 16,
          txt            = 'Невчасний приїзд на точку доставки'
      WHERE reaction_id = 21;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 17,
          txt            = 'Не працює ліфт'
      WHERE reaction_id = 22;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 18,
          txt            = 'Закрито доступ до приміщення кліента'
      WHERE reaction_id = 23;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 19,
          txt            = 'У кліента відсутні необхідні документи'
      WHERE reaction_id = 24;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 20,
          txt            = 'Не замовляли взагалі'
      WHERE reaction_id = 25;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 21,
          txt            = 'Замовляли на інший день'
      WHERE reaction_id = 26;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 22,
          txt            = 'Замовляли на іншу адресу'
      WHERE reaction_id = 27;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 23,
          txt            = 'Замовляли на інший час'
      WHERE reaction_id = 28;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 24,
          txt            = 'Замовляли інший товар'
      WHERE reaction_id = 29;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 25,
          txt            = 'Відмова на місці'
      WHERE reaction_id = 30;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 26,
          txt            = 'Немає грошей'
      WHERE reaction_id = 31;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 27,
          txt            = 'Пошкоджений або відсутній товар'
      WHERE reaction_id = 32;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 28,
          txt            = 'Часткове виконання замовлення'
      WHERE reaction_id = 33;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 29,
          txt            = 'Задвоєне замовлення, половина повертається'
      WHERE reaction_id = 34;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 30,
          txt            = 'У документах зазначено товар, який клієнт не замовляв'
      WHERE reaction_id = 35;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 31,
          txt            = 'Інше'
      WHERE reaction_id = 36;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 32,
          txt            = 'Показати маршрутний лист'
      WHERE reaction_id = 37;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 33,
          txt            = 'Показати мапу маршруту'
      WHERE reaction_id = 38;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 34,
          txt            = 'Показати інформацію про точку'
      WHERE reaction_id = 39;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 35,
          txt            = 'Набрати диспетчера'
      WHERE reaction_id = 40;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 36,
          txt            = 'Набрати клієнта'
      WHERE reaction_id = 41;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 37,
          txt            = 'Затримки у русі'
      WHERE reaction_id = 42;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 38,
          txt            = 'Проблемна точка'
      WHERE reaction_id = 43;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 39,
          txt            = 'Неможливо досягти точки'
      WHERE reaction_id = 44;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 40,
          txt            = 'Неможливо продовжувати маршрут'
      WHERE reaction_id = 45;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = 'Хвилина'
      WHERE reaction_id = 46;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '1 хвилина'
      WHERE reaction_id = 47;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '2 хвилини'
      WHERE reaction_id = 48;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '3 хвилини'
      WHERE reaction_id = 49;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '4 хвилини'
      WHERE reaction_id = 50;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '5 хвилин'
      WHERE reaction_id = 51;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '6 хвилин'
      WHERE reaction_id = 52;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '7 хвилин'
      WHERE reaction_id = 53;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '8 хвилин'
      WHERE reaction_id = 54;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '9 хвилин'
      WHERE reaction_id = 55;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '10 хвилин'
      WHERE reaction_id = 56;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '15 хвилин'
      WHERE reaction_id = 57;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '20 хвилин'
      WHERE reaction_id = 58;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '30 хвилин'
      WHERE reaction_id = 59;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = 'Пів години'
      WHERE reaction_id = 60;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = 'Година'
      WHERE reaction_id = 61;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '1 година'
      WHERE reaction_id = 62;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '1 година 10 хвилин'
      WHERE reaction_id = 63;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '1,5 години'
      WHERE reaction_id = 64;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '2 години'
      WHERE reaction_id = 65;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '2,5 години'
      WHERE reaction_id = 66;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 41,
          txt            = '3 години'
      WHERE reaction_id = 67;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 42,
          txt            = 'Транспортний затор'
      WHERE reaction_id = 68;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 43,
          txt            = 'Тимчасово перекриті дороги'
      WHERE reaction_id = 69;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 44,
          txt            = 'Помилка мапи, дорога не існує'
      WHERE reaction_id = 70;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 44,
          txt            = 'Дорога не існує'
      WHERE reaction_id = 71;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 45,
          txt            = 'Транспортний засіб потрапив у ДТП'
      WHERE reaction_id = 72;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 45,
          txt            = 'Машина попала у ДТП'
      WHERE reaction_id = 73;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 45,
          txt            = 'Автомобіль потрапив у ДТП'
      WHERE reaction_id = 74;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 45,
          txt            = 'Авто попало у ДТП'
      WHERE reaction_id = 75;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 46,
          txt            = 'Несправність транспортного засобу на маршруті'
      WHERE reaction_id = 76;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 46,
          txt            = 'Поломка машини на маршруті'
      WHERE reaction_id = 77;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 46,
          txt            = 'Несправність автомобіля на маршруті'
      WHERE reaction_id = 78;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 46,
          txt            = 'Поломка авто на маршруті'
      WHERE reaction_id = 79;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 47,
          txt            = 'Складні погодні умови'
      WHERE reaction_id = 80;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 48,
          txt            = 'Помилка геокодування'
      WHERE reaction_id = 81;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 48,
          txt            = 'Помилка координат'
      WHERE reaction_id = 82;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 49,
          txt            = 'Похибка при складанні маршруту'
      WHERE reaction_id = 83;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 50,
          txt            = 'Під''їзд до будинку з іншої вулиці'
      WHERE reaction_id = 84;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 51,
          txt            = 'Немає під''їзду до будинку'
      WHERE reaction_id = 85;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 52,
          txt            = 'Неправильна адреса'
      WHERE reaction_id = 86;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 52,
          txt            = 'Недостатньо інформації'
      WHERE reaction_id = 87;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 53,
          txt            = 'Не було місця для парковки'
      WHERE reaction_id = 88;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 53,
          txt            = 'Ніде запаркуватись'
      WHERE reaction_id = 89;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 54,
          txt            = 'Транспортний засіб не пройшов по габаритах'
      WHERE reaction_id = 90;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 54,
          txt            = 'Машина не пройшла по габаритах'
      WHERE reaction_id = 91;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 54,
          txt            = 'Автомобіль не пройшов по габаритах'
      WHERE reaction_id = 92;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 54,
          txt            = 'Авто не пройшло по габаритах'
      WHERE reaction_id = 93;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 55,
          txt            = 'Затримка на складі'
      WHERE reaction_id = 94;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 56,
          txt            = 'Проблеми з вантажем'
      WHERE reaction_id = 95;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 57,
          txt            = 'Проблеми з транспортним засобом'
      WHERE reaction_id = 96;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 57,
          txt            = 'Проблеми з машиною'
      WHERE reaction_id = 97;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 57,
          txt            = 'Проблеми з автомобілем'
      WHERE reaction_id = 98;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 57,
          txt            = 'Проблеми з авто'
      WHERE reaction_id = 99;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 58,
          txt            = 'Запізнення прибуття на склад'
      WHERE reaction_id = 100;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 59,
          txt            = 'Затримка завантаження товару'
      WHERE reaction_id = 101;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 59,
          txt            = 'Затримка завантаження'
      WHERE reaction_id = 102;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 60,
          txt            = 'Відсутня частина товару'
      WHERE reaction_id = 103;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 61,
          txt            = 'Забруднена чи пошкоджена частина товару'
      WHERE reaction_id = 104;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 61,
          txt            = 'Забруднена частина товару'
      WHERE reaction_id = 105;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 61,
          txt            = 'Пошкоджена частина товару'
      WHERE reaction_id = 106;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 62,
          txt            = 'Немає накладної'
      WHERE reaction_id = 107;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 63,
          txt            = 'Неправильно розрахований тонаж продукції'
      WHERE reaction_id = 108;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 63,
          txt            = 'Неправильно розрахований об''єм продукції'
      WHERE reaction_id = 109;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 64,
          txt            = 'Поломка транспортного засобу'
      WHERE reaction_id = 110;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 64,
          txt            = 'Несправність машини'
      WHERE reaction_id = 111;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 64,
          txt            = 'Поломка автомобіля'
      WHERE reaction_id = 112;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 64,
          txt            = 'Несправність авто'
      WHERE reaction_id = 113;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 65,
          txt            = 'Транспортний засіб не заводится'
      WHERE reaction_id = 114;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 65,
          txt            = 'Машина не заводиться'
      WHERE reaction_id = 115;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 65,
          txt            = 'Автомобіль не заводиться'
      WHERE reaction_id = 116;
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET reaction_block = 65,
          txt            = 'Авто не заводиться'
      WHERE reaction_id = 117;
    `));
}

function computeResult() {
  return Promise.resolve()
    .then(() => db.run(`
      DELETE
      FROM reactions;
    `))
    .then(() => db.run(`
      INSERT INTO reactions(reaction_id, count_num)
      SELECT DISTINCT reaction_id, sum(count_num)
      FROM stimuls
      GROUP BY reaction_id;
    `))
    .then(addReactionInfo)
    .then(() => db.run(`
      UPDATE reactions
      SET p_A = count_num * 1.0 / (SELECT sum(count_num)
                                   FROM reactions);
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET d_A = 0.5 * sqrt(p_A / (1 - p_A) + (1 - p_A) / p_A - 2);
    `))
    .then(() => db.run(`
      UPDATE reactions
      SET i_A = sqrt(d_A * d_A + 1);
    `))
    .then(() => db.run(`
      DELETE
      FROM reaction_phonemes;
    `))
    .then(() => db.run(`
      INSERT INTO reaction_phonemes(reaction_id, phoneme_id, count_num)
      SELECT s.reaction_id, sp.phoneme_id, sum(s.count_num * sp.count_num)
      FROM stimuls s
             INNER JOIN stimul_phonemes sp ON (s.stimul_id = sp.stimul_id)
      WHERE s.count_num > 0
      GROUP BY s.reaction_id, sp.phoneme_id;
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes
      SET p_AB = count_num * 1.0 / (SELECT sum(count_num)
                                    FROM reaction_phonemes);
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes
      SET d_AB = 0.5 * sqrt(p_AB / (1 - p_AB) + (1 - p_AB) / p_AB - 2);
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes
      SET i_AB = sqrt(d_AB * d_AB + 1);
    `))
    .then(() => db.run(`
      UPDATE reaction_phonemes
      SET dd_AB = (SELECT d_AB * i_A - d_A * i_AB
                   FROM reactions
                   WHERE reactions.reaction_id = reaction_phonemes.reaction_id);
    `))
    .then(() => db.run(`
      DELETE
      FROM results;
    `))
    .then(() => db.run(`
      INSERT INTO results(result_reaction_block, stimul_id)
      SELECT (SELECT r.reaction_block
              FROM phonemes p
                     INNER JOIN stimul_phonemes sp ON (p.phoneme_id = sp.phoneme_id)
                     INNER JOIN stimuls s ON (sp.stimul_id = s.stimul_id)
                     INNER JOIN reaction_phonemes rp ON (sp.phoneme_id = rp.phoneme_id)
                     INNER JOIN reactions r ON (rp.reaction_id = r.reaction_id)
              WHERE s.stimul_id = sss.stimul_id
              GROUP BY r.reaction_block
              ORDER BY 0.5 + (sum(dd_AB) * i_A - d_A * sqrt(sum(dd_AB) * sum(dd_AB) + 1)) / (2 * sqrt(
                  (sum(dd_AB) * i_A - d_A * sqrt(sum(dd_AB) * sum(dd_AB) + 1)) *
                  (sum(dd_AB) * i_A - d_A * sqrt(sum(dd_AB) * sum(dd_AB) + 1)) + 1)) DESC
              LIMIT 1) result_reaction_block,
             stimul_id
      FROM stimuls sss;
    `));
}

db.open('data3.sqlite')
  .then(() => db.driver.loadExtension('/home/samogot/Downloads/extension-functions'))
  .then(createTables)
  // .then(readPhonemes)

  // .then(() => db.run(`
  //   DELETE
  //   FROM stimuls
  //   WHERE reaction_id >= 4;
  // `))
  .then(() => db.run(`
    UPDATE stimuls
    SET count_num = 0
  `))
  .then(() => Promise.all(Array.from(Array(3)).map((_, reaction_id) => db.run(`
    UPDATE stimuls
    SET count_num = 1
    WHERE stimul_id IN (SELECT stimul_id
                        FROM stimuls s
                               INNER JOIN reactions r ON (r.reaction_id = s.reaction_id)
                        WHERE r.reaction_block = ?
                        ORDER BY random()
                        LIMIT 40);
  `, [reaction_id + 1]))))
  .then(computeResult)
  .catch((e) => console.error(e));
