import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "noor-ui";

interface State { error?: Error }

/** Last-resort boundary so a render error degrades to an ErrorState instead of a white screen. */
export class ErrorBoundary extends Component<{children: ReactNode}, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-64 place-items-center p-6">
          <ErrorState
            heading="Something went wrong"
            description={this.state.error.message}
            onRetry={() => this.setState({error: undefined})}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
