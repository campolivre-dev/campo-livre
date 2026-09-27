type IconName = 'layers' | 'arrow' | 'mail' | 'lock' | 'eye' | 'eye-off' | 'people' | 'check' | 'external';

const paths: Record<IconName, string> = {
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
