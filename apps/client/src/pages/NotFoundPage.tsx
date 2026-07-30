import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMotionProps, pageEnter } from "@/lib/motion";
import { useMeta } from "@/lib/useMeta";

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);

  useMeta({
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist or has been moved.',
    robots: 'noindex, follow',
  });

  return (
    <div
      className="bg-background flex min-h-dvh items-center justify-center p-6"
      data-ai-context={JSON.stringify({ section: "not-found" })}
    >
      <motion.div className="w-full max-w-md" variants={pageEnter} {...enterProps}>
        <Card className="border-border/80 text-center shadow-lg shadow-primary/5">
          <CardHeader className="items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <SearchX className="size-7" />
            </div>
            <p className="font-mono text-sm font-semibold tracking-wide text-muted-foreground">
              404
            </p>
            <CardTitle className="font-heading text-2xl">
              {intl.formatMessage({
                id: "error.not_found.title",
                defaultMessage: "Page Not Found",
              })}
            </CardTitle>
            <CardDescription className="max-w-sm">
              {intl.formatMessage({
                id: "error.not_found.description",
                defaultMessage:
                  "The page you are trying to access does not exist or has been moved.",
              })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-2">
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
