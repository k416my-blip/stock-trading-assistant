import {
  noteWebsocketOffline,
  noteWebsocketOnline,
  noteWebsocketReconnectAttempt,
} from '../../services/websocketTelemetry';
import { beginRecovery, completeRecovery } from './recoveryTimeTracker';

export function runWebSocketDisconnectSimulatorStep(): string {
  beginRecovery('websocket');
  noteWebsocketOffline();
  noteWebsocketReconnectAttempt();
  noteWebsocketReconnectAttempt();
  noteWebsocketOnline();
  completeRecovery('websocket', true, 'WS offline→online telemetry cycle');
  return 'websocket disconnect simulated (telemetry)';
}
