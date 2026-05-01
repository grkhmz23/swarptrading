import React, { useState } from "react";
import {
  useDelete,
  useNavigation,
} from "@refinedev/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { LoadingSpinner } from "@/components/ui/loading";

interface GenericDeleteProps {
  id: string;
  resource: string;
  title: string;
  redirectTo: string;
  onDeleteSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const GenericDelete: React.FC<GenericDeleteProps> = ({
  id,
  resource,
  title,
  onDeleteSuccess,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const { list } = useNavigation();
  const { mutate: deleteRecord, isLoading } = useDelete();

  const handleDelete = () => {
    deleteRecord(
      {
        resource,
        id,
      },
      {
        onSuccess: () => {
          setOpen(false);
          if (onDeleteSuccess) {
            onDeleteSuccess();
          } else {
            list(resource);
          }
        },
        onError: (error) => {
          console.error("Delete error:", error);
          // You can add toast notification here
        },
      }
    );
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
              <DialogTitle>Delete {title}</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete this {title.toLowerCase()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 my-4">
            <p className="text-sm text-destructive font-medium">
              Warning: This will permanently delete this {title.toLowerCase()} and all associated data.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              <TrashIcon className="h-4 w-4" />
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};