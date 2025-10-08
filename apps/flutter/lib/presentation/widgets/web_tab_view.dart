import 'package:flutter/material.dart';
import '../../../widgets/web_container.dart';
import '../../../services/deep_link_service.dart';
import 'package:uni_links/uni_links.dart';
import 'dart:async';
import 'package:webview_flutter/webview_flutter.dart';

class WebTabView extends StatefulWidget {
  final String hash; // e.g. 'home', 'map', 'matrix', 'pomodoro', 'settings'
  const WebTabView({super.key, required this.hash});

  @override
  State<WebTabView> createState() => _WebTabViewState();
}

class _WebTabViewState extends State<WebTabView> {
  final _deepLinks = DeepLinkService();
  late final Uri _initialUri;
  StreamSubscription<Uri?>? _sub;
  WebViewController? _controller;

  @override
  void initState() {
    super.initState();
    _initialUri = _deepLinks.fromTab(widget.hash);
    _initUniLinks();
  }

  Future<void> _initUniLinks() async {
    try {
      final initial = await getInitialUri();
      if (initial != null && mounted) {
        final target = _deepLinks.resolveIncoming(initial);
        _controller?.loadRequest(target);
      }
    } catch (_) {}
    _sub = uriLinkStream.listen((uri) {
      if (uri == null) return;
      final target = _deepLinks.resolveIncoming(uri);
      _controller?.loadRequest(target);
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WebContainer(
      initialUri: _initialUri,
      onReady: (c) => _controller = c,
    );
  }
}
