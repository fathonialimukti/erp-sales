import { useNavigate } from "react-router";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/Card";
import "./NotFoundPage.css";

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <Card className="nf-card">
      <CardHeader>
        <div className="nf-header">
          <p className="nf-code">404</p>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>
            The page you are trying to access does not exist or has been moved.
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter>
        <div className="nf-actions">
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
        </div>
      </CardFooter>
    </Card>
  );
};
