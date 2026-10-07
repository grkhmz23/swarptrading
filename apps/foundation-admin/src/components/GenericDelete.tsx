import React, { useState } from "react";
import { useDelete } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { LoadingSpinner } from "@/components/ui/loading";

interface GenericDeleteProps {
  id: string;
  resource: string;
  title: string;
  /** Text the admin must type exactly to enable the delete button (record name or id). */
  confirmValue: string;
  /** Where to go after a successful delete. Ignored when onDeleteSuccess is given. */
  redirectTo?: string;
  onDeleteSuccess?: () => void;
  /** Must be a single element that can hold a ref (e.g. <Button>). */
  trigger?: React.ReactElement;
}

export const GenericDelete: React.FC<GenericDeleteProps> = ({
  id,
  resource,
  title,
  confirmValue,
  redirectTo,
  onDeleteSuccess,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const navigate = useNavigate();
  const {
    mutate: deleteRecord,
    mutation: { isPending },
  } = useDelete();

  const confirmed = typed === confirmValue;
  const inputId = `confirm-delete-${resource}-${id}`;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) setTyped("");
  };

  const handleDelete = () => {
    if (!confirmed) return;
    deleteRecord(
      { resource, id },
      {
        onSuccess: () => {
          setOpen(false);
          setTyped("");
          if (onDeleteSuccess) {
            onDeleteSuccess();
          } else if (redirectTo) {
            navigate(redirectTo);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            aria-label={`Delete ${title.toLowerCase()}`}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
            <DialogTitle>Delete {title.toLowerCase()}</DialogTitle>
          </div>
          <DialogDescription>
            This permanently deletes the {title.toLowerCase()} and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={inputId}>
            Type <span className="break-all font-mono font-semibold">{confirmValue}</span> to confirm
          </Label>
          <Input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || isPending}
            className="flex items-center gap-2"
          >
            {isPending ? <LoadingSpinner size="sm" /> : <TrashIcon className="h-4 w-4" />}
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
