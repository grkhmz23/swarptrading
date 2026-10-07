import React from "react";
import { useCan, useShow } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingCard } from "@/components/ui/loading";
import { GenericDelete } from "./GenericDelete";
import { FieldValue } from "./FieldValue";
import type { FieldDef } from "@/resources/fields";
import { isSensitiveKey } from "@/lib/format";

interface GenericShowProps {
  resource: string;
  title: string;
  listPath: string;
  /** Allowlist of fields to display, in order. Nothing else is rendered. */
  fields: FieldDef[];
  /** Record field whose value must be typed to confirm deletion (defaults to the id). */
  deleteConfirmField?: string;
}

export const GenericShow: React.FC<GenericShowProps> = ({ resource, title, listPath, fields, deleteConfirmField }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { query, result: record } = useShow({ resource, id });
  const { isLoading, error } = query;

  const { data: canEdit } = useCan({ resource, action: "edit", params: { id } });
  const { data: canDelete } = useCan({ resource, action: "delete", params: { id } });

  const visibleFields = fields.filter((field) => !isSensitiveKey(field.key));

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(listPath)}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{title} details</h1>
      </div>
      {record?.id !== undefined && record?.id !== null && (
        <div className="flex gap-2">
          {canEdit?.can && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${listPath}/edit/${encodeURIComponent(String(record.id))}`)}
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete?.can && (
            <GenericDelete
              id={String(record.id)}
              resource={resource}
              title={title}
              confirmValue={String(
                (deleteConfirmField ? record[deleteConfirmField] : undefined) ?? record.id,
              )}
              redirectTo={listPath}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Loading {title.toLowerCase()}...</CardTitle>
          </CardHeader>
          <CardContent>
            <LoadingCard lines={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Unable to load {title.toLowerCase()}</CardTitle>
            <CardDescription>{error?.message ?? "The record could not be found."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <Card>
        <CardHeader>
          <CardTitle className="break-all">
            {title} {String(record.id)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleFields.map((field) => (
              <div key={field.key} className="min-w-0">
                <dt className="text-sm font-medium text-muted-foreground">{field.label}</dt>
                <dd className="text-sm">
                  <FieldValue value={record[field.key]} kind={field.kind} />
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};
