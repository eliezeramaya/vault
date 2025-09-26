import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'sphere_view_iframe.dart' if (dart.library.io) 'sphere_view_webview.dart';

class SphereView extends StatelessWidget {
  const SphereView({super.key});
  @override
  Widget build(BuildContext context) {
    // Usa implementación condicional: IFrame (web) o WebView (IO).
    return const SphereViewPlatform();
  }
}
