// Android/iOS/Windows: WebView al sitio web publicado
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String kWebAppUrl = 'https://eliezeramaya.github.io/vault/';

class SphereViewPlatform extends StatefulWidget {
  const SphereViewPlatform({super.key});
  @override
  State<SphereViewPlatform> createState() => _SphereViewPlatformState();
}

class _SphereViewPlatformState extends State<SphereViewPlatform> {
  late final WebViewController _controller;
  double _progress = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0A0A15))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => setState(() => _progress = p / 100),
        ),
      )
      ..loadRequest(Uri.parse(kWebAppUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      WebViewWidget(controller: _controller),
      if (_progress < 1)
        LinearProgressIndicator(
          value: _progress,
          minHeight: 2,
          color: const Color(0xFFF0375D),
          backgroundColor: const Color(0x3310395C),
        ),
    ]);
  }
}
