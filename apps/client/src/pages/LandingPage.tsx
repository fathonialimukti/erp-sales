import { useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-surface p-8">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          <Icon icon="solar:star-bold" className="size-3" />
          ERP SALES
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Sales Management System
        </h1>

        <p className="text-lg text-muted">
          Manage your sales operations, track customers, and grow your business — all in one place.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" onPress={() => navigate('/login')}>
            <Icon icon="solar:login-3-linear" className="size-4" />
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}

export { LandingPage };
