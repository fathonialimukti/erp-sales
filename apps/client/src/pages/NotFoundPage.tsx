import { useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, CardDescription } from '../ui/Card';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardHeader>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-500">404</p>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>
            The page you are trying to access does not exist or has been moved.
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
        </div>
      </CardFooter>
    </Card>
  );
};
