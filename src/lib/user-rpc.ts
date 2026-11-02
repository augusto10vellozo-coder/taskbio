// Calls a database function with the caller's own session.
// The generated Database type does not know the newest functions, so the name is
// passed as a string and the result is typed by the caller.
type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function userRpc<T = unknown>(
  client: unknown,
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  return (client as RpcClient).rpc(fn, args) as Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}
