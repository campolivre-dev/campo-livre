type IconName = 'menu' | 'layers' | 'arrow' | 'mail' | 'lock' | 'eye' | 'eye-off' | 'people' | 'check' | 'external' | 'map' | 'equipment' | 'clock' | 'mouse' | 'search' | 'pin' | 'history' | 'expand' | 'logout' | 'settings' | 'chart';

const paths: Record<IconName, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  chart: 'M4 3v17h17M8 15v-4m5 4V6m5 9V9',
  settings: 'M4 7h16M4 17h16M9 4v6m6 4v6',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  equipment: 'M4 21V10l5 3V7l5 3V3h5v18H4Zm4-4h1m4 0h1m4 0h1',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
  mouse: 'M5 14V9a7 7 0 0 1 14 0v5a7 7 0 0 1-14 0Zm7-11v6',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5M8 12h12',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  mail: 'M4 5h16v14H4V5Zm0 1 8 7 8-7',
  lock: 'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4m-3 5v2',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  'eye-off': 'm3 3 18 18M10 5c7-1 12 7 12 7l-3 4M6 6c-3 2-4 6-4 6s3 7 10 7l4-1m-6-8 4 4',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 0a4 4 0 0 1 0 8',
  check: 'm5 12 4 4L19 6',
  external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
};

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
