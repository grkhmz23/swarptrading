import React from "react";
import { Badge } from "@/components/ui/badge";
import type { FieldKind } from "@/resources/fields";
import {
  formatDateTime,
  formatNumber,
  isHttpsUrl,
  maskEmail,
  maskPhone,
  summarizeValue,
} from "@/lib/format";

interface FieldValueProps {
  value: unknown;
  kind?: FieldKind;
  /** Mask emails/phone numbers (list views). */
  maskPii?: boolean;
  /** Short date format (list views). */
  compact?: boolean;
}

const Empty = () => <span className="text-muted-foreground">N/A</span>;

export const FieldValue: React.FC<FieldValueProps> = ({ value, kind = "text", maskPii = false, compact = false }) => {
  if (value === null || value === undefined || value === "") return <Empty />;

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "destructive"}>{value ? "Yes" : "No"}</Badge>;
  }

  if (typeof value === "object") {
    return <span>{summarizeValue(value, maskPii)}</span>;
  }

  const text = String(value);

  switch (kind) {
    case "boolean":
      // Non-boolean value in a boolean field: show it as-is rather than guessing.
      return <span>{text}</span>;
    case "date":
      return <span className="whitespace-nowrap">{formatDateTime(value, compact)}</span>;
    case "status":
      return <Badge variant="secondary">{text}</Badge>;
    case "email":
      return <span>{maskPii ? maskEmail(text) : text}</span>;
    case "phone":
      return <span>{maskPii ? maskPhone(text) : text}</span>;
    case "number":
      return <span className="tabular-nums">{formatNumber(value, 4)}</span>;
    case "amount":
      return <span className="tabular-nums">{formatNumber(value)}</span>;
    case "id":
      return (
        <span className={compact ? "block max-w-[12rem] truncate font-mono text-xs" : "break-all font-mono text-xs"} title={text}>
          {text}
        </span>
      );
    case "url":
      return isHttpsUrl(text) ? (
        <a href={text} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">
          {text}
        </a>
      ) : (
        <span className="break-all">{text}</span>
      );
    default:
      return <span className="break-words">{text}</span>;
  }
};
