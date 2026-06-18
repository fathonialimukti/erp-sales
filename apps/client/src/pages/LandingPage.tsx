import { useNavigate } from 'react-router';
import { Icon } from "../ui";
import { Button } from '../ui/Button';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 p-8">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-700">
          <Icon icon="solar:star-bold" className="h-3 w-3" />
          ERP SALES
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
          Sales Management System
        </h1>
        <p className="text-lg text-slate-500">
          Manage your sales operations, track customers, and grow your business — all in one place.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/login')}
            leftIcon={<Icon icon="solar:login-3-linear" className="h-4 w-4" />}
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};
