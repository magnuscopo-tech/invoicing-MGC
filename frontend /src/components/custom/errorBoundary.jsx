import { Component } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import CustomButton from "./customButton";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <TriangleAlert size={26} />
          </span>
          <h1 className="text-heading">Something broke on this screen</h1>
          <p className="max-w-md text-subtle">
            The error has been logged to the console. Reloading usually clears
            it.
          </p>
          <CustomButton
            icon={RefreshCw}
            onClick={() => window.location.reload()}
          >
            Reload page
          </CustomButton>
        </div>
      );
    }

    return this.props.children;
  }
}
