import { Component, Suspense, type ReactNode } from "react";
import { Modal, ModalTitle } from "./Modal";

/**
 * A dialog loaded from a file of its own (React.lazy; the title page does not load it): nothing shows while it loads (a
 * moment, or none once the browser has it), and a file that cannot be loaded (offline, or a newer version replaced it on
 * the server) shows a small dialog that says so instead of breaking the game's screen.
 */
export function LazyDialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return <LoadFailure onClose={onClose}><Suspense fallback={null}>{children}</Suspense></LoadFailure>;
}

class LoadFailure extends Component<{ onClose: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <Modal labelledBy="lazy-dialog-failed-title" onClose={this.props.onClose}>
      <ModalTitle id="lazy-dialog-failed-title" onClose={this.props.onClose}>開けませんでした</ModalTitle>
      <p role="alert">この画面のデータを読み込めませんでした。通信を確かめて、ページを読み込み直してください。遊んでいる旅はそのまま続けられます。</p>
    </Modal>;
  }
}
