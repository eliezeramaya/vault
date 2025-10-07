import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String kWebAppUrl = 'https://eliezeramaya.github.io/vault/';

class WebTabView extends StatefulWidget {
  final String hash; // e.g. 'home', 'map', 'matrix', 'pomodoro', 'settings'
  const WebTabView({super.key, required this.hash});

  @override
  State<WebTabView> createState() => _WebTabViewState();
}

class _WebTabViewState extends State<WebTabView> {
  late final WebViewController _controller;
  double _progress = 0;

  Uri get _initialUri => Uri.parse('$kWebAppUrl?embed=1#${widget.hash}');

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
      ..loadRequest(_initialUri);
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
