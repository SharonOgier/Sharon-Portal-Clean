import { Component, ReactNode } from "react";
import AccountingPortalPrototype from "../portal/SharonPortalWebsite";

type ErrorBoundaryState = {
  hasError: boolean;
  error: any;
};

class PortalErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Portal crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Portal crashed</h2>
          <p>Check browser console (F12)</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function PortalPage() {
  return (
    <PortalErrorBoundary>
      <AccountingPortalPrototype />
    </PortalErrorBoundary>
  );
}