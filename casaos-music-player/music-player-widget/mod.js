/*
 * Music Player Widget — CasaMOD mod for CasaOS.
 *
 * A dashboard widget that plays a folder of your CasaOS storage (subfolders
 * included, optionally). Playback lives outside the widget, so it keeps going
 * while you browse CasaOS; the last track and position are remembered.
 * Media keys work through the Media Session API.
 *
 * Files are listed with the CasaOS API (/v1/folder) and streamed from
 * /v1/file, so nothing leaves your server. Pairs with the Starry Orbit
 * wallpaper mod, which reacts to whatever plays in the tab.
 */
(function () {
  'use strict';

  if (window.__musicPlayerWidget) return;
  window.__musicPlayerWidget = true;

  var STORE = 'casamod-music-player';
  var DEFAULT_FOLDER = '/DATA/Media/Music';
  var AUDIO_EXT = /\.(mp3|flac|ogg|oga|opus|wav|m4a|aac|webm|weba)$/i;
  var MAX_FILES = 3000, MAX_FOLDERS = 400, MAX_DEPTH = 3;
  var TAG = '[Music Player]';

  // ---------------------------------------------------------------------------
  // Text, in every CasaOS language (follows CasaOS; English by default).
  // 'tracks' holds the plural forms of "N tracks" (Intl.PluralRules categories).
  // ---------------------------------------------------------------------------
  var TEXT = {
    en: {
      title: 'Music', folder: 'Music folder', change: 'Change folder', scanning: 'Reading the folder…',
      empty: 'No audio files in this folder.', folderError: 'Could not open this folder.',
      nothing: 'Nothing playing', pick: 'Pick a track or press play', playlist: 'Playlist',
      tracks: { one: '{n} track', other: '{n} tracks' },
      play: 'Play', pause: 'Pause', next: 'Next', prev: 'Previous', shuffle: 'Shuffle',
      repeatAll: 'Repeat all', repeatOne: 'Repeat one', repeatOff: 'Repeat off', volume: 'Volume',
      subfolders: 'Include subfolders', use: 'Use this folder', cancel: 'Cancel', up: 'Up one level',
      loadError: 'Could not play this file, skipping.',
      search: 'Search the playlist', noMatch: 'No matching tracks.', queueAdd: 'Add to queue', queueRemove: 'Remove from queue'
    },
    ar: {
      title: 'الموسيقى', folder: 'مجلد الموسيقى', change: 'تغيير المجلد', scanning: 'جارٍ قراءة المجلد…',
      empty: 'لا توجد ملفات صوتية في هذا المجلد.', folderError: 'تعذّر فتح هذا المجلد.',
      nothing: 'لا شيء قيد التشغيل', pick: 'اختر مقطعًا أو اضغط تشغيل', playlist: 'قائمة التشغيل',
      tracks: { zero: '{n} مقطع', one: 'مقطع واحد', two: 'مقطعان', few: '{n} مقاطع', many: '{n} مقطعًا', other: '{n} مقطع' },
      play: 'تشغيل', pause: 'إيقاف مؤقت', next: 'التالي', prev: 'السابق', shuffle: 'ترتيب عشوائي',
      repeatAll: 'تكرار الكل', repeatOne: 'تكرار مقطع واحد', repeatOff: 'بدون تكرار', volume: 'مستوى الصوت',
      subfolders: 'تضمين المجلدات الفرعية', use: 'استخدام هذا المجلد', cancel: 'إلغاء', up: 'مستوى واحد للأعلى',
      loadError: 'تعذّر تشغيل هذا الملف، يتم التخطي.',
      search: 'ابحث في قائمة التشغيل', noMatch: 'لا توجد مقاطع مطابقة.', queueAdd: 'إضافة إلى قائمة الانتظار', queueRemove: 'إزالة من قائمة الانتظار'
    },
    be: {
      title: 'Музыка', folder: 'Папка з музыкай', change: 'Змяніць папку', scanning: 'Чытанне папкі…',
      empty: 'У гэтай папцы няма аўдыяфайлаў.', folderError: 'Не ўдалося адкрыць гэту папку.',
      nothing: 'Нічога не грае', pick: 'Выберыце трэк або націсніце «Прайграць»', playlist: 'Плэйліст',
      tracks: { one: '{n} трэк', few: '{n} трэкі', many: '{n} трэкаў', other: '{n} трэка' },
      play: 'Прайграць', pause: 'Паўза', next: 'Наступны', prev: 'Папярэдні', shuffle: 'Выпадкова',
      repeatAll: 'Паўтараць усё', repeatOne: 'Паўтараць адзін', repeatOff: 'Без паўтору', volume: 'Гучнасць',
      subfolders: 'Уключыць падпапкі', use: 'Выкарыстаць гэту папку', cancel: 'Скасаваць', up: 'На ўзровень вышэй',
      loadError: 'Не ўдалося прайграць гэты файл, прапускаю.',
      search: 'Пошук у плэйлісце', noMatch: 'Няма адпаведных трэкаў.', queueAdd: 'Дадаць у чаргу', queueRemove: 'Выдаліць з чаргі'
    },
    bg: {
      title: 'Музика', folder: 'Папка с музика', change: 'Смяна на папката', scanning: 'Четене на папката…',
      empty: 'В тази папка няма аудиофайлове.', folderError: 'Тази папка не може да бъде отворена.',
      nothing: 'Нищо не свири', pick: 'Изберете песен или натиснете „Пусни“', playlist: 'Плейлист',
      tracks: { one: '{n} песен', other: '{n} песни' },
      play: 'Пусни', pause: 'Пауза', next: 'Следваща', prev: 'Предишна', shuffle: 'Разбъркано',
      repeatAll: 'Повтаряй всички', repeatOne: 'Повтаряй една', repeatOff: 'Без повторение', volume: 'Сила на звука',
      subfolders: 'Включи подпапките', use: 'Използвай тази папка', cancel: 'Отказ', up: 'Едно ниво нагоре',
      loadError: 'Този файл не може да се възпроизведе, пропускам го.',
      search: 'Търсене в плейлиста', noMatch: 'Няма съвпадащи песни.', queueAdd: 'Добави към опашката', queueRemove: 'Премахни от опашката'
    },
    ca: {
      title: 'Música', folder: 'Carpeta de música', change: 'Canvia la carpeta', scanning: 'Llegint la carpeta…',
      empty: 'No hi ha fitxers d’àudio en aquesta carpeta.', folderError: 'No s’ha pogut obrir aquesta carpeta.',
      nothing: 'No sona res', pick: 'Tria una pista o prem reproduir', playlist: 'Llista de reproducció',
      tracks: { one: '{n} pista', other: '{n} pistes' },
      play: 'Reprodueix', pause: 'Pausa', next: 'Següent', prev: 'Anterior', shuffle: 'Aleatori',
      repeatAll: 'Repeteix-ho tot', repeatOne: 'Repeteix-ne una', repeatOff: 'Sense repetició', volume: 'Volum',
      subfolders: 'Inclou les subcarpetes', use: 'Fes servir aquesta carpeta', cancel: 'Cancel·la', up: 'Un nivell amunt',
      loadError: 'No s’ha pogut reproduir aquest fitxer, se salta.',
      search: 'Cerca a la llista', noMatch: 'Cap pista coincideix.', queueAdd: 'Afegeix a la cua', queueRemove: 'Treu de la cua'
    },
    cs: {
      title: 'Hudba', folder: 'Složka s hudbou', change: 'Změnit složku', scanning: 'Čtení složky…',
      empty: 'V této složce nejsou žádné zvukové soubory.', folderError: 'Tuto složku nelze otevřít.',
      nothing: 'Nic nehraje', pick: 'Vyberte skladbu nebo stiskněte přehrát', playlist: 'Playlist',
      tracks: { one: '{n} skladba', few: '{n} skladby', many: '{n} skladby', other: '{n} skladeb' },
      play: 'Přehrát', pause: 'Pozastavit', next: 'Další', prev: 'Předchozí', shuffle: 'Náhodně',
      repeatAll: 'Opakovat vše', repeatOne: 'Opakovat jednu', repeatOff: 'Neopakovat', volume: 'Hlasitost',
      subfolders: 'Včetně podsložek', use: 'Použít tuto složku', cancel: 'Zrušit', up: 'O úroveň výš',
      loadError: 'Tento soubor nelze přehrát, přeskakuji.',
      search: 'Hledat v playlistu', noMatch: 'Žádné odpovídající skladby.', queueAdd: 'Přidat do fronty', queueRemove: 'Odebrat z fronty'
    },
    de: {
      title: 'Musik', folder: 'Musikordner', change: 'Ordner wechseln', scanning: 'Ordner wird gelesen…',
      empty: 'Keine Audiodateien in diesem Ordner.', folderError: 'Dieser Ordner konnte nicht geöffnet werden.',
      nothing: 'Es läuft nichts', pick: 'Wähle einen Titel oder drücke Play', playlist: 'Playlist',
      tracks: { one: '{n} Titel', other: '{n} Titel' },
      play: 'Abspielen', pause: 'Pause', next: 'Weiter', prev: 'Zurück', shuffle: 'Zufallswiedergabe',
      repeatAll: 'Alle wiederholen', repeatOne: 'Einen wiederholen', repeatOff: 'Nicht wiederholen', volume: 'Lautstärke',
      subfolders: 'Unterordner einbeziehen', use: 'Diesen Ordner verwenden', cancel: 'Abbrechen', up: 'Eine Ebene höher',
      loadError: 'Diese Datei kann nicht abgespielt werden, wird übersprungen.',
      search: 'Playlist durchsuchen', noMatch: 'Keine passenden Titel.', queueAdd: 'Zur Warteschlange hinzufügen', queueRemove: 'Aus der Warteschlange entfernen'
    },
    el: {
      title: 'Μουσική', folder: 'Φάκελος μουσικής', change: 'Αλλαγή φακέλου', scanning: 'Ανάγνωση φακέλου…',
      empty: 'Δεν υπάρχουν αρχεία ήχου σε αυτόν τον φάκελο.', folderError: 'Δεν ήταν δυνατό το άνοιγμα του φακέλου.',
      nothing: 'Δεν παίζει τίποτα', pick: 'Επιλέξτε κομμάτι ή πατήστε αναπαραγωγή', playlist: 'Λίστα αναπαραγωγής',
      tracks: { one: '{n} κομμάτι', other: '{n} κομμάτια' },
      play: 'Αναπαραγωγή', pause: 'Παύση', next: 'Επόμενο', prev: 'Προηγούμενο', shuffle: 'Τυχαία σειρά',
      repeatAll: 'Επανάληψη όλων', repeatOne: 'Επανάληψη ενός', repeatOff: 'Χωρίς επανάληψη', volume: 'Ένταση',
      subfolders: 'Συμπερίληψη υποφακέλων', use: 'Χρήση αυτού του φακέλου', cancel: 'Άκυρο', up: 'Ένα επίπεδο πάνω',
      loadError: 'Δεν ήταν δυνατή η αναπαραγωγή του αρχείου, παραλείπεται.',
      search: 'Αναζήτηση στη λίστα', noMatch: 'Δεν βρέθηκαν κομμάτια.', queueAdd: 'Προσθήκη στην ουρά', queueRemove: 'Αφαίρεση από την ουρά'
    },
    es: {
      title: 'Música', folder: 'Carpeta de música', change: 'Cambiar carpeta', scanning: 'Leyendo la carpeta…',
      empty: 'No hay archivos de audio en esta carpeta.', folderError: 'No se pudo abrir esta carpeta.',
      nothing: 'No suena nada', pick: 'Elige una pista o pulsa reproducir', playlist: 'Lista de reproducción',
      tracks: { one: '{n} pista', other: '{n} pistas' },
      play: 'Reproducir', pause: 'Pausar', next: 'Siguiente', prev: 'Anterior', shuffle: 'Aleatorio',
      repeatAll: 'Repetir todo', repeatOne: 'Repetir una', repeatOff: 'Sin repetir', volume: 'Volumen',
      subfolders: 'Incluir subcarpetas', use: 'Usar esta carpeta', cancel: 'Cancelar', up: 'Subir un nivel',
      loadError: 'No se pudo reproducir este archivo, se omite.',
      search: 'Buscar en la lista', noMatch: 'No hay pistas que coincidan.', queueAdd: 'Añadir a la cola', queueRemove: 'Quitar de la cola'
    },
    fr: {
      title: 'Musique', folder: 'Dossier de musique', change: 'Changer de dossier', scanning: 'Lecture du dossier…',
      empty: 'Aucun fichier audio dans ce dossier.', folderError: 'Impossible d’ouvrir ce dossier.',
      nothing: 'Aucune lecture', pick: 'Choisissez une piste ou appuyez sur lecture', playlist: 'Liste de lecture',
      tracks: { one: '{n} piste', other: '{n} pistes' },
      play: 'Lecture', pause: 'Pause', next: 'Suivant', prev: 'Précédent', shuffle: 'Aléatoire',
      repeatAll: 'Tout répéter', repeatOne: 'Répéter une piste', repeatOff: 'Sans répétition', volume: 'Volume',
      subfolders: 'Inclure les sous-dossiers', use: 'Utiliser ce dossier', cancel: 'Annuler', up: 'Remonter d’un niveau',
      loadError: 'Impossible de lire ce fichier, passage au suivant.',
      search: 'Rechercher dans la liste', noMatch: 'Aucune piste correspondante.', queueAdd: 'Ajouter à la file d’attente', queueRemove: 'Retirer de la file d’attente'
    },
    hr: {
      title: 'Glazba', folder: 'Mapa s glazbom', change: 'Promijeni mapu', scanning: 'Čitanje mape…',
      empty: 'U ovoj mapi nema audiodatoteka.', folderError: 'Ovu mapu nije moguće otvoriti.',
      nothing: 'Ništa ne svira', pick: 'Odaberite pjesmu ili pritisnite reprodukciju', playlist: 'Popis za reprodukciju',
      tracks: { one: '{n} pjesma', few: '{n} pjesme', other: '{n} pjesama' },
      play: 'Reproduciraj', pause: 'Pauza', next: 'Sljedeća', prev: 'Prethodna', shuffle: 'Nasumično',
      repeatAll: 'Ponavljaj sve', repeatOne: 'Ponavljaj jednu', repeatOff: 'Bez ponavljanja', volume: 'Glasnoća',
      subfolders: 'Uključi podmape', use: 'Koristi ovu mapu', cancel: 'Odustani', up: 'Jednu razinu gore',
      loadError: 'Ovu datoteku nije moguće reproducirati, preskačem.',
      search: 'Pretraži popis', noMatch: 'Nema odgovarajućih pjesama.', queueAdd: 'Dodaj u red čekanja', queueRemove: 'Ukloni iz reda čekanja'
    },
    hu: {
      title: 'Zene', folder: 'Zenemappa', change: 'Mappa módosítása', scanning: 'Mappa beolvasása…',
      empty: 'Ebben a mappában nincsenek hangfájlok.', folderError: 'Ezt a mappát nem sikerült megnyitni.',
      nothing: 'Nem szól semmi', pick: 'Válassz egy számot, vagy nyomd meg a lejátszást', playlist: 'Lejátszási lista',
      tracks: { one: '{n} szám', other: '{n} szám' },
      play: 'Lejátszás', pause: 'Szünet', next: 'Következő', prev: 'Előző', shuffle: 'Véletlen sorrend',
      repeatAll: 'Összes ismétlése', repeatOne: 'Egy ismétlése', repeatOff: 'Nincs ismétlés', volume: 'Hangerő',
      subfolders: 'Almappákkal együtt', use: 'Ennek a mappának a használata', cancel: 'Mégse', up: 'Egy szinttel feljebb',
      loadError: 'Ezt a fájlt nem sikerült lejátszani, kihagyom.',
      search: 'Keresés a listában', noMatch: 'Nincs egyező szám.', queueAdd: 'Hozzáadás a várólistához', queueRemove: 'Eltávolítás a várólistáról'
    },
    id: {
      title: 'Musik', folder: 'Folder musik', change: 'Ganti folder', scanning: 'Membaca folder…',
      empty: 'Tidak ada file audio di folder ini.', folderError: 'Tidak dapat membuka folder ini.',
      nothing: 'Tidak ada yang diputar', pick: 'Pilih lagu atau tekan putar', playlist: 'Daftar putar',
      tracks: { other: '{n} lagu' },
      play: 'Putar', pause: 'Jeda', next: 'Berikutnya', prev: 'Sebelumnya', shuffle: 'Acak',
      repeatAll: 'Ulangi semua', repeatOne: 'Ulangi satu', repeatOff: 'Tanpa pengulangan', volume: 'Volume',
      subfolders: 'Sertakan subfolder', use: 'Gunakan folder ini', cancel: 'Batal', up: 'Naik satu tingkat',
      loadError: 'Tidak dapat memutar file ini, dilewati.',
      search: 'Cari di daftar putar', noMatch: 'Tidak ada lagu yang cocok.', queueAdd: 'Tambahkan ke antrean', queueRemove: 'Hapus dari antrean'
    },
    it: {
      title: 'Musica', folder: 'Cartella della musica', change: 'Cambia cartella', scanning: 'Lettura della cartella…',
      empty: 'Nessun file audio in questa cartella.', folderError: 'Impossibile aprire questa cartella.',
      nothing: 'Nessuna riproduzione', pick: 'Scegli un brano o premi play', playlist: 'Playlist',
      tracks: { one: '{n} brano', other: '{n} brani' },
      play: 'Riproduci', pause: 'Pausa', next: 'Successivo', prev: 'Precedente', shuffle: 'Casuale',
      repeatAll: 'Ripeti tutto', repeatOne: 'Ripeti uno', repeatOff: 'Nessuna ripetizione', volume: 'Volume',
      subfolders: 'Includi le sottocartelle', use: 'Usa questa cartella', cancel: 'Annulla', up: 'Su di un livello',
      loadError: 'Impossibile riprodurre questo file, lo salto.',
      search: 'Cerca nella playlist', noMatch: 'Nessun brano corrispondente.', queueAdd: 'Aggiungi alla coda', queueRemove: 'Rimuovi dalla coda'
    },
    ja: {
      title: '音楽', folder: '音楽フォルダー', change: 'フォルダーを変更', scanning: 'フォルダーを読み込み中…',
      empty: 'このフォルダーには音声ファイルがありません。', folderError: 'このフォルダーを開けませんでした。',
      nothing: '再生していません', pick: '曲を選ぶか再生を押してください', playlist: 'プレイリスト',
      tracks: { other: '{n} 曲' },
      play: '再生', pause: '一時停止', next: '次へ', prev: '前へ', shuffle: 'シャッフル',
      repeatAll: '全曲リピート', repeatOne: '1曲リピート', repeatOff: 'リピートなし', volume: '音量',
      subfolders: 'サブフォルダーを含める', use: 'このフォルダーを使う', cancel: 'キャンセル', up: '1つ上の階層へ',
      loadError: 'このファイルを再生できないため、スキップします。',
      search: 'プレイリストを検索', noMatch: '一致する曲はありません。', queueAdd: 'キューに追加', queueRemove: 'キューから削除'
    },
    ko: {
      title: '음악', folder: '음악 폴더', change: '폴더 변경', scanning: '폴더를 읽는 중…',
      empty: '이 폴더에 오디오 파일이 없습니다.', folderError: '이 폴더를 열 수 없습니다.',
      nothing: '재생 중인 곡 없음', pick: '곡을 선택하거나 재생을 누르세요', playlist: '재생 목록',
      tracks: { other: '{n}곡' },
      play: '재생', pause: '일시 정지', next: '다음', prev: '이전', shuffle: '셔플',
      repeatAll: '전체 반복', repeatOne: '한 곡 반복', repeatOff: '반복 안 함', volume: '음량',
      subfolders: '하위 폴더 포함', use: '이 폴더 사용', cancel: '취소', up: '한 단계 위로',
      loadError: '이 파일을 재생할 수 없어 건너뜁니다.',
      search: '재생 목록 검색', noMatch: '일치하는 곡이 없습니다.', queueAdd: '대기열에 추가', queueRemove: '대기열에서 제거'
    },
    nl: {
      title: 'Muziek', folder: 'Muziekmap', change: 'Map wijzigen', scanning: 'Map wordt gelezen…',
      empty: 'Geen audiobestanden in deze map.', folderError: 'Kan deze map niet openen.',
      nothing: 'Er speelt niets', pick: 'Kies een nummer of druk op afspelen', playlist: 'Afspeellijst',
      tracks: { one: '{n} nummer', other: '{n} nummers' },
      play: 'Afspelen', pause: 'Pauzeren', next: 'Volgende', prev: 'Vorige', shuffle: 'Willekeurig',
      repeatAll: 'Alles herhalen', repeatOne: 'Eén herhalen', repeatOff: 'Niet herhalen', volume: 'Volume',
      subfolders: 'Submappen meenemen', use: 'Deze map gebruiken', cancel: 'Annuleren', up: 'Eén niveau omhoog',
      loadError: 'Kan dit bestand niet afspelen, wordt overgeslagen.',
      search: 'Zoeken in afspeellijst', noMatch: 'Geen overeenkomende nummers.', queueAdd: 'Toevoegen aan wachtrij', queueRemove: 'Verwijderen uit wachtrij'
    },
    no: {
      title: 'Musikk', folder: 'Musikkmappe', change: 'Bytt mappe', scanning: 'Leser mappen …',
      empty: 'Ingen lydfiler i denne mappen.', folderError: 'Kunne ikke åpne denne mappen.',
      nothing: 'Ingenting spilles', pick: 'Velg et spor eller trykk på spill av', playlist: 'Spilleliste',
      tracks: { one: '{n} spor', other: '{n} spor' },
      play: 'Spill av', pause: 'Pause', next: 'Neste', prev: 'Forrige', shuffle: 'Tilfeldig rekkefølge',
      repeatAll: 'Gjenta alle', repeatOne: 'Gjenta én', repeatOff: 'Ikke gjenta', volume: 'Volum',
      subfolders: 'Ta med undermapper', use: 'Bruk denne mappen', cancel: 'Avbryt', up: 'Ett nivå opp',
      loadError: 'Kunne ikke spille av denne filen, hopper over.',
      search: 'Søk i spillelisten', noMatch: 'Ingen spor passer.', queueAdd: 'Legg til i køen', queueRemove: 'Fjern fra køen'
    },
    pl: {
      title: 'Muzyka', folder: 'Folder z muzyką', change: 'Zmień folder', scanning: 'Odczytywanie folderu…',
      empty: 'W tym folderze nie ma plików audio.', folderError: 'Nie można otworzyć tego folderu.',
      nothing: 'Nic nie gra', pick: 'Wybierz utwór lub naciśnij odtwarzanie', playlist: 'Playlista',
      tracks: { one: '{n} utwór', few: '{n} utwory', many: '{n} utworów', other: '{n} utworu' },
      play: 'Odtwórz', pause: 'Wstrzymaj', next: 'Następny', prev: 'Poprzedni', shuffle: 'Losowo',
      repeatAll: 'Powtarzaj wszystkie', repeatOne: 'Powtarzaj jeden', repeatOff: 'Bez powtarzania', volume: 'Głośność',
      subfolders: 'Uwzględnij podfoldery', use: 'Użyj tego folderu', cancel: 'Anuluj', up: 'Poziom wyżej',
      loadError: 'Nie można odtworzyć tego pliku, pomijam.',
      search: 'Szukaj w playliście', noMatch: 'Brak pasujących utworów.', queueAdd: 'Dodaj do kolejki', queueRemove: 'Usuń z kolejki'
    },
    pt: {
      title: 'Música', folder: 'Pasta de músicas', change: 'Trocar pasta', scanning: 'Lendo a pasta…',
      empty: 'Nenhum arquivo de áudio nesta pasta.', folderError: 'Não foi possível abrir esta pasta.',
      nothing: 'Nada tocando', pick: 'Escolha uma faixa ou aperte play', playlist: 'Playlist',
      tracks: { one: '{n} faixa', other: '{n} faixas' },
      play: 'Tocar', pause: 'Pausar', next: 'Próxima', prev: 'Anterior', shuffle: 'Aleatório',
      repeatAll: 'Repetir tudo', repeatOne: 'Repetir uma', repeatOff: 'Sem repetir', volume: 'Volume',
      subfolders: 'Incluir subpastas', use: 'Usar esta pasta', cancel: 'Cancelar', up: 'Subir um nível',
      loadError: 'Não foi possível tocar este arquivo, pulando.',
      search: 'Pesquisar na playlist', noMatch: 'Nenhuma faixa encontrada.', queueAdd: 'Adicionar à fila', queueRemove: 'Remover da fila'
    },
    // Only what differs from pt
    'pt-pt': {
      scanning: 'A ler a pasta…', empty: 'Nenhum ficheiro de áudio nesta pasta.', nothing: 'Nada a tocar',
      pick: 'Escolha uma faixa ou prima reproduzir', playlist: 'Lista de reprodução', play: 'Reproduzir',
      loadError: 'Não foi possível reproduzir este ficheiro; a passar à seguinte.',
      search: 'Pesquisar na lista'
    },
    ro: {
      title: 'Muzică', folder: 'Dosarul cu muzică', change: 'Schimbă dosarul', scanning: 'Se citește dosarul…',
      empty: 'Niciun fișier audio în acest dosar.', folderError: 'Acest dosar nu a putut fi deschis.',
      nothing: 'Nu se redă nimic', pick: 'Alegeți o piesă sau apăsați redare', playlist: 'Listă de redare',
      tracks: { one: '{n} piesă', few: '{n} piese', other: '{n} de piese' },
      play: 'Redă', pause: 'Pauză', next: 'Următoarea', prev: 'Anterioara', shuffle: 'Amestecat',
      repeatAll: 'Repetă tot', repeatOne: 'Repetă una', repeatOff: 'Fără repetare', volume: 'Volum',
      subfolders: 'Include subdosarele', use: 'Folosește acest dosar', cancel: 'Anulează', up: 'Cu un nivel mai sus',
      loadError: 'Acest fișier nu a putut fi redat, se trece peste el.',
      search: 'Caută în listă', noMatch: 'Nicio piesă găsită.', queueAdd: 'Adaugă în coadă', queueRemove: 'Elimină din coadă'
    },
    ru: {
      title: 'Музыка', folder: 'Папка с музыкой', change: 'Сменить папку', scanning: 'Чтение папки…',
      empty: 'В этой папке нет аудиофайлов.', folderError: 'Не удалось открыть эту папку.',
      nothing: 'Ничего не играет', pick: 'Выберите трек или нажмите «Воспроизвести»', playlist: 'Плейлист',
      tracks: { one: '{n} трек', few: '{n} трека', many: '{n} треков', other: '{n} трека' },
      play: 'Воспроизвести', pause: 'Пауза', next: 'Следующий', prev: 'Предыдущий', shuffle: 'Перемешать',
      repeatAll: 'Повторять все', repeatOne: 'Повторять один', repeatOff: 'Без повтора', volume: 'Громкость',
      subfolders: 'Включить подпапки', use: 'Использовать эту папку', cancel: 'Отмена', up: 'На уровень выше',
      loadError: 'Не удалось воспроизвести этот файл, пропускаю.',
      search: 'Поиск в плейлисте', noMatch: 'Нет подходящих треков.', queueAdd: 'Добавить в очередь', queueRemove: 'Убрать из очереди'
    },
    sk: {
      title: 'Hudba', folder: 'Priečinok s hudbou', change: 'Zmeniť priečinok', scanning: 'Číta sa priečinok…',
      empty: 'V tomto priečinku nie sú žiadne zvukové súbory.', folderError: 'Tento priečinok sa nepodarilo otvoriť.',
      nothing: 'Nič nehrá', pick: 'Vyberte skladbu alebo stlačte prehrať', playlist: 'Playlist',
      tracks: { one: '{n} skladba', few: '{n} skladby', many: '{n} skladby', other: '{n} skladieb' },
      play: 'Prehrať', pause: 'Pozastaviť', next: 'Ďalšia', prev: 'Predchádzajúca', shuffle: 'Náhodne',
      repeatAll: 'Opakovať všetko', repeatOne: 'Opakovať jednu', repeatOff: 'Neopakovať', volume: 'Hlasitosť',
      subfolders: 'Vrátane podpriečinkov', use: 'Použiť tento priečinok', cancel: 'Zrušiť', up: 'O úroveň vyššie',
      loadError: 'Tento súbor sa nedá prehrať, preskakujem.',
      search: 'Hľadať v playliste', noMatch: 'Žiadne zodpovedajúce skladby.', queueAdd: 'Pridať do frontu', queueRemove: 'Odobrať z frontu'
    },
    sl: {
      title: 'Glasba', folder: 'Mapa z glasbo', change: 'Zamenjaj mapo', scanning: 'Branje mape …',
      empty: 'V tej mapi ni zvočnih datotek.', folderError: 'Te mape ni bilo mogoče odpreti.',
      nothing: 'Nič se ne predvaja', pick: 'Izberite skladbo ali pritisnite predvajaj', playlist: 'Seznam predvajanja',
      tracks: { one: '{n} skladba', two: '{n} skladbi', few: '{n} skladbe', other: '{n} skladb' },
      play: 'Predvajaj', pause: 'Premor', next: 'Naslednja', prev: 'Prejšnja', shuffle: 'Naključno',
      repeatAll: 'Ponavljaj vse', repeatOne: 'Ponavljaj eno', repeatOff: 'Brez ponavljanja', volume: 'Glasnost',
      subfolders: 'Vključi podmape', use: 'Uporabi to mapo', cancel: 'Prekliči', up: 'Raven višje',
      loadError: 'Te datoteke ni mogoče predvajati, preskakujem.',
      search: 'Iskanje po seznamu', noMatch: 'Ni ustreznih skladb.', queueAdd: 'Dodaj v čakalno vrsto', queueRemove: 'Odstrani iz čakalne vrste'
    },
    sv: {
      title: 'Musik', folder: 'Musikmapp', change: 'Byt mapp', scanning: 'Läser mappen…',
      empty: 'Inga ljudfiler i den här mappen.', folderError: 'Det gick inte att öppna mappen.',
      nothing: 'Inget spelas', pick: 'Välj ett spår eller tryck på spela', playlist: 'Spellista',
      tracks: { one: '{n} spår', other: '{n} spår' },
      play: 'Spela', pause: 'Pausa', next: 'Nästa', prev: 'Föregående', shuffle: 'Blanda',
      repeatAll: 'Upprepa alla', repeatOne: 'Upprepa ett', repeatOff: 'Upprepa inte', volume: 'Volym',
      subfolders: 'Ta med undermappar', use: 'Använd den här mappen', cancel: 'Avbryt', up: 'En nivå upp',
      loadError: 'Det gick inte att spela filen, hoppar över.',
      search: 'Sök i spellistan', noMatch: 'Inga matchande spår.', queueAdd: 'Lägg till i kön', queueRemove: 'Ta bort från kön'
    },
    tr: {
      title: 'Müzik', folder: 'Müzik klasörü', change: 'Klasörü değiştir', scanning: 'Klasör okunuyor…',
      empty: 'Bu klasörde ses dosyası yok.', folderError: 'Bu klasör açılamadı.',
      nothing: 'Çalan bir şey yok', pick: 'Bir parça seçin veya oynat’a basın', playlist: 'Çalma listesi',
      tracks: { one: '{n} parça', other: '{n} parça' },
      play: 'Oynat', pause: 'Duraklat', next: 'Sonraki', prev: 'Önceki', shuffle: 'Karıştır',
      repeatAll: 'Tümünü tekrarla', repeatOne: 'Birini tekrarla', repeatOff: 'Tekrarlama kapalı', volume: 'Ses düzeyi',
      subfolders: 'Alt klasörleri dahil et', use: 'Bu klasörü kullan', cancel: 'İptal', up: 'Bir üst düzey',
      loadError: 'Bu dosya oynatılamadı, atlanıyor.',
      search: 'Çalma listesinde ara', noMatch: 'Eşleşen parça yok.', queueAdd: 'Sıraya ekle', queueRemove: 'Sıradan çıkar'
    },
    uk: {
      title: 'Музика', folder: 'Тека з музикою', change: 'Змінити теку', scanning: 'Читання теки…',
      empty: 'У цій теці немає аудіофайлів.', folderError: 'Не вдалося відкрити цю теку.',
      nothing: 'Нічого не грає', pick: 'Оберіть трек або натисніть «Відтворити»', playlist: 'Плейлист',
      tracks: { one: '{n} трек', few: '{n} треки', many: '{n} треків', other: '{n} треку' },
      play: 'Відтворити', pause: 'Пауза', next: 'Наступний', prev: 'Попередній', shuffle: 'Перемішати',
      repeatAll: 'Повторювати все', repeatOne: 'Повторювати один', repeatOff: 'Без повтору', volume: 'Гучність',
      subfolders: 'Включити підтеки', use: 'Використати цю теку', cancel: 'Скасувати', up: 'На рівень вище',
      loadError: 'Не вдалося відтворити цей файл, пропускаю.',
      search: 'Пошук у плейлисті', noMatch: 'Немає відповідних треків.', queueAdd: 'Додати до черги', queueRemove: 'Прибрати з черги'
    },
    vi: {
      title: 'Âm nhạc', folder: 'Thư mục nhạc', change: 'Đổi thư mục', scanning: 'Đang đọc thư mục…',
      empty: 'Không có tệp âm thanh trong thư mục này.', folderError: 'Không thể mở thư mục này.',
      nothing: 'Không phát gì', pick: 'Chọn một bài hoặc nhấn phát', playlist: 'Danh sách phát',
      tracks: { other: '{n} bài' },
      play: 'Phát', pause: 'Tạm dừng', next: 'Tiếp theo', prev: 'Trước', shuffle: 'Phát ngẫu nhiên',
      repeatAll: 'Lặp lại tất cả', repeatOne: 'Lặp lại một bài', repeatOff: 'Không lặp lại', volume: 'Âm lượng',
      subfolders: 'Bao gồm thư mục con', use: 'Dùng thư mục này', cancel: 'Hủy', up: 'Lên một cấp',
      loadError: 'Không thể phát tệp này, đang bỏ qua.',
      search: 'Tìm trong danh sách phát', noMatch: 'Không có bài nào khớp.', queueAdd: 'Thêm vào hàng chờ', queueRemove: 'Xóa khỏi hàng chờ'
    },
    'zh-cn': {
      title: '音乐', folder: '音乐文件夹', change: '更换文件夹', scanning: '正在读取文件夹…',
      empty: '此文件夹中没有音频文件。', folderError: '无法打开此文件夹。',
      nothing: '未在播放', pick: '选择一首曲目或点击播放', playlist: '播放列表',
      tracks: { other: '{n} 首' },
      play: '播放', pause: '暂停', next: '下一首', prev: '上一首', shuffle: '随机播放',
      repeatAll: '全部循环', repeatOne: '单曲循环', repeatOff: '不循环', volume: '音量',
      subfolders: '包含子文件夹', use: '使用此文件夹', cancel: '取消', up: '返回上一级',
      loadError: '无法播放此文件，已跳过。',
      search: '搜索播放列表', noMatch: '没有匹配的曲目。', queueAdd: '加入播放队列', queueRemove: '从播放队列移除'
    },
    'zh-tw': {
      title: '音樂', folder: '音樂資料夾', change: '更換資料夾', scanning: '正在讀取資料夾…',
      empty: '此資料夾中沒有音訊檔案。', folderError: '無法開啟此資料夾。',
      nothing: '未在播放', pick: '選擇一首曲目或點擊播放', playlist: '播放清單',
      tracks: { other: '{n} 首' },
      play: '播放', pause: '暫停', next: '下一首', prev: '上一首', shuffle: '隨機播放',
      repeatAll: '全部重複', repeatOne: '單曲重複', repeatOff: '不重複', volume: '音量',
      subfolders: '包含子資料夾', use: '使用此資料夾', cancel: '取消', up: '回到上一層',
      loadError: '無法播放此檔案，已略過。',
      search: '搜尋播放清單', noMatch: '沒有符合的曲目。', queueAdd: '加入待播清單', queueRemove: '從待播清單移除'
    }
  };

  // CasaOS code (pt_br, zh_tw, no_no…) or browser code → a key of TEXT
  function lang() {
    var c = String(localStorage.getItem('lang') || navigator.language || '').toLowerCase().replace(/_/g, '-');
    if (TEXT[c]) return c;
    var base = c.split('-')[0];
    if (base === 'zh') return /-(tw|hk|mo|hant)\b/.test(c) ? 'zh-tw' : 'zh-cn';
    if (base === 'pt') return /-pt\b/.test(c) ? 'pt-pt' : 'pt';
    if (base === 'nb' || base === 'nn') return 'no';
    return TEXT[base] ? base : 'en';
  }

  function t(key) {
    var l = lang();
    var v = TEXT[l][key];
    if (v === undefined && l === 'pt-pt') v = TEXT.pt[key];
    return v !== undefined ? v : TEXT.en[key] !== undefined ? TEXT.en[key] : key;
  }

  // "12 tracks" with the plural form of the language
  function trackCount(n) {
    var forms = t('tracks'), cat = 'other';
    try { cat = new Intl.PluralRules(lang()).select(n); } catch (e) { /* old browser: 'other' */ }
    return (forms[cat] || forms.other).replace('{n}', n);
  }

  var ICONS = {
    play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>',
    next: '<path d="M6 6l8 6-8 6z" fill="currentColor" stroke="none"/><path d="M17 6v12"/>',
    prev: '<path d="M18 6l-8 6 8 6z" fill="currentColor" stroke="none"/><path d="M7 6v12"/>',
    shuffle: '<path d="M4 7h3.5c2 0 3 1 4.2 2.6l2.6 3.8c1.1 1.6 2.2 2.6 4.2 2.6H20"/><path d="M4 17h3.5c1.4 0 2.3-.5 3.1-1.4M13.4 8.4C14.2 7.5 15.1 7 16.5 7H20"/><path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>',
    repeat: '<path d="M5 11V9a3 3 0 013-3h11"/><path d="M16.5 3.5L19 6l-2.5 2.5"/><path d="M19 13v2a3 3 0 01-3 3H5"/><path d="M7.5 20.5L5 18l2.5-2.5"/>',
    one: '<path d="M11.2 10.4l1.3-.9v5"/>',
    volume: '<path d="M5 9.5h3l4-3.5v12l-4-3.5H5z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 010 6M17.8 6.8a7 7 0 010 10.4"/>',
    mute: '<path d="M5 9.5h3l4-3.5v12l-4-3.5H5z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    folder: '<path d="M3.5 7.5a2 2 0 012-2h4l2 2h7a2 2 0 012 2v7.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12"/><circle cx="4.5" cy="7" r=".6" fill="currentColor"/><circle cx="4.5" cy="12" r=".6" fill="currentColor"/><circle cx="4.5" cy="17" r=".6" fill="currentColor"/>',
    up: '<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/>',
    queue: '<path d="M4 7h11M4 12h11M4 17h7"/><path d="M18 14v6M15 17h6"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; }
  }
  var saved = loadState();
  var state = {
    folder: saved.folder || DEFAULT_FOLDER,
    recursive: saved.recursive !== false,
    volume: typeof saved.volume === 'number' ? saved.volume : 0.8,
    muted: !!saved.muted,
    shuffle: !!saved.shuffle,
    repeat: saved.repeat || 'all',            // all | one | off
    current: saved.current || null,           // path of the current track
    time: saved.time || 0,
    tracks: [], order: [], index: -1,
    queue: [],                                // indexes of tracks to play next, in order
    context: -1,                              // while the queue plays: where the playlist goes on from
    search: '',
    loading: false, message: '',
    showList: false, showFolder: false, browsePath: ''
  };
  // The saved queue (paths) waits for the folder to be read
  var pendingQueue = Array.isArray(saved.queue) ? saved.queue : null;
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        folder: state.folder, recursive: state.recursive, volume: state.volume, muted: state.muted,
        shuffle: state.shuffle, repeat: state.repeat, current: state.current,
        time: Math.floor(audio.currentTime || 0),
        queue: pendingQueue || state.queue.map(function (i) { return state.tracks[i] && state.tracks[i].path; }).filter(Boolean)
      }));
    } catch (e) { /* storage full or blocked */ }
  }

  var audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = state.volume;
  audio.muted = state.muted;

  // ---------------------------------------------------------------------------
  // CasaOS API
  // ---------------------------------------------------------------------------
  function token() {
    try {
      var vm = document.querySelector('#app').__vue__;
      return (vm && vm.$store && vm.$store.state.access_token) || localStorage.getItem('access_token') || '';
    } catch (e) {
      return localStorage.getItem('access_token') || '';
    }
  }

  function listFolder(path) {
    return fetch('/v1/folder?path=' + encodeURIComponent(path), {
      headers: { Authorization: token(), Accept: 'application/json' },
      credentials: 'include'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || !j.data || !Array.isArray(j.data.content)) throw new Error('bad response');
      return j.data.content;
    });
  }

  function fileUrl(path) {
    return '/v1/file?path=' + encodeURIComponent(path) + '&token=' + encodeURIComponent(token());
  }

  var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  function byName(a, b) { return collator.compare(a.name, b.name); }

  function pretty(name) {
    return name.replace(AUDIO_EXT, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function fold(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function parentName(path) {
    var parts = path.split('/').filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 2] : '';
  }

  // ---------------------------------------------------------------------------
  // Library
  // ---------------------------------------------------------------------------
  var scanId = 0;
  function scan() {
    var id = ++scanId;
    if (!pendingQueue && state.queue.length) {
      pendingQueue = state.queue.map(function (i) { return state.tracks[i] && state.tracks[i].path; }).filter(Boolean);
    }
    state.queue = [];
    state.context = -1;
    state.loading = true;
    state.message = t('scanning');
    render();

    var found = [], queue = [{ path: state.folder, depth: 0 }], folders = 0, failed = false;

    function walk() {
      if (id !== scanId) return Promise.resolve();
      if (!queue.length || found.length >= MAX_FILES || folders >= MAX_FOLDERS) return Promise.resolve();
      var item = queue.shift();
      folders++;
      return listFolder(item.path).then(function (entries) {
        entries.sort(byName).forEach(function (e) {
          if (!e || !e.name || e.name.charAt(0) === '.') return;
          if (e.is_dir) {
            if (state.recursive && item.depth < MAX_DEPTH) queue.push({ path: e.path, depth: item.depth + 1 });
          } else if (AUDIO_EXT.test(e.name) && found.length < MAX_FILES) {
            var title = pretty(e.name), album = parentName(e.path);
            found.push({ path: e.path, name: e.name, title: title, album: album, key: fold(title + ' ' + album) });
          }
        });
      }, function () {
        if (folders === 1) failed = true;
      }).then(walk);
    }

    walk().then(function () {
      if (id !== scanId) return;
      state.loading = false;
      state.tracks = found;
      state.message = failed ? t('folderError') : found.length ? '' : t('empty');
      buildOrder();
      if (pendingQueue) {
        state.queue = pendingQueue.map(indexOfPath).filter(function (i, k, all) { return i >= 0 && all.indexOf(i) === k; });
        pendingQueue = null;
      }
      // Resume where it stopped, without autoplay
      var at = state.current ? indexOfPath(state.current) : -1;
      if (at >= 0 && state.index < 0) {
        state.index = at;
        audio.src = fileUrl(found[at].path);
        var resumeAt = state.time;
        audio.addEventListener('loadedmetadata', function once() {
          audio.removeEventListener('loadedmetadata', once);
          if (resumeAt > 0 && resumeAt < (audio.duration || 0) - 2) audio.currentTime = resumeAt;
        });
        updateSession();
      }
      render();
    });
  }

  function indexOfPath(path) {
    for (var i = 0; i < state.tracks.length; i++) if (state.tracks[i].path === path) return i;
    return -1;
  }

  // Playback order: natural or shuffled (current track first when shuffling)
  function buildOrder() {
    var n = state.tracks.length, order = [];
    for (var i = 0; i < n; i++) order.push(i);
    if (state.shuffle) {
      for (var j = n - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1)), tmp = order[j];
        order[j] = order[k];
        order[k] = tmp;
      }
      var from = state.context >= 0 ? state.context : state.index;
      var pos = order.indexOf(from);
      if (pos > 0) { order.splice(pos, 1); order.unshift(from); }
    }
    state.order = order;
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------
  var errors = 0;

  // queued: the track comes from the queue, so the playlist later goes on from
  // where it was; a track picked directly leaves the queue
  function playIndex(i, queued) {
    var tr = state.tracks[i];
    if (!tr) return;
    if (!queued) state.context = -1;
    else if (state.context < 0) state.context = state.index;
    var q = state.queue.indexOf(i);
    if (q >= 0) state.queue.splice(q, 1);
    state.index = i;
    state.current = tr.path;
    audio.src = fileUrl(tr.path);
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: user presses play */ });
    updateSession();
    save();
    render();
  }

  function togglePlay() {
    if (!state.tracks.length) return;
    if (state.index < 0) return state.queue.length ? playIndex(state.queue[0], true) : playIndex(state.order[0]);
    if (audio.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      audio.pause();
    }
  }

  function step(dir, auto) {
    if (!state.tracks.length) return;
    if (auto && state.repeat === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    // The queue first, then the playlist from where it was
    if (dir > 0 && state.queue.length) return playIndex(state.queue[0], true);
    var pos = state.order.indexOf(state.context >= 0 ? state.context : state.index), n = state.order.length;
    var nextPos = pos + dir;
    if (nextPos >= n || nextPos < 0) {
      if (auto && state.repeat === 'off') { audio.pause(); render(); return; }
      if (dir > 0 && state.shuffle) buildOrder();
      nextPos = (nextPos + n) % n;
    }
    playIndex(state.order[nextPos]);
  }

  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    // From a queued track: back to where the playlist was
    if (state.context >= 0) return playIndex(state.context);
    step(-1, false);
  }

  function toggleQueue(i) {
    if (!state.tracks[i]) return;
    var q = state.queue.indexOf(i);
    if (q >= 0) state.queue.splice(q, 1);
    else state.queue.push(i);
    save();
    renderList();
  }

  audio.addEventListener('ended', function () { step(1, true); });
  audio.addEventListener('playing', function () { errors = 0; render(); });
  audio.addEventListener('pause', render);
  audio.addEventListener('error', function () {
    if (state.index < 0 || !audio.src) return;
    state.message = t('loadError');
    render();
    if (++errors < 5) setTimeout(function () { step(1, true); }, 800);
  });

  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    updateProgress();
    var now = Date.now();
    if (now - lastSave > 2000) { lastSave = now; save(); }
  });
  audio.addEventListener('loadedmetadata', updateProgress);
  window.addEventListener('pagehide', save);

  // Media keys, lock screen, browser media controls
  function updateSession() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    var tr = state.tracks[state.index];
    if (!tr) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: tr.title, artist: tr.album, album: 'CasaOS' });
  }
  if ('mediaSession' in navigator) {
    var ms = navigator.mediaSession;
    try {
      ms.setActionHandler('play', togglePlay);
      ms.setActionHandler('pause', function () { audio.pause(); });
      ms.setActionHandler('nexttrack', function () { step(1, false); });
      ms.setActionHandler('previoustrack', prev);
      ms.setActionHandler('seekto', function (d) { if (d.seekTime != null) audio.currentTime = d.seekTime; });
    } catch (e) { /* older browsers */ }
  }

  // ---------------------------------------------------------------------------
  // Widget
  // ---------------------------------------------------------------------------
  var root = null, el = {};

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function build() {
    root = document.createElement('div');
    root.className = 'smp-widget';
    root.setAttribute('widget-id', 'music-player');
    root.innerHTML =
      '<div class="widget has-text-white is-relative">' +
      '<div class="blur-background"></div>' +
      '<div class="widget-content smp-content">' +
      '  <div class="smp-head">' +
      '    <span class="smp-heading"></span>' +
      '    <span class="smp-head-btns">' +
      '      <button type="button" class="smp-btn smp-small" data-act="list">' + icon('list') + '</button>' +
      '      <button type="button" class="smp-btn smp-small" data-act="folder">' + icon('folder') + '</button>' +
      '    </span>' +
      '  </div>' +
      '  <div class="smp-now">' +
      '    <div class="smp-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
      '    <div class="smp-meta"><div class="smp-title"></div><div class="smp-sub"></div></div>' +
      '  </div>' +
      // Playback goes left to right in every language (time, prev/next), as in RTL players
      '  <div class="smp-progress" dir="ltr">' +
      '    <span class="smp-time">0:00</span>' +
      '    <input type="range" class="smp-seek" min="0" max="1000" value="0" step="1">' +
      '    <span class="smp-time smp-dur">0:00</span>' +
      '  </div>' +
      '  <div class="smp-controls" dir="ltr">' +
      '    <button type="button" class="smp-btn" data-act="shuffle">' + icon('shuffle') + '</button>' +
      '    <button type="button" class="smp-btn" data-act="prev">' + icon('prev') + '</button>' +
      '    <button type="button" class="smp-btn smp-play" data-act="play"></button>' +
      '    <button type="button" class="smp-btn" data-act="next">' + icon('next') + '</button>' +
      '    <button type="button" class="smp-btn" data-act="repeat"></button>' +
      '  </div>' +
      '  <div class="smp-volume" dir="ltr">' +
      '    <button type="button" class="smp-btn smp-small" data-act="mute"></button>' +
      '    <input type="range" class="smp-vol" min="0" max="100" step="1">' +
      '  </div>' +
      '  <div class="smp-msg" hidden></div>' +
      '  <div class="smp-folder" hidden>' +
      '    <label class="smp-label"></label>' +
      '    <div class="smp-path-row">' +
      '      <button type="button" class="smp-btn smp-small" data-act="up">' + icon('up') + '</button>' +
      '      <input type="text" class="smp-path" spellcheck="false" dir="ltr">' +
      '    </div>' +
      '    <div class="smp-dirs"></div>' +
      '    <label class="smp-check"><input type="checkbox" class="smp-recursive"> <span></span></label>' +
      '    <div class="smp-folder-btns">' +
      '      <button type="button" class="smp-text-btn smp-primary" data-act="use"></button>' +
      '      <button type="button" class="smp-text-btn" data-act="cancel"></button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="smp-listbox" hidden>' +
      '    <input type="search" class="smp-search" spellcheck="false" autocomplete="off" dir="auto">' +
      '    <div class="smp-list"></div>' +
      '  </div>' +
      '</div></div>';

    ['heading', 'title', 'sub', 'seek', 'dur', 'vol', 'msg', 'folder', 'path', 'dirs', 'recursive', 'listbox', 'search', 'list', 'art', 'label']
      .forEach(function (k) { el[k] = root.querySelector('.smp-' + k); });
    el.time = root.querySelector('.smp-time');
    el.play = root.querySelector('[data-act="play"]');
    el.shuffle = root.querySelector('[data-act="shuffle"]');
    el.repeat = root.querySelector('[data-act="repeat"]');
    el.mute = root.querySelector('[data-act="mute"]');
    el.listBtn = root.querySelector('[data-act="list"]');
    el.folderBtn = root.querySelector('[data-act="folder"]');

    root.addEventListener('click', onClick);
    el.seek.addEventListener('input', function () {
      seeking = true;
      if (audio.duration) el.time.textContent = fmt(el.seek.value / 1000 * audio.duration);
    });
    el.seek.addEventListener('change', function () {
      seeking = false;
      if (audio.duration) audio.currentTime = el.seek.value / 1000 * audio.duration;
    });
    el.vol.addEventListener('input', function () {
      state.volume = el.vol.value / 100;
      audio.volume = state.volume;
      if (state.muted && state.volume > 0) { state.muted = false; audio.muted = false; }
      renderButtons();
      save();
    });
    el.path.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') browse(el.path.value.trim());
    });
    el.path.addEventListener('change', function () { browse(el.path.value.trim()); });
    el.search.addEventListener('input', function () {
      state.search = el.search.value;
      el.list.scrollTop = 0;
      renderList();
    });
    // Enter plays the first result
    el.search.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var first = el.list.querySelector('[data-act="track"]');
      if (first) playIndex(Number(first.getAttribute('data-index')));
    });
  }

  var seeking = false;

  function onClick(e) {
    var btn = e.target.closest('[data-act]');
    if (btn) {
      var act = btn.getAttribute('data-act');
      if (act === 'play') togglePlay();
      else if (act === 'next') step(1, false);
      else if (act === 'prev') prev();
      else if (act === 'shuffle') { state.shuffle = !state.shuffle; buildOrder(); save(); render(); }
      else if (act === 'repeat') {
        state.repeat = state.repeat === 'all' ? 'one' : state.repeat === 'one' ? 'off' : 'all';
        save();
        render();
      } else if (act === 'mute') { state.muted = !state.muted; audio.muted = state.muted; save(); render(); }
      else if (act === 'list') {
        state.showList = !state.showList;
        state.showFolder = false;
        state.search = el.search.value = '';
        listScrolledTo = -1;
        render();
      }
      else if (act === 'folder') {
        state.showFolder = !state.showFolder;
        state.showList = false;
        if (state.showFolder) browse(state.folder);
        render();
      } else if (act === 'up') browse(el.path.value.replace(/\/[^/]+\/?$/, '') || '/');
      else if (act === 'cancel') { state.showFolder = false; render(); }
      else if (act === 'use') {
        state.folder = el.path.value.trim() || DEFAULT_FOLDER;
        state.recursive = el.recursive.checked;
        state.showFolder = false;
        state.index = -1;
        state.current = null;
        state.queue = [];
        pendingQueue = null;
        audio.pause();
        audio.removeAttribute('src');
        save();
        scan();
      } else if (act === 'dir') browse(btn.getAttribute('data-path'));
      else if (act === 'track') playIndex(Number(btn.getAttribute('data-index')));
      else if (act === 'queue') toggleQueue(Number(btn.getAttribute('data-index')));
      return;
    }
  }

  // Folder picker: lists the subfolders of the typed path
  var browseId = 0;
  function browse(path) {
    if (!path) return;
    var id = ++browseId;
    state.browsePath = path;
    el.path.value = path;
    el.dirs.textContent = t('scanning');
    listFolder(path).then(function (entries) {
      if (id !== browseId) return;
      var dirs = entries.filter(function (e) { return e && e.is_dir && e.name.charAt(0) !== '.'; }).sort(byName);
      var audioCount = entries.filter(function (e) { return e && !e.is_dir && AUDIO_EXT.test(e.name); }).length;
      el.dirs.innerHTML = '';
      dirs.slice(0, 200).forEach(function (d) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'smp-dir';
        b.setAttribute('data-act', 'dir');
        b.setAttribute('data-path', d.path);
        b.innerHTML = icon('folder') + '<span></span>';
        b.querySelector('span').textContent = d.name;
        el.dirs.appendChild(b);
      });
      var info = document.createElement('div');
      info.className = 'smp-dir-info';
      info.textContent = trackCount(audioCount);
      el.dirs.appendChild(info);
    }, function () {
      if (id === browseId) el.dirs.textContent = t('folderError');
    });
  }

  // Every word of the search must be in the title or the folder name
  function matches(tr, words) {
    for (var w = 0; w < words.length; w++) if (tr.key.indexOf(words[w]) < 0) return false;
    return true;
  }

  function renderList() {
    if (!state.showList) return;
    var words = fold(state.search).split(/\s+/).filter(Boolean);
    var shown = [], html = '';
    state.tracks.forEach(function (tr, i) {
      if (words.length && !matches(tr, words)) return;
      shown.push(i);
      var q = state.queue.indexOf(i);
      html += '<div class="smp-track' + (i === state.index ? ' smp-current' : '') + '">' +
        '<button type="button" class="smp-track-play" data-act="track" data-index="' + i + '">' +
        '<span class="smp-track-n">' + (i + 1) + '</span><span class="smp-track-t"></span></button>' +
        '<button type="button" class="smp-queue' + (q >= 0 ? ' smp-on' : '') + '" data-act="queue" data-index="' + i + '">' +
        (q >= 0 ? q + 1 : icon('queue')) + '</button></div>';
    });
    if (!shown.length && state.tracks.length) html = '<div class="smp-none"></div>';
    el.list.innerHTML = html;
    var none = el.list.querySelector('.smp-none');
    if (none) none.textContent = t('noMatch');
    var titles = el.list.querySelectorAll('.smp-track-t'), qs = el.list.querySelectorAll('.smp-queue');
    for (var i = 0; i < shown.length; i++) {
      titles[i].textContent = state.tracks[shown[i]].title;
      qs[i].title = qs[i].classList.contains('smp-on') ? t('queueRemove') : t('queueAdd');
    }
    // Keep the current track visible by scrolling the list only (scrollIntoView
    // would scroll the whole CasaOS dashboard), and only when it changes
    var cur = el.list.querySelector('.smp-current');
    if (cur && listScrolledTo !== state.index) {
      listScrolledTo = state.index;
      var top = cur.offsetTop - el.list.offsetTop, bottom = top + cur.offsetHeight;
      if (top < el.list.scrollTop) el.list.scrollTop = top;
      else if (bottom > el.list.scrollTop + el.list.clientHeight) el.list.scrollTop = bottom - el.list.clientHeight;
    }
  }
  var listScrolledTo = -1;

  function renderButtons() {
    el.play.innerHTML = icon(audio.paused ? 'play' : 'pause');
    el.play.title = audio.paused ? t('play') : t('pause');
    el.shuffle.classList.toggle('smp-on', state.shuffle);
    el.shuffle.title = t('shuffle');
    el.repeat.innerHTML = state.repeat === 'one'
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS.repeat + ICONS.one + '</svg>'
      : icon('repeat');
    el.repeat.classList.toggle('smp-on', state.repeat !== 'off');
    el.repeat.title = state.repeat === 'all' ? t('repeatAll') : state.repeat === 'one' ? t('repeatOne') : t('repeatOff');
    el.mute.innerHTML = icon(state.muted || state.volume === 0 ? 'mute' : 'volume');
    el.mute.title = t('volume');
    root.querySelector('[data-act="next"]').title = t('next');
    root.querySelector('[data-act="prev"]').title = t('prev');
    el.listBtn.title = t('playlist');
    el.folderBtn.title = t('change');
    el.listBtn.classList.toggle('smp-on', state.showList);
    el.folderBtn.classList.toggle('smp-on', state.showFolder);
  }

  function updateProgress() {
    if (!root) return;
    var d = audio.duration, c = audio.currentTime;
    el.dur.textContent = fmt(d);
    if (!seeking) {
      el.time.textContent = fmt(c);
      el.seek.value = d ? Math.round(c / d * 1000) : 0;
    }
  }

  function render() {
    if (!root) return;
    var tr = state.tracks[state.index];
    var l = lang();
    if (root.lang !== l) {
      root.lang = l;
      root.dir = l === 'ar' ? 'rtl' : 'ltr';   // the texts and lists follow the language
    }
    el.heading.textContent = t('title');
    el.title.textContent = tr ? tr.title : t('nothing');
    el.sub.textContent = tr ? (tr.album || state.folder) : (state.tracks.length ? trackCount(state.tracks.length) + ' · ' + t('pick') : state.folder);
    el.art.classList.toggle('smp-playing', !audio.paused);
    el.vol.value = Math.round(state.volume * 100);
    el.msg.hidden = !state.message;
    el.msg.textContent = state.message;
    el.folder.hidden = !state.showFolder;
    el.listbox.hidden = !state.showList;
    el.search.placeholder = t('search');
    el.search.setAttribute('aria-label', t('search'));
    el.label.textContent = t('folder');
    el.recursive.checked = state.recursive;
    el.recursive.nextElementSibling.textContent = t('subfolders');
    root.querySelector('[data-act="use"]').textContent = t('use');
    root.querySelector('[data-act="cancel"]').textContent = t('cancel');
    root.querySelector('[data-act="up"]').title = t('up');
    renderButtons();
    renderList();
    updateProgress();
  }

  // Where the widget goes: where the widget-sortable mod last left it (Sortable
  // keeps the order in localStorage 'widget-sortable', widget ids joined by '|'),
  // otherwise first. That mod sorts only once, before this widget is added.
  function slot(container) {
    var order = (localStorage.getItem('widget-sortable') || '').split('|');
    var me = order.indexOf('music-player');
    var items = [].filter.call(container.children, function (c) {
      return c !== root && !/\bps__rail/.test(c.className);
    });
    var end = container.querySelector(':scope > .ps__rail-x, :scope > .ps__rail-y');
    if (me < 0) return items[0] || end;
    function find(id) {
      for (var j = 0; j < items.length; j++) if (items[j].getAttribute('widget-id') === id) return items[j];
      return null;
    }
    var k, w;
    for (k = me + 1; k < order.length; k++) if ((w = find(order[k]))) return w;
    for (k = me - 1; k >= 0; k--) if ((w = find(order[k]))) return w.nextSibling;
    // The other widgets aren't marked yet: the same position
    return items[me] || end;
  }

  // Keeps the widget in the CasaOS sidebar, re-adding it when Vue re-renders
  function mount() {
    var container = document.querySelector('.ps-container');
    if (!container) return;
    if (!root) { build(); render(); }
    if (root.parentNode !== container) container.insertBefore(root, slot(container));
  }

  var scheduled = false;
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; mount(); }, 150);
  }).observe(document.body, { childList: true, subtree: true });

  mount();
  scan();
  console.info(TAG, 'loaded');

  // For other mods and debugging
  window.CasaMusicPlayer = {
    audio: audio,
    state: state,
    play: togglePlay,
    next: function () { step(1, false); },
    prev: prev,
    rescan: scan
  };
})();
