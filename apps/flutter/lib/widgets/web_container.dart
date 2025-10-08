import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Thin wrapper that isolates the web content container.
/// Uses WebView on mobile/desktop and can be replaced with an iframe implementation for web.
class WebContainer extends StatefulWidget {
  final Uri initialUri;
  final void Function(WebViewController controller)? onReady;
  const WebContainer({super.key, required this.initialUri, this.onReady});

  @override
  State<WebContainer> createState() => _WebContainerState();
}

class _WebContainerState extends State<WebContainer> {
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
      ..loadRequest(widget.initialUri);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onReady?.call(_controller);
    });
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
