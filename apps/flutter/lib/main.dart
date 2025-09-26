import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'presentation/widgets/sphere_view.dart';

void main() {
  runApp(const SphereApp());
}

class SphereApp extends StatelessWidget {
  const SphereApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Idea Sphere',
      theme: ThemeData.dark(),
      home: const SphereHome(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class SphereHome extends StatelessWidget {
  const SphereHome({super.key});
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(child: SphereView()),
    );
  }
}
