# InstaScope — Deploy Rehberi

Bu branch (`deploy`) **canlı sunucuda çalışan koddur**. `backend` branch'inin üzerine
Docker/deploy altyapısı eklenmiş halidir. Buraya push edilen her commit **en geç 2 dakika içinde**
otomatik olarak sunucuya alınır (build + restart). Elle deploy yapmaya gerek yoktur.

## Adresler

| Servis | Adres | Not |
|---|---|---|
| Web (Nuxt 4) | https://instascope.robiapp.online | Frontend |
| API (NestJS) | https://instascope-api.robiapp.online | Swagger: [/docs](https://instascope-api.robiapp.online/docs) |
| AI (FastAPI) | `http://ai:8000` | Sadece iç ağ, dışarı kapalı |
| Scraper (FastAPI + instaloader) | `http://scraper:8001` | Sadece iç ağ, dışarı kapalı |
| Postgres 16 / Redis 7 | iç ağ | Dışarı port açık değil |

SSL sertifikaları (Let's Encrypt) ve yönlendirme Traefik tarafından otomatik yönetilir.

## Deploy akışı

```
git push origin deploy  →  (≤2 dk)  sunucu: git pull → docker compose up -d --build
```

- Sadece **değişen servisler** yeniden build edilir; diğerleri dokunulmaz.
- Build hata verirse eski container'lar çalışmaya devam eder (site düşmez), hata sunucu loguna yazılır.
- Sunucudaki repoda elle değişiklik yapılmışsa (conflict) otomatik güncelleme o turu atlar.

### Nasıl push edilir

```bash
git fetch origin
git checkout deploy
git merge backend        # ya da feature branch'in
git push origin deploy
```

> `main` branch'i eski ve tutarsız durumda; canlı ortam `deploy`'u takip eder.
> `backend` branch'i geliştirme dalı olarak kullanılmaya devam edebilir; hazır olduğunda `deploy`'a merge edin.

## Ortam değişkenleri

Sunucuda `/srv/apps/instascope/.env` dosyasında tutulur, **git'e girmez**. Şablon: [`.env.example`](.env.example).

| Değişken | Kullanan | Açıklama |
|---|---|---|
| `WEB_HOST`, `API_HOST` | compose | Alan adları |
| `POSTGRES_USER/PASSWORD/DB` | postgres, api, ai | DB erişimi (`DATABASE_URL` bunlardan üretilir) |
| `JWT_SECRET` | api | JWT imzası |
| `TOKEN_ENCRYPTION_MASTER_KEY` | api | 32 byte base64 |
| `PSEUDONYM_SECRET_KEY` | api | Pseudonym HMAC anahtarı |
| `INTERNAL_SECRET_TOKEN` | api ↔ ai | Servisler arası iç auth |
| `RESEND_API_KEY` | api | Şifre sıfırlama maili (boş olursa API açılmaz) |
| `INSTAGRAM_USER/PASSWORD/ACCOUNTS` | scraper | Instaloader hesapları (boşsa scraper başlamaz) |

Compose içinde sabit verilenler: `AI_SERVICE_URL=http://ai:8000`, `SCRAPER_SERVICE_URL=http://scraper:8001`,
`REDIS_URL=redis://redis:6379`, `FRONTEND_URL=https://$WEB_HOST`, web için
`NUXT_PUBLIC_API_BASE_URL=https://$API_HOST` ve `NUXT_PUBLIC_USE_MOCK=false`.

## Yerelde çalıştırma

```bash
cp .env.example .env      # değerleri doldur
docker compose up -d --build
```

Yerelde Traefik olmadığı için web/api'ye erişmek istersen `docker-compose.override.yml` ile port açabilirsin:

```yaml
services:
  web: { ports: ["3000:3000"] }
  api: { ports: ["8000:8000"] }
```

Docker'sız geliştirme:

```bash
pnpm install                         # web + shared (kök workspace)
cd apps/api && pnpm install          # api kendi lock'ını kullanır
cd apps/ai && uv sync                # ai
cd apps/scraper && pip install -e .  # scraper
```

## Repo yapısı

```
apps/web        Nuxt 4 frontend            → apps/web/Dockerfile   (context: repo kökü)
apps/api        NestJS + Prisma backend    → apps/api/Dockerfile   (context: repo kökü, migration otomatik)
apps/ai         FastAPI + torch (CPU) AI   → apps/ai/Dockerfile    (context: apps/ai)
apps/scraper    FastAPI + instaloader      → apps/scraper/Dockerfile (context: apps/scraper)
packages/shared web'in kullandığı ortak tipler
docker-compose.yml   canlı ortam tanımı (Traefik label'ları dahil)
```

- **API migration'ları** container her açılışta `prisma migrate deploy` ile otomatik uygulanır.
  Yeni migration eklerken `apps/api/prisma/migrations` altına commit'lemeniz yeterli.
- **API'ye yeni paket eklerken** `apps/api` içinde `pnpm add <paket>` çalıştırın ve `apps/api/pnpm-lock.yaml`'ı commit'leyin (build `--frozen-lockfile` kullanır).
- **Web'e paket eklerken** kökten `pnpm add <paket> --filter web` ve kök `pnpm-lock.yaml`'ı commit'leyin.
- **AI'ya paket eklerken** `apps/ai` içinde `uv add <paket>` ve `uv.lock`'ı commit'leyin. torch CPU wheel'inden gelir (`pyproject.toml` → `[tool.uv.sources]`), CUDA sürümüne çevirmeyin.
- AI modelleri (HuggingFace) ilk istekte indirilir, `hf_cache` volume'unda kalıcıdır.

## Bu branch'te `backend`'e göre yapılan düzeltmeler

- Kök `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` içinde commit'lenmiş **merge conflict işaretleri** vardı → çözüldü, lock yeniden üretildi.
- **`node_modules` (32k dosya)**, coverage çıktıları, `__pycache__`, `.DS_Store`, `cookies.txt` git'ten çıkarıldı (`.gitignore`'a eklendi). Lütfen tekrar commit'lemeyin.
- `apps/ai` ve `apps/scraper`'ın `pyproject.toml` / `uv.lock` / `README` dosyaları `backend`'de silinmişti → `ai` branch'inden geri alındı.
- `apps/api/package.json`'da `@nestjs/throttler` ve `resend` eksikti (kök `node_modules`'tan hoist edilerek çalışıyordu) → eklendi.
- `AI_SERVICE_URL` bir yerde base URL, bir yerde tam endpoint olarak kullanılıyordu → tutarlı hale getirildi (her zaman base URL).
- CORS listesine `FRONTEND_URL` ortam değişkeni eklendi.

