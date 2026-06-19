import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from "../ui/Card";
import "./RouteErrorPage.css";

const getErrorDetail = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return {
      title: `${error.status} ${error.statusText}`,
      detail: typeof error.data === "string" ? error.data : JSON.stringify(error.data, null, 2),
    };
  }
  if (error instanceof Error) {
    return { title: "Unexpected Error", detail: error.message, stack: error.stack };
  }
  return { title: "Unknown Error", detail: "An unknown error occurred while loading this page." };
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
    <Card className="re-card">
      <CardHeader>
        <div className="re-header">
          <p className="re-label">Route Error</p>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{detail}</CardDescription>
        </div>
      </CardHeader>
      {stack && (
        <CardBody>
          <pre className="re-stack">{stack}</pre>
        </CardBody>
      )}
      <CardFooter>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
      </CardFooter>
    </Card>
  );
};
