"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Minimal error boundary for isolating AI-dependent UI (Phase 2). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="border border-line bg-surface p-4">
            <span className="label">Component error</span>
            <p className="mt-1 text-sm text-ink-soft">
              Something went wrong rendering this section.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
