import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorPage } from '@/pages/ErrorPage';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** Catches render-time errors so a single broken component can't blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // No error-reporting backend is configured; the fallback UI below is
    // sufficient for now. Wire a reporting service here if one is added.
  }

  render() {
    if (this.state.hasError) return <ErrorPage />;
    return this.props.children;
  }
}
