import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary ${this.props.section || ""}]`, error, info);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#FEE2E2", borderColor: "#FECACA", color: "#991B1B" }}>
          <div className="text-sm font-semibold">Error en {this.props.section || "sección"}</div>
          <div className="text-xs mt-1 whitespace-pre-wrap">{this.state.error?.message}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "#991B1B", color: "#fff" }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
