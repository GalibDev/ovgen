import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../components/ui/button';
export function AppUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <aside className="reminder-banner" role="status">
      <div>
        <strong>An Ovgen update is ready</strong>
        <p>Finish your current changes, then refresh to use the latest version.</p>
        <Button onClick={() => void updateServiceWorker(true)}>Update now</Button>
      </div>
      <button aria-label="Dismiss update" onClick={() => setNeedRefresh(false)}>
        ×
      </button>
    </aside>
  );
}
