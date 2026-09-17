"""
Tarayıcı çerezlerinden instaloader session dosyası üretir.
Kullanım (container içinde çalışır, scripts/instagram-session.sh çağırır):
  python make_session.py <username> <sessionid> [csrftoken] [ds_user_id]
"""
import sys
import instaloader

user, sessionid = sys.argv[1], sys.argv[2]
csrf = sys.argv[3] if len(sys.argv) > 3 else None
ds_user_id = sys.argv[4] if len(sys.argv) > 4 else None
out = f"/data/.instaloader-{user}"

L = instaloader.Instaloader(quiet=True, download_pictures=False, download_videos=False,
                            download_video_thumbnails=False, save_metadata=False, compress_json=False)
jar = L.context._session.cookies
jar.set("sessionid", sessionid, domain=".instagram.com", path="/")
if csrf:
    jar.set("csrftoken", csrf, domain=".instagram.com", path="/")
if ds_user_id:
    jar.set("ds_user_id", ds_user_id, domain=".instagram.com", path="/")
L.context.username = user
try:
    logged = L.test_login()
except Exception as e:
    print(f"HATA: doğrulama başarısız: {e}")
    sys.exit(2)
if not logged:
    print("HATA: Instagram bu oturumu kabul etmedi (sessionid yanlış/süresi dolmuş).")
    sys.exit(1)
if logged.lower() != user.lower():
    print(f"UYARI: çerez @{logged} hesabına ait, sen @{user} dedin. @{logged} olarak kaydediliyor.")
    user = logged
    out = f"/data/.instaloader-{user}"
L.save_session_to_file(out)
print(f"OK: @{user} oturumu kaydedildi -> {out}")
