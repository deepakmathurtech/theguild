export function isStandaloneEventRoute(pathname: string) {
  return /^\/event-platform\/e\//.test(pathname);
}
