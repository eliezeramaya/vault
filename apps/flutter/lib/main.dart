import 'package:flutter/material.dart';
import 'presentation/widgets/web_tab_view.dart';

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
    return const _TabbedScaffold();
  }
}

class _TabbedScaffold extends StatefulWidget {
  const _TabbedScaffold();
  @override
  State<_TabbedScaffold> createState() => _TabbedScaffoldState();
}

class _TabbedScaffoldState extends State<_TabbedScaffold> {
  int _index = 2; // default to map
  static const _tabs = ['home', 'matrix', 'map', 'pomodoro', 'settings'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(child: WebTabView(hash: _tabs[_index])),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'Matriz'),
          NavigationDestination(icon: Icon(Icons.public_outlined), selectedIcon: Icon(Icons.public), label: 'Mapa'),
          NavigationDestination(icon: Icon(Icons.timer_outlined), selectedIcon: Icon(Icons.timer), label: 'Pomodoro'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Ajustes'),
        ],
      ),
    );
  }
}