## Dikkat edilmesi gerekenler

- `apps/api/backup_20260806_1129.sql` repoda duruyor. Gerçek kullanıcı verisi içeriyorsa git geçmişinden temizlenmeli.
- Geçmişte `.env` commit'lenip sonra silinmiş (`Delete .env`). Oradaki tüm secret'lar **rotate edilmiş kabul edilmeli**; canlıda yeni üretilmiş değerler kullanılıyor.
- `apps/api/cookies.txt`, `coverage-e2e/` gibi dosyaları commit'lemeyin.

## Sunucuda faydalı komutlar

```bash
app ps instascope        # container durumları
app logs instascope      # tüm servis logları
app auto log             # otomatik deploy logu
app auto instascope off  # otomatik deploy'u geçici kapat / on ile aç
app deploy instascope    # elle: git pull + build + restart
```

## Test hesapları

Canlı ortamda `ADMIN` rollü test hesapları mevcuttur; bilgileri sunucu yöneticisinden alın.
Yeni kullanıcı: kayıt sayfası veya `POST /auth/register` (`name`, `email`, `password` ≥ 8 karakter).

## Instagram scraper oturumu ekleme

Instagram, sunucu IP'sinden şifreyle girişe izin vermiyor. Oturum tarayıcıdan alınıp sunucuya taşınır:

1. Tarayıcıda instagram.com'a scraper hesabıyla giriş yap.
2. F12 → Application (Chrome) / Storage (Firefox) → Cookies → `https://www.instagram.com`
3. `sessionid` (zorunlu), `csrftoken`, `ds_user_id` değerlerini kopyala.
4. Sunucuda:
   ```bash
   cd /srv/apps/instascope
   scripts/instagram-session.sh <kullanici> <sessionid> [csrftoken] [ds_user_id]
   scripts/instagram-session.sh list      # mevcut oturumlar
   ```
Script oturumu doğrular, `/data` volume'una kaydeder, hesabı `INSTAGRAM_ACCOUNTS`'a ekler ve scraper'ı yeniden başlatır.
Tarayıcıdan **çıkış yapma** — çıkış yaparsan sessionid geçersiz olur. Süresi dolarsa aynı adımları tekrarla.
