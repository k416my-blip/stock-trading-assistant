import { describe, expect, it } from 'vitest';
import {
  buildMetroDownResult,
  checkMetroListening,
  DEFAULT_METRO_PORT,
  parseMetroPidFromNetstat,
} from '../../scripts/lib/phase12-5-metro-watchdog.mjs';

describe('phase12-5 Metro watchdog', () => {
  it('parseMetroPidFromNetstat extracts PID from Windows netstat line', () => {
    const sample = `
  TCP    0.0.0.0:8081           0.0.0.0:0              LISTENING       23720
  TCP    [::]:8081              [::]:0                 LISTENING       23720
`;
    expect(parseMetroPidFromNetstat(sample, 8081)).toBe(23720);
  });

  it('checkMetroListening returns listening=true when netstat shows LISTENING', () => {
    const execSync = () =>
      '  TCP    0.0.0.0:8081           0.0.0.0:0              LISTENING       7128\n';
    const result = checkMetroListening({ execSync, port: DEFAULT_METRO_PORT });
    expect(result.listening).toBe(true);
    expect(result.pid).toBe(7128);
    expect(result.method).toBe('netstat');
  });

  it('checkMetroListening returns listening=false when port is down', () => {
    const execSync = () => '  TCP    127.0.0.1:53033        127.0.0.1:8081         SYN_SENT        21548\n';
    const result = checkMetroListening({ execSync, port: DEFAULT_METRO_PORT });
    expect(result.listening).toBe(false);
    expect(result.pid).toBeNull();
  });

  it('Metro NOT LISTENING maps to metro_down stop reason', () => {
    const result = checkMetroListening({ execSync: () => '', port: 8081 });
    expect(result.listening).toBe(false);
    expect(result.listening ? null : 'metro_down').toBe('metro_down');
  });

  it('buildMetroDownResult includes metroCheckDetails', () => {
    const metro = checkMetroListening({ execSync: () => '', port: DEFAULT_METRO_PORT });
    const down = buildMetroDownResult(metro);
    expect(down.stopReason).toBe('metro_down');
    expect(down.metroDownAt).toBeTruthy();
    expect(down.metroCheckDetails?.listening).toBe(false);
    expect(down.metroCheckDetails?.port).toBe(8081);
  });
});
