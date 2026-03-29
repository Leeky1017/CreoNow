import { SettingsModal } from '@/features/settings/SettingsModal';
import { useNavigate } from 'react-router';

export function SettingsPage() {
  const navigate = useNavigate();
  return (
    <SettingsModal
      open
      onClose={() => navigate(-1)}
    />
  );
}
