import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { Button } from '../ui/Button';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, CardDescription } from '../ui/Card';

const getErrorDetail = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return {
      title: `${error.status} ${error.statusText}`,
      detail: typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2),
    };
  }
  if (error instanceof Error) {
    return { title: 'Unexpected Error', detail: error.message, stack: error.stack };
  }
  return { title: 'Unknown Error', detail: 'An unknown error occurred while loading this page.' };
};

export const RouteErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const { title, detail, stack } = getErrorDetail(error) as {
    title: string;
    detail: string;
    stack?: string;
  };

  return (
    <Card className="mx-auto mt-12 max-w-2xl">
      <CardHeader>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-state-danger">Route Error</p>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{detail}</CardDescription>
        </div>
      </CardHeader>
      {stack && (
        <CardBody>
          <pre className="max-h-72 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
            {stack}
          </pre>
        </CardBody>
      )}
      <CardFooter>
        <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
      </CardFooter>
    </Card>
  );
};
