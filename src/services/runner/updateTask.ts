import type { ServiceMethodImpl } from '.';

// Wired up so the RPC is reachable, but the reported task state is not
// persisted yet; the client tolerates an empty acknowledgment.
export const updateTask: ServiceMethodImpl['updateTask'] = async () => {
  return {};
};
