const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

/**
 * Resolves a path/URL against a base string without relying on Node's `url` module.
 */
export function resolveURL(base: string, path: string): string {
  if (!path) {
    return base
  }

  if (SCHEME_RE.test(path)) {
    return path
  }

  if (path.startsWith('/')) {
    return SCHEME_RE.test(base) ? new URL(path, base).toString() : path
  }

  if (SCHEME_RE.test(base)) {
    return new URL(path, base).toString()
  }

  const dummyOrigin = 'http://example.com'
  const baseForURL = base.startsWith('/') ? dummyOrigin + base : `${dummyOrigin}/${base}`
  const resolved = new URL(path, baseForURL)
  let result = resolved.pathname + resolved.search + resolved.hash

  if (!base.startsWith('/') && result.startsWith('/')) {
    result = result.slice(1)
  }

  return result
}
