#!/usr/bin/env bash
# Kullanım: scripts/add-instagram-session.sh <instagram_kullanici> <session_dosyasi>
# Lokalde `instaloader --login=<kullanici> --sessionfile=./session-<kullanici>` ile
# oluşturulan session dosyasını scraper container'ının /data volume'una kopyalar,
# hesabı INSTAGRAM_ACCOUNTS listesine ekler ve scraper'ı yeniden başlatır.
set -e
user="$1"; file="$2"
[ -n "$user" ] && [ -f "$file" ] || { echo "Kullanım: $0 <instagram_kullanici> <session_dosyasi>"; exit 1; }
cd "$(dirname "$0")/.."
docker compose up -d --no-recreate scraper >/dev/null 2>&1 || true
docker cp "$file" instascope-scraper:/data/.instaloader-"$user"
docker exec -u root instascope-scraper chown appuser:appuser /data/.instaloader-"$user"
cur=$(grep -E '^INSTAGRAM_ACCOUNTS=' .env | cut -d= -f2-)
case ",$cur," in *",$user,"*) new="$cur" ;; *) new="${cur:+$cur,}$user" ;; esac
sed -i "s|^INSTAGRAM_ACCOUNTS=.*|INSTAGRAM_ACCOUNTS=$new|" .env
docker compose up -d scraper
echo "Eklendi: @$user  (INSTAGRAM_ACCOUNTS=$new)"; sleep 5; docker logs instascope-scraper --tail 5
