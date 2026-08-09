import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function proofId(identifier: string): { testID: string } {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Invalid MobileProof identifier: ${identifier}`);
  }
  return { testID: identifier };
}

interface ProofContextValue { enabled: boolean }
const ProofContext = createContext<ProofContextValue>({ enabled: false });

export function MobileProofProvider({
  enabled = false,
  children,
}: PropsWithChildren<{ enabled?: boolean }>) {
  const value = useMemo(() => ({ enabled }), [enabled]);
  return <ProofContext.Provider value={value}>{children}</ProofContext.Provider>;
}

export interface ProofMarkerProps extends Omit<ViewProps, 'testID' | 'children'> {
  id: string;
  state?: string;
}

export function ProofMarker({ id, state, ...props }: ProofMarkerProps) {
  const { enabled } = useContext(ProofContext);
  const identifier = state ? `${id}.${state}` : id;
  const marker = proofId(identifier);
  useEffect(() => {
    if (enabled) console.info(`[mobileproof] marker:${identifier}`);
  }, [enabled, identifier]);
  return (
    <View
      {...props}
      {...marker}
      accessible={false}
      collapsable={false}
      pointerEvents="none"
      style={[{ width: 1, height: 1, opacity: 0.01, position: 'absolute' }, props.style]}
    />
  );
}

export function ProofReady({ id = 'app.ready' }: { id?: string }) {
  return <ProofMarker id={id} />;
}

export function useMobileProofEnabled(): boolean {
  return useContext(ProofContext).enabled;
}
