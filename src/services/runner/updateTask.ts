import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import type { RunnerService } from '@/gen/runner/v1/services_pb';

// Wired up so the RPC is reachable, but the reported task state is not
// persisted yet; the client tolerates an empty acknowledgment.
export const updateTask: MethodImpl<typeof RunnerService.method.updateTask> = async () => {
  throw new ConnectError('log file has been archived', Code.AlreadyExists);
};
