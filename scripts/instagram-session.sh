#!/usr/bin/env bash
# Instagram oturumunu tarayıcı çerezinden sunucuya ekler.
#
#   1) Tarayıcıda instagram.com'a o hesapla giriş yap
#   2) F12 -> Application (Chrome) / Storage (Firefox) -> Cookies -> https://www.instagram.com
#   3) sessionid (zorunlu), csrftoken ve ds_user_id (isteğe bağlı) değerlerini kopyala
#   4) scripts/instagram-session.sh <kullanici> <sessionid> [csrftoken] [ds_user_id]
#
# Durum görmek için: scripts/instagram-session.sh list
# Sunucudaki web-Firefox'tan (browser.robiapp.online) otomatik almak için:
#   scripts/instagram-session.sh from-browser <kullanici>
set -e
cd "$(dirname "$0")/.."
VOL=instascope_scraper_data
if [ "$1" = list ]; then
  echo "Session dosyaları:"; docker run --rm -v $VOL:/data alpine ls -la /data | grep instaloader || echo "  (yok)"
  echo "INSTAGRAM_ACCOUNTS=$(grep -E '^INSTAGRAM_ACCOUNTS=' .env | cut -d= -f2-)"; exit 0
fi
if [ "$1" = from-browser ]; then
  user="$2"; [ -n "$user" ] || { echo "Kullanım: $0 from-browser <kullanici>"; exit 1; }
  db=$(ls /srv/apps/browser/config/.config/mozilla/firefox/*/cookies.sqlite 2>/dev/null | head -1)
  [ -n "$db" ] || { echo "Firefox çerez dosyası yok — browser.robiapp.online'da Instagram'a giriş yapıldı mı?"; exit 1; }
  tmp=$(mktemp); cp "$db" "$tmp"; [ -f "$db-wal" ] && cp "$db-wal" "$tmp-wal"
  read -r sid csrf dsid < <(sqlite3 "$tmp" "select
    max(case when name='sessionid' then value end),
    max(case when name='csrftoken' then value end),
    max(case when name='ds_user_id' then value end)
    from moz_cookies where host like '%instagram.com';" | tr '|' ' ')
  rm -f "$tmp" "$tmp-wal"
  [ -n "$sid" ] || { echo "Instagram sessionid çerezi bulunamadı — tarayıcıda giriş tamamlanmamış."; exit 1; }
  echo "Çerez bulundu (ds_user_id=$dsid), doğrulanıyor..."
  set -- "$user" "$sid" "$csrf" "$dsid"
fi
user="$1"; sid="$2"; csrf="$3"; dsid="$4"
[ -n "$user" ] && [ -n "$sid" ] || { sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
docker run --rm -v $VOL:/data -v "$PWD/scripts/make_session.py":/make_session.py:ro --user root \
  instascope-scraper python /make_session.py "$user" "$sid" $csrf $dsid
docker run --rm -v $VOL:/data alpine chown -R 999:999 /data 2>/dev/null || true
# .env'e ekle
cur=$(grep -E '^INSTAGRAM_ACCOUNTS=' .env | cut -d= -f2-)
case ",$cur," in *",$user,"*) new="$cur" ;; *) new="${cur:+$cur,}$user" ;; esac
sed -i "s|^INSTAGRAM_ACCOUNTS=.*|INSTAGRAM_ACCOUNTS=$new|" .env
docker compose up -d scraper >/dev/null 2>&1
echo "INSTAGRAM_ACCOUNTS=$new — scraper yeniden başlatıldı."
