# Flutter shell

Capa contenedora para Android/iOS/Web/Windows que muestra la app 3D publicada en web.

## Pasos
1) Publica `apps/web` con el workflow de Pages (o Vercel).
2) Edita `kWebAppUrl` en:
   - `lib/presentation/widgets/sphere_view_iframe.dart` (web)
   - `lib/presentation/widgets/sphere_view_webview.dart` (IO)
3) Habilita plataformas:
```bash
flutter config --enable-web
flutter config --enable-windows-desktop
# Para Android/iOS, asegúrate de tener SDKs
```
4) Crea la estructura de plataforma (una vez):
```bash
flutter create --platforms=android,ios,web,windows .
```
5) Ejecuta:
```bash
flutter pub get
flutter run -d chrome      # Web
flutter run -d windows     # Windows 11
flutter run -d android     # Android
flutter run -d ios         # iOS (requiere macOS/Xcode)
```

> Producción: usa Codemagic o GitHub Actions (workflows incluidos) para compilar y firmar.
