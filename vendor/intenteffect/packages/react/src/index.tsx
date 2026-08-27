import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  stableStringify,
  type ConnectionStatus,
  type IntentEffectClient,
  type ProjectionSnapshot,
  type SendOptions,
} from '@intenteffect/client'
import type {
  AnyIntentContract,
  AnyProjectionContract,
  IntentEffectError,
  IntentInput,
  ProjectionParams,
  ProjectionResult,
  Result,
  SendOk,
} from '@intenteffect/core'

const ClientContext = createContext<IntentEffectClient | null>(null)

export function IntentEffectProvider(props: {
  client: IntentEffectClient
  children: ReactNode
}) {
  return (
    <ClientContext.Provider value={props.client}>
      {props.children}
    </ClientContext.Provider>
  )
}

export function useIntentEffect(): IntentEffectClient {
  const client = useContext(ClientContext)
  if (!client) {
    throw new Error('useIntentEffect must be used inside <IntentEffectProvider>')
  }
  return client
}

/** Imperative control flow: `const send = useSend(); await send(deleteTask, { id })`. */
export function useSend(): <I extends AnyIntentContract>(
  contract: I,
  input: IntentInput<I>,
  options?: SendOptions,
) => Promise<Result<SendOk, IntentEffectError>> {
  const client = useIntentEffect()
  return useCallback(
    (contract, input, options) => client.send(contract, input, options),
    [client],
  )
}

/**
 * Declarative synchronized state: fetches the projection snapshot and keeps
 * it updated as authoritative events arrive over the server event stream.
 */
export function useProjection<P extends AnyProjectionContract>(
  contract: P,
  params?: ProjectionParams<P>,
): ProjectionSnapshot<ProjectionResult<P>> {
  const client = useIntentEffect()
  const paramsKey = stableStringify(params ?? {})
  const handle = useMemo(
    () => client.projection(contract, params ?? {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, contract, paramsKey],
  )
  return useSyncExternalStore(handle.subscribe, handle.getSnapshot, handle.getSnapshot)
}

export function useConnectionStatus(): ConnectionStatus {
  const client = useIntentEffect()
  return useSyncExternalStore(
    useCallback((onChange: () => void) => client.onConnectionStatus(onChange), [client]),
    () => client.connectionStatus,
    () => client.connectionStatus,
  )
}
