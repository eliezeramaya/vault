import 'package:flutter/material.dart';
import '../../../widgets/web_container.dart';
import '../../../services/deep_link_service.dart';

class WebTabView extends StatefulWidget {
  final String hash; // e.g. 'home', 'map', 'matrix', 'pomodoro', 'settings'
  const WebTabView({super.key, required this.hash});

  @override
  State<WebTabView> createState() => _WebTabViewState();
}

class _WebTabViewState extends State<WebTabView> {
  final _deepLinks = DeepLinkService();
  late final Uri _initialUri;

  @override
  void initState() {
    super.initState();
    _initialUri = _deepLinks.fromTab(widget.hash);
  }

  @override
  Widget build(BuildContext context) {
    return WebContainer(initialUri: _initialUri);
  }
}
