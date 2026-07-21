import { describe, it, expect } from 'vitest';
import { detectEnv } from './backend-config';

describe('lib/backend-config detectEnv (C-thin)', () => {
  it('dev per host locali e path /test/', () => {
    expect(detectEnv('localhost', '/')).toBe('dev');
    expect(detectEnv('127.0.0.1', '/')).toBe('dev');
    expect(detectEnv('espo.local', '/')).toBe('dev');
    expect(detectEnv('espo.test', '/')).toBe('dev');
    expect(detectEnv('espooclicker.altervista.org', '/test/index.php')).toBe('dev');
  });
  it('production altrove', () => {
    expect(detectEnv('espooclicker.altervista.org', '/index.php')).toBe('production');
  });
});
