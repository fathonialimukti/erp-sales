import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateEventProposalInput,
  UpdateEventProposalInput,
} from "@repo/schemas/event-proposal";

interface FormValues {
  name: string;
  eventType: string;
  description: string;
  venue: string;
  eventDate: string;
  eventEndDate: string;
  organizerName: string;
  organizerContact: string;
  areaId: string;
  proposedBudget: string;
  currency: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  name: "",
  eventType: "",
  description: "",
  venue: "",
  eventDate: "",
  eventEndDate: "",
  organizerName: "",
  organizerContact: "",
  areaId: "",
  proposedBudget: "",
  currency: "IDR",
});

export const EventProposalFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "eventProposal@update" : "eventProposal@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["eventProposalDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? "" }),
  });

  const { data: areas } = useQuery({
    queryKey: ["areaOptions"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          name: data.name,
          eventType: data.eventType ?? "",
          description: data.description ?? "",
          venue: data.venue ?? "",
          eventDate: data.eventDate,
          eventEndDate: data.eventEndDate ?? "",
          organizerName: data.organizerName ?? "",
          organizerContact: data.organizerContact ?? "",
          areaId: data.areaId,
          proposedBudget: data.proposedBudget != null ? String(data.proposedBudget) : "",
          currency: data.currency,
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    eventType: (v: unknown) => form.setFieldValue("eventType" as never, String(v) as never),
    description: (v: unknown) => form.setFieldValue("description" as never, String(v) as never),
    venue: (v: unknown) => form.setFieldValue("venue" as never, String(v) as never),
    eventDate: (v: unknown) => form.setFieldValue("eventDate" as never, String(v) as never),
    eventEndDate: (v: unknown) => form.setFieldValue("eventEndDate" as never, String(v) as never),
    organizerName: (v: unknown) => form.setFieldValue("organizerName" as never, String(v) as never),
    organizerContact: (v: unknown) => form.setFieldValue("organizerContact" as never, String(v) as never),
    areaId: (v: unknown) => form.setFieldValue("areaId" as never, String(v) as never),
    proposedBudget: (v: unknown) => form.setFieldValue("proposedBudget" as never, String(v) as never),
    currency: (v: unknown) => form.setFieldValue("currency" as never, String(v) as never),
  });

  // ponytail: keep original seed-via-defaultValues only (detail query gates render via isLoading)

  const createMutation = useMutation({
    mutationFn: (d: CreateEventProposalInput) => trpcClient.eventProposal.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      setResultMessage(
        intl.formatMessage({
          id: "event_proposal.form.success.created",
          defaultMessage: "Region created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/event-proposal"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: UpdateEventProposalInput) => trpcClient.eventProposal.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      queryClient.invalidateQueries({ queryKey: ["eventProposalDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "event_proposal.form.success.updated",
          defaultMessage: "Region updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/event-proposal/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    const payload = {
      ...values,
      proposedBudget: values.proposedBudget ? Number(values.proposedBudget) : null,
    };
    if (isEdit && id) {
      updateMutation.mutate({ ...payload, currentId: id } as UpdateEventProposalInput);
    } else {
      createMutation.mutate(payload as CreateEventProposalInput);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (modalStage === "idle") form.handleSubmit();
      }
      if (e.key === "Escape" && modalStage !== "idle" && modalStage !== "loading") {
        setModalStage("idle");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [form, modalStage]);

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "event-proposal-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "event-proposal-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/event-proposal/${id}` : "/event-proposal")}
      />

      <PageHeader
          module="event"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "event_proposal.form.title_edit",
                  defaultMessage: "Edit eventProposal",
                })
              : intl.formatMessage({
                  id: "event_proposal.form.title_create",
                  defaultMessage: "New eventProposal",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "event_proposal.form.subtitle_edit",
                  defaultMessage: "Update eventProposal details",
                })
              : intl.formatMessage({
                  id: "event_proposal.form.subtitle_create",
                  defaultMessage: "Create a new geographical eventProposal",
                })
          }
        />

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FormSection
          title={intl.formatMessage({
            id: "event_proposal.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="name"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-name">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_name",
                      defaultMessage: "Event name",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ep-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="eventType">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-type">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_event_type",
                      defaultMessage: "Event type",
                    })}
                  </Label>
                  <Input
                    id="ep-type"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="ep-description">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_description",
                      defaultMessage: "Description",
                    })}
                  </Label>
                  <Textarea
                    id="ep-description"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="venue">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-venue">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_venue",
                      defaultMessage: "Venue",
                    })}
                  </Label>
                  <Input
                    id="ep-venue"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="eventDate"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-date">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_event_date",
                      defaultMessage: "Event date",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ep-date"
                    type="date"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="eventEndDate">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-end">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_event_end_date",
                      defaultMessage: "Event end date",
                    })}
                  </Label>
                  <Input
                    id="ep-end"
                    type="date"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="organizerName">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-org-name">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_organizer_name",
                      defaultMessage: "Organizer name",
                    })}
                  </Label>
                  <Input
                    id="ep-org-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="organizerContact">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-org-contact">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_organizer_contact",
                      defaultMessage: "Organizer contact",
                    })}
                  </Label>
                  <Input
                    id="ep-org-contact"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="areaId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-area">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_area",
                      defaultMessage: "Area",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="ep-area"
                      size="default"
                      aria-label={intl.formatMessage({ id: "event_proposal.form.field_area", defaultMessage: "Area" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "event_proposal.form.field_area_placeholder", defaultMessage: "Select area" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(areas?.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="proposedBudget">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-budget">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_proposed_budget",
                      defaultMessage: "Proposed budget",
                    })}
                  </Label>
                  <Input
                    id="ep-budget"
                    type="number"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="currency">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-currency">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_currency",
                      defaultMessage: "Currency",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ep-currency"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <AiFillButton
            section="event-proposal-form"
            context={{ isEdit, id: id ?? null }}
            options={{
              areaList: ((areas?.data ?? []) as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name })),
              currencyList: ["IDR", "USD", "SGD", "MYR"].map((c) => ({ value: c })),
            }}
          />
          <Button
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            type="submit"
              disabled={!canSave || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({
                id: "event_proposal.form.save_button",
                defaultMessage: "Save",
              })}
            </Button>
        </div>
</form>

      <ConfirmDialog
        open={modalStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({
          id: "event_proposal.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "event_proposal.form.modal.confirm_body",
          defaultMessage: "Save changes to this eventProposal?",
        })}
        confirmLabel={intl.formatMessage({
          id: "common.action.confirm",
          defaultMessage: "Confirm",
        })}
        onConfirm={runSave}
      />

      <Dialog
        open={modalStage === "loading" || modalStage === "success" || modalStage === "error"}
        onOpenChange={(open) => {
          if (!open && modalStage !== "loading") setModalStage("idle");
        }}
      >
        <DialogContent showCloseButton={modalStage !== "loading"} className="sm:max-w-md">
          {modalStage === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="size-8 animate-spin text-foreground" aria-hidden />
              <DialogDescription>
                {intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}
              </DialogDescription>
            </div>
          ) : null}
          {modalStage === "success" ? (
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({
                  id: "event_proposal.form.modal.success",
                  defaultMessage: "Success!",
                })}
              </DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "event_proposal.form.modal.error_title",
                    defaultMessage: "Error",
                  })}
                </DialogTitle>
                <DialogDescription>{resultMessage}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalStage("idle")}>
                  {intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};
