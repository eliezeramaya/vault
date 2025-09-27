// Web: IFrame que apunta a la app React publicada
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
// ignore: uri_does_not_exist
import 'dart:ui_web' as ui_web; // Solo existe en compilación Web

const String kWebAppUrl = 'https://eliezeramaya.github.io/vault/';

class SphereViewPlatform extends StatelessWidget {
  const SphereViewPlatform({super.key});

  @override
  Widget build(BuildContext context) {
    // Registra un viewType único en Web
    if (kIsWeb) {
      // ignore: undefined_prefixed_name
      ui_web.platformViewRegistry
          .registerViewFactory('sphere-iframe', (int viewId) {
      final iframe = html.IFrameElement()
        ..src = kWebAppUrl
        ..style.border = '0'
        ..style.width = '100%'
        ..style.height = '100%';
      return iframe;
      });
    }

    return const HtmlElementView(viewType: 'sphere-iframe');
  }
}
