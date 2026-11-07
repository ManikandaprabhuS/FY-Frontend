import { Component, type ReactNode } from 'react';
import UnexpectedErrorPage from './UnexpectedErrorPage';
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <UnexpectedErrorPage /> : this.props.children; }
}
