/**
 * rpcResolveOrderAnomaly guardrails (strict UUID for p_resolved_by).
 *
 * Prerequisites: Vitest only; supabase is mocked.
 * Run: pnpm exec vitest run src/services/adminOrdersApi.resolveAnomaly.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn(() =>
  Promise.resolve({ data: true as boolean | null, error: null })
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    get rpc() {
      return rpcMock;
    },
  },
}));

describe('rpcResolveOrderAnomaly', () => {
  beforeEach(() => {
    rpcMock.mockClear();
  });

  it('throws before RPC when resolvedBy is blank', async () => {
    const { rpcResolveOrderAnomaly } = await import('./adminOrdersApi');
    await expect(
      rpcResolveOrderAnomaly({
        anomalyId: '00000000-0000-4000-8000-000000000001',
        resolvedBy: '   ',
        resolutionNotes: 'notes',
      })
    ).rejects.toThrow(/resolvedBy/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('calls resolve_order_anomaly with trimmed UUID', async () => {
    const { rpcResolveOrderAnomaly } = await import('./adminOrdersApi');
    const uid = '11111111-1111-4111-8111-111111111111';
    await rpcResolveOrderAnomaly({
      anomalyId: '00000000-0000-4000-8000-000000000002',
      resolvedBy: `  ${uid}  `,
      resolutionNotes: 'fixed',
      resolutionAction: 'dismiss',
    });
    expect(rpcMock).toHaveBeenCalledWith('resolve_order_anomaly', {
      p_anomaly_id: '00000000-0000-4000-8000-000000000002',
      p_resolved_by: uid,
      p_resolution_notes: 'fixed',
      p_resolution_action: 'dismiss',
    });
  });
});
