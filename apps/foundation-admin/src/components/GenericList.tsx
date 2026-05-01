import React, { useState } from "react";
import type {
  BaseRecord,
  CrudFilters,
} from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { LoadingTable } from "@/components/ui/loading";
import { GenericDelete } from "./GenericDelete";
import { SearchInput } from "@/components/SearchInput";

interface GenericListProps {
  resource: string;
  title: string;
  description: string;
  basePath: string;
  columns: string[];
  canDelete?: boolean; // Add option to enable/disable delete
  canEdit?: boolean; // Add option to enable/disable edit
  searchPlaceholder?: string; // Custom placeholder for search input
  enableSearch?: boolean; // Enable/disable search functionality
}

export const GenericList: React.FC<GenericListProps> = ({
  resource,
  title,
  description,
  basePath,
  columns: fieldColumns,
  canDelete = true, // Default to true
  canEdit = true, // Default to true
  searchPlaceholder = "Search...",
  enableSearch = true, // Default to true
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const columns = React.useMemo<ColumnDef<BaseRecord>[]>(
    () => [
      ...fieldColumns.map(field => ({
        id: field,
        accessorKey: field,
        header: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
        cell: ({ getValue, row }: { getValue: () => unknown; row: { original: Record<string, unknown> } }) => {
          const value = getValue();

          // Handle approval status - show as Approved/Not Approved text with badge
          if (field === 'approvalStatus') {
            // Use approvalStatus if available, otherwise fallback to isVerified
            let isApproved = false;
            if (value) {
              isApproved = value === 'approved';
            } else if (row.original.isVerified !== undefined) {
              // Fallback to isVerified if no approvalStatus
              isApproved = row.original.isVerified === true;
            }

            return (
              <Badge variant={isApproved ? 'default' : 'destructive'} className="whitespace-nowrap">
                {isApproved ? "Approved" : "Not Approved"}
              </Badge>
            );
          }

          // Handle isVerified field - always show N/A
          if (field === 'isVerified') {
            return <span className="text-muted-foreground">N/A</span>;
          }

          // Handle different data types
          if (typeof value === 'boolean') {
            return <Badge variant={value ? 'default' : 'destructive'}>{value ? "Yes" : "No"}</Badge>;
          }

          if (field.includes('status')) {
            return <Badge variant="secondary">{(value as string) || 'Unknown'}</Badge>;
          }

          if (field.includes('date') || field.includes('At')) {
            return value ? new Date(value as string | number).toLocaleDateString() : 'N/A';
          }

          return (value as string | number) || 'N/A';
        },
      })),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/show/${row.original.id}`)}
              title="View details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                variant="outline" 
                size="sm"
                onClick={() => navigate(`${basePath}/edit/${row.original.id}`)}
                title="Edit"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <GenericDelete
                id={String(row.original.id)}
                resource={resource}
                title={title.slice(0, -1)} // Remove 's' from plural
                redirectTo={basePath}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                }
              />
            )}
          </div>
        ),
      },
    ],
    [navigate, basePath, fieldColumns, canDelete, canEdit, resource, title]
  );

  // Build filters array
  const filters: CrudFilters = React.useMemo(() => {
    const filterArray: CrudFilters = [];
    if (searchTerm) {
      filterArray.push({
        field: 'search',
        operator: 'contains',
        value: searchTerm,
      });
    }
    return filterArray;
  }, [searchTerm]);

  const {
    getHeaderGroups,
    getRowModel,
    refineCore: {
      tableQueryResult: { data: tableData, isLoading },
      current,
      setCurrent,
      pageCount,
      pageSize,
      setPageSize,
    },
  } = useTable({
    columns,
    refineCoreProps: {
      resource,
      pagination: {
        current: 1,
        pageSize: 10,
      },
      filters: {
        permanent: filters,
      },
    },
  });

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrent(1);
  }, [searchTerm, setCurrent]);

  const totalResults = tableData?.total || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {enableSearch && (
              <SearchInput
                onSearch={setSearchTerm}
                placeholder={searchPlaceholder}
                className="max-w-md"
              />
            )}
            {searchTerm && (
              <div className="text-sm text-muted-foreground">
                Showing results for: <strong>"{searchTerm}"</strong> ({totalResults} {totalResults === 1 ? 'result' : 'results'} found)
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingTable rows={8} columns={fieldColumns.length + 1} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {getRowModel().rows?.length ? (
                    getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        {searchTerm ? (
                          <div className="flex flex-col items-center gap-2">
                            <p>No results found for "{searchTerm}"</p>
                            <p className="text-sm text-muted-foreground">
                              Try checking your spelling or using different keywords
                            </p>
                          </div>
                        ) : (
                          <p>No {title.toLowerCase()} found.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {!isLoading && (
            <div className="flex items-center justify-between space-x-6 lg:space-x-8 pt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 w-[70px] rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {current} of {pageCount || 1}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrent(1)}
                  disabled={current === 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronLeftIcon className="h-4 w-4" />
                  <ChevronLeftIcon className="h-4 w-4 -ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrent(current - 1)}
                  disabled={current === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrent(current + 1)}
                  disabled={current === pageCount}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrent(pageCount || 1)}
                  disabled={current === pageCount}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronRightIcon className="h-4 w-4" />
                  <ChevronRightIcon className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};