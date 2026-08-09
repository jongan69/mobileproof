declare module 'react-native' {
  import type { ComponentType } from 'react';

  export interface ViewProps {
    accessible?: boolean;
    collapsable?: boolean;
    pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
    style?: unknown;
    testID?: string;
  }

  export const View: ComponentType<ViewProps>;
}
