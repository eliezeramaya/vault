
/// Service to construct and resolve deep links to the SPA hosted under `/vault/`.
/// It builds URLs like: https://.../vault/?embed=1#map
class DeepLinkService {
  /// Default base for the deployed SPA.
  static const String defaultBase = 'https://eliezeramaya.github.io/vault/';

  /// Base URL for the SPA (must end with trailing slash)
  final String baseUrl;

  DeepLinkService({String? baseUrl}) : baseUrl = (baseUrl ?? defaultBase);

  /// Allowed top-level SPA routes (hash fragments)
  static const Set<String> allowedHashes = {
    'home', 'map', 'matrix', 'pomodoro', 'settings', 'scorecard'
  };

  /// Normalizes a hash to a known route; falls back to 'map'
  String normalizeHash(String? hash) {
    final h = (hash ?? '').replaceAll('#', '').trim();
    return allowedHashes.contains(h) ? h : 'map';
  }

  /// Build a SPA URI with optional extra query and embed flag.
  Uri spaUri({required String hash, Map<String, String>? query, bool embed = true}) {
    final base = Uri.parse(baseUrl);
    final q = <String, String>{}
      ..addAll(base.queryParameters)
      ..addAll(query ?? <String, String>{});
    if (embed) q['embed'] = q['embed'] ?? '1';
    return base.replace(queryParameters: q, fragment: normalizeHash(hash));
  }

  /// Convenience: build from a tab name.
  Uri fromTab(String tab, {Map<String, String>? query, bool embed = true}) =>
      spaUri(hash: normalizeHash(tab), query: query, embed: embed);

  /// Resolve an incoming link (custom scheme or https) to a SPA URL.
  /// Examples handled:
  /// - ideasphere://map -> .../vault/?embed=1#map
  /// - https://eliezeramaya.github.io/vault/#matrix -> .../vault/?embed=1#matrix
  /// - https://eliezeramaya.github.io/vault/matrix -> .../vault/?embed=1#matrix
  Uri resolveIncoming(Uri incoming) {
    // If a fragment exists, prefer it
    if ((incoming.fragment).isNotEmpty) {
      return spaUri(hash: incoming.fragment);
    }
    // Try last path segment as route
    final seg = incoming.pathSegments.isNotEmpty ? incoming.pathSegments.last : '';
    if (allowedHashes.contains(seg)) {
      return spaUri(hash: seg);
    }
    // If query contains a 'route' param, use it
    final route = incoming.queryParameters['route'];
    if (route != null && route.isNotEmpty) {
      return spaUri(hash: route);
    }
    // Fallback to map
    return spaUri(hash: 'map');
  }
}
