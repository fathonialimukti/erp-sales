import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText, MapPin, Pencil, Printer, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiSummarizeButton } from "../../components/AiSummarizeButton";
import { PdfDocumentModal } from "../../components/pdf/PdfDocumentModal";
import { sanitizePdfFileName } from "../../lib/pdf/usePdfDocument";
import {
  actionProgramDocNumber,
  buildActionProgramPdfBuildKey,
  buildActionProgramPdfLabels,
  buildActionProgramPdfSpec,
  type ActionProgramPdfRecord,
} from "./actionProgramPdf";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ActionProgramDetail = {
  id: string;
  code: string | null;
  documentNumber: string | null;
  name: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string;
  description: string | null;
  area: { id: string; name: string } | null;
  pic: { id: string; name: string } | null;
  outlets: { id: string; name: string; code?: string | null }[];
  skus: { id: string; name: string }[];
};

export const ActionProgramDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("action-program@update");
  const canDelete = hasPermission("action-program@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Client-side PDF (J-T2): the "Print / PDF" button opens the frozen
  // PdfDocumentModal — blob preview in the browser's native PDF viewer,
  // then Print (scoped to the PDF) or Download. No direct window.print.
  const [pdfOpen, setPdfOpen] = useState(false);

  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number | boolean>,
  ) =>
    intl.formatMessage(
      { id, defaultMessage },
      values as Record<string, string>,
    );
  // Pre-resolved document labels — the page owns i18n; the mapping module
  // and the renderer receive finished strings only.
  const pdfLabels = buildActionProgramPdfLabels(t);

  const { data, isLoading } = useQuery({
    queryKey: ["actionProgramDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.actionProgram.detail.query({ id: id ?? "" }),
  });

  const actionProgram = data as ActionProgramDetail | undefined;
  // Raw tRPC output for the PDF mapping (full line rows + updatedAt).
  const pdfRecord = data as ActionProgramPdfRecord | undefined;

  const handleDelete = async () => {
    if (!actionProgram || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.actionProgram.delete.mutate({ id: actionProgram.id });
      await queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "action_program.detail.delete_success",
          defaultMessage: "Action program deleted",
        }),
      );
      navigate("/action-program");
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "action-program-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!actionProgram) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "action-program-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/action-program")} />
          <PageHeader
            module="planning"
            title={intl.formatMessage({
              id: "action_program.detail.not_found",
              defaultMessage: "Action program not found",
            })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "action-program-detail",
        id: actionProgram.id,
        name: actionProgram.name,
        areaCount: actionProgram.outlets?.length ?? 0,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/action-program")}>
          <AiSummarizeButton
            module="action-program"
            id={actionProgram.id}
            context={{ name: actionProgram.name, outletCount: actionProgram.outlets?.length ?? 0 }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPdfOpen(true)}
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Printer className="size-3.5" aria-hidden />
            {intl.formatMessage({
              id: "action_program.detail.print",
              defaultMessage: "Print / PDF",
            })}
          </Button>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/action-program/${actionProgram.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
            </Button>
          ) : null}
        </NavButtonGroup>

        <PageHeader
          module="planning"
          eyebrow={intl.formatMessage({ id: "nav.programs", defaultMessage: "Programs" })}
          title={actionProgram.name}
          description={actionProgram.code ?? actionProgram.documentNumber ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-planning)_8%,transparent)] text-[var(--module-planning)]">
              <FileText className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "action_program.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "action_program.detail.code_label", defaultMessage: "Code" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{actionProgram.code ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "action_program.detail.name_label", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{actionProgram.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "action_program.detail.areas_label", defaultMessage: "Outlets" })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">
                {actionProgram.outlets?.length ?? 0}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-outlet)_8%,transparent)] text-[var(--module-outlet)]">
              <MapPin className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "action_program.detail.outlets_title",
              defaultMessage: "Outlets",
            })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "action_program.detail.outlets_count",
                defaultMessage: "{count, plural, one {# outlet} other {# outlets}}",
              },
              { count: actionProgram.outlets?.length ?? 0 },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {(actionProgram.outlets?.length ?? 0) === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "action_program.detail.no_outlets",
                defaultMessage: "No outlets yet",
              })}
            </p>
          ) : (
            <ul className="divide-y">
              {actionProgram.outlets?.map((outlet) => (
                <li key={outlet.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/outlet/${outlet.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-outlet)_8%,transparent)] text-[var(--module-outlet)]">
                      <MapPin className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {outlet.name}
                      </span>
                      {outlet.code ? (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {outlet.code}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "action_program.detail.delete_title",
          defaultMessage: "Delete actionProgram",
        })}
        description={intl.formatMessage(
          {
            id: "action_program.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: actionProgram.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />

      {/* PDF preview modal (frozen pipeline, J-T2): buildKey gates the
       * build on the loaded record state (<id>:<updatedAt>); the spec is
       * mapped by the pure module with the page-owned labels. The cast
       * mirrors the page's existing `data as ActionProgramDetail`
       * boundary: the raw tRPC output type is too deep for a structural
       * prop (TS2589). */}
      {pdfRecord ? (
        <PdfDocumentModal
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          title={pdfLabels.title}
          buildKey={buildActionProgramPdfBuildKey(pdfRecord)}
          buildSpec={(identity) =>
            buildActionProgramPdfSpec(pdfRecord, identity, pdfLabels)
          }
          fileName={sanitizePdfFileName(actionProgramDocNumber(pdfRecord))}
        />
      ) : null}
    </section>
  );
};
