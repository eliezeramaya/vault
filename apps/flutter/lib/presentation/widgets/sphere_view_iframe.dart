// Web: IFrame que apunta a la app React publicada
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

const String kWebAppUrl = 'https://<tu_usuario>.github.io/<tu_repo_pages>/';

class SphereViewPlatform extends StatelessWidget {
  const SphereViewPlatform({super.key});

  @override
  Widget build(BuildContext context) {
    // registra un viewType único
    // ignore: undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory('sphere-iframe', (int viewId) {
      final iframe = html.IFrameElement()
        ..src = kWebAppUrl
        ..style.border = '0'
        ..style.width = '100%'
        ..style.height = '100%';
      return iframe;
    });

    return const HtmlElementView(viewType: 'sphere-iframe');
  }
}
