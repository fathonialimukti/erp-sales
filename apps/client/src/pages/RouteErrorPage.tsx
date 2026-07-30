import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { useIntl } from "react-intl";
import { ArrowLeft, Home, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMotionProps, pageEnter } from "@/lib/motion";

const getErrorDetail = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return {
      title: `${error.status} ${error.statusText}`,
      detail:
        typeof error.data === "string"
          ? error.data
          : JSON.stringify(error.data, null, 2),
    };
  }
  if (error instanceof Error) {
    return { title: "Unexpected Error", detail: error.message, stack: error.stack };
  }
  return {
    title: "Unknown Error",
    detail: "An unknown error occurred while loading this page.",
  };
};

export const RouteErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const intl = useIntl();
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);
  const { title, detail, stack } = getErrorDetail(error) as {
    title: string;
    detail: string;
    stack?: string;
  };

  return (
    <div
      className="bg-background flex min-h-dvh items-center justify-center p-6"
      data-ai-context={JSON.stringify({ section: "route-error", title })}
    >
      <motion.div className="w-full max-w-lg" variants={pageEnter} {...enterProps}>
        <Card className="border-border/80 shadow-lg shadow-primary/5">
          <CardHeader className="gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {intl.formatMessage({
                id: "error.route.label",
                defaultMessage: "Route Error",
              })}
            </p>
            <CardTitle className="font-heading text-xl">{title}</CardTitle>
            <CardDescription className="whitespace-pre-wrap wrap-break-word">
              {detail}
            </CardDescription>
          </CardHeader>
          {stack ? (
            <CardContent>
              <pre className="max-h-48 overflow-auto rounded-lg border bg-card p-3 font-mono text-xs text-muted-foreground">
                {stack}
              </pre>
            </CardContent>
          ) : null}
          <CardFooter className="gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              {intl.formatMessage({
                id: "error.action.go_back",
                defaultMessage: "Go back",
              })}
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              <Home className="size-4" />
              {intl.formatMessage({
                id: "error.action.go_dashboard",
                defaultMessage: "Go to dashboard",
              })}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};
