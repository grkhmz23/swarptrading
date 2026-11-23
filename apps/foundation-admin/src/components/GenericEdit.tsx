import React, { useEffect, useMemo, useState } from "react";
import { useOne, useUpdate, useWarnAboutChange, type BaseRecord } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeftIcon, CheckIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingSpinner, LoadingCard } from "@/components/ui/loading";
import type { EditField } from "@/resources/fields";
import {
  computeChanges,
  describeValue,
  initialFormValues,
  type FieldChange,
  type FormValues,
} from "@/lib/editForm";

interface GenericEditProps {
  resource: string;
  title: string;
  listPath: string;
  fields: EditField[];
}

interface EditFormProps extends GenericEditProps {
  id: string;
  record: BaseRecord;
}

const EditForm: React.FC<EditFormProps> = ({ resource, title, listPath, fields, id, record }) => {
  const navigate = useNavigate();
  const showPath = `${listPath}/show/${encodeURIComponent(id)}`;
  const { setWarnWhen } = useWarnAboutChange();

  const [values, setValues] = useState<FormValues>(() => initialFormValues(fields, record));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<FieldChange[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    mutate: updateRecord,
    mutation: { isPending },
  } = useUpdate();

  const isDirty = useMemo(() => computeChanges(fields, values, record).changes.length > 0, [fields, values, record]);

  useEffect(() => {
    setWarnWhen(isDirty);
  }, [isDirty, setWarnWhen]);

  useEffect(() => () => setWarnWhen(false), [setWarnWhen]);

  const handleChange = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const { changes, errors: validationErrors } = computeChanges(fields, values, record);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    if (changes.length === 0) {
      setNotice("No changes to save.");
      return;
    }
    setPendingChanges(changes);
  };

  const handleConfirm = () => {
    if (!pendingChanges) return;
    const payload = Object.fromEntries(pendingChanges.map((change) => [change.key, change.to]));
    updateRecord(
      { resource, id, values: payload, mutationMode: "pessimistic" },
      {
        onSuccess: () => {
          setWarnWhen(false);
          setPendingChanges(null);
          navigate(showPath);
        },
        onError: () => {
          // The notification provider shows the server error; keep the form open.
          setPendingChanges(null);
        },
      },
    );
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    setWarnWhen(false);
    navigate(showPath);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const error = errors[field.key];
            const errorId = error ? `${field.key}-error` : undefined;
            const hintId = field.readOnly && field.readOnlyReason ? `${field.key}-hint` : undefined;
            const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
            const disabled = isPending || field.readOnly;

            if (field.type === "checkbox") {
              return (
                <div key={field.key} className="flex items-center space-x-3 md:col-span-2">
                  <input
                    id={field.key}
                    type="checkbox"
                    checked={values[field.key] === true}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                    disabled={disabled}
                    aria-describedby={describedBy}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={field.key} className="cursor-pointer">
                    {field.label}
                  </Label>
                  {error && (
                    <p id={errorId} className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            }

            const inputValue = typeof values[field.key] === "string" ? (values[field.key] as string) : "";
            return (
              <div key={field.key} className={field.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <Label htmlFor={field.key} className="flex items-center gap-1">
                  {field.readOnly && <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {field.label}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.key}
                    value={inputValue}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={disabled}
                    readOnly={field.readOnly}
                    maxLength={field.maxLength}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    min={field.min}
                    max={field.max}
                    step={field.type === "number" ? (field.integer ? 1 : "any") : undefined}
                    value={inputValue}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.type === "url" ? "https://" : undefined}
                    disabled={disabled}
                    readOnly={field.readOnly}
                    maxLength={field.maxLength}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                  />
                )}
                {hintId && (
                  <p id={hintId} className="text-xs text-muted-foreground">
                    {field.readOnlyReason}
                  </p>
                )}
                {error && (
                  <p id={errorId} className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {notice && (
          <p className="text-sm text-muted-foreground" role="status">
            {notice}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} className="flex items-center justify-center">
            {isPending ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckIcon className="mr-2 h-4 w-4" />}
            {isPending ? "Saving..." : "Review changes"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>

      <Dialog
        open={pendingChanges !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setPendingChanges(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Confirm changes to this {title.toLowerCase()}</DialogTitle>
            <DialogDescription>Only the fields below will be sent. Review them before saving.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium">Field</th>
                  <th className="p-2 font-medium">Current</th>
                  <th className="p-2 font-medium">New</th>
                </tr>
              </thead>
              <tbody>
                {pendingChanges?.map((change) => (
                  <tr key={change.key} className="border-t align-top">
                    <td className="p-2 font-medium">{change.label}</td>
                    <td className="break-all p-2 text-muted-foreground line-through">{describeValue(change.from)}</td>
                    <td className="break-all p-2">{describeValue(change.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingChanges(null)} disabled={isPending}>
              Back to form
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={isPending} className="flex items-center gap-2">
              {isPending && <LoadingSpinner size="sm" />}
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const GenericEdit: React.FC<GenericEditProps> = (props) => {
  const { resource, title, listPath, fields } = props;
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    result: record,
    query: { isLoading, error },
  } = useOne({
    resource,
    id: id ?? "",
    queryOptions: { enabled: Boolean(id) },
  });

  const backPath = id ? `${listPath}/show/${encodeURIComponent(id)}` : listPath;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit {title.toLowerCase()}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="break-all">
            {title} {id}
          </CardTitle>
          <CardDescription>
            {error
              ? error.message
              : "Changes are reviewed in a confirmation step before anything is saved."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingCard lines={fields.length} />
          ) : error || !record || !id ? (
            <p className="text-sm text-muted-foreground">The record could not be loaded for editing.</p>
          ) : (
            // Keyed by record identity so the form re-initialises if a different record loads.
            <EditForm key={String(record.id ?? id)} {...props} id={id} record={record} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
