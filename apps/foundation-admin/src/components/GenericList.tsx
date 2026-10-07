import React from "react";
import { useCan, useTable, type BaseRecord, type CrudFilter } from "@refinedev/core";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { LoadingTable } from "@/components/ui/loading";
import { GenericDelete } from "./GenericDelete";
import { SearchInput } from "@/components/SearchInput";
import { FieldValue } from "./FieldValue";
import type { FieldDef } from "@/resources/fields";
import { isSensitiveKey } from "@/lib/format";

interface GenericListProps {
  resource: string;
  title: string;
  /** Singular name used in buttons and dialogs, e.g. "User". */
  singularTitle: string;
  description: string;
  basePath: string;
  columns: FieldDef[];
  searchPlaceholder?: string;
  enableSearch?: boolean;
  /** Record field whose value must be typed to confirm deletion (defaults to the id). */
  deleteConfirmField?: string;
}

const SEARCH_FIELD = "search";
const PAGE_SIZES = [10, 20, 30, 40, 50];

const isSearchFilter = (filter: CrudFilter): boolean => "field" in filter && filter.field === SEARCH_FIELD;

export const GenericList: React.FC<GenericListProps> = ({
  resource,
  title,
  singularTitle,
  description,
  basePath,
  columns: fieldColumns,
  searchPlaceholder = "Search...",
  enableSearch = true,
  deleteConfirmField,
}) => {
  const navigate = useNavigate();

  const { data: canEdit } = useCan({ resource, action: "edit" });
  const { data: canDelete } = useCan({ resource, action: "delete" });
  const allowEdit = canEdit?.can === true;
  const allowDelete = canDelete?.can === true;

  // Page, page size, sorting and search are all synced to the URL by Refine,
  // so deep links and back/forward restore the same view.
  const {
    tableQuery: { isLoading, isError, error, refetch },
    result,
    currentPage,
    setCurrentPage,
    pageCount,
    pageSize,
    setPageSize,
    sorters,
    setSorters,
    filters,
    setFilters,
  } = useTable({
    resource,
    pagination: { currentPage: 1, pageSize: 10 },
    sorters: { mode: "server" },
    filters: { mode: "server" },
    syncWithLocation: true,
  });

  const searchFilter = filters.find(isSearchFilter);
  const searchTerm = typeof searchFilter?.value === "string" ? searchFilter.value : "";

  const handleSearch = React.useCallback(
    (term: string) => {
      const others = filters.filter((filter) => !isSearchFilter(filter));
      const next = term.trim()
        ? [...others, { field: SEARCH_FIELD, operator: "contains" as const, value: term }]
        : others;
      setFilters(next, "replace");
      setCurrentPage(1);
    },
    [filters, setFilters, setCurrentPage],
  );

  const sorting: SortingState = React.useMemo(
    () => sorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === "desc" })),
    [sorters],
  );

  const handleSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorters(next.map((sort) => ({ field: sort.id, order: sort.desc ? "desc" : "asc" })));
      setCurrentPage(1);
    },
    [sorting, setSorters, setCurrentPage],
  );

  const visibleColumns = React.useMemo(
    () => fieldColumns.filter((field) => !isSensitiveKey(field.key)),
    [fieldColumns],
  );

  const columns = React.useMemo<ColumnDef<BaseRecord>[]>(
    () => [
      ...visibleColumns.map(
        (field): ColumnDef<BaseRecord> => ({
          id: field.key,
          accessorFn: (row) => row[field.key],
          header: field.label,
          enableSorting: field.sortable === true,
          cell: ({ getValue }) => <FieldValue value={getValue()} kind={field.kind} maskPii compact />,
        }),
      ),
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const recordId = String(row.original.id);
          const encodedId = encodeURIComponent(recordId);
          const confirmSource = deleteConfirmField ? row.original[deleteConfirmField] : undefined;
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${basePath}/show/${encodedId}`)}
                title="View details"
                aria-label={`View ${singularTitle.toLowerCase()} ${recordId}`}
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              {allowEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${basePath}/edit/${encodedId}`)}
                  title="Edit"
                  aria-label={`Edit ${singularTitle.toLowerCase()} ${recordId}`}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
              {allowDelete && (
                <GenericDelete
                  id={recordId}
                  resource={resource}
                  title={singularTitle}
                  confirmValue={String(confirmSource ?? recordId)}
                  onDeleteSuccess={() => undefined}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                      aria-label={`Delete ${singularTitle.toLowerCase()} ${recordId}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  }
                />
              )}
            </div>
          );
        },
      },
    ],
    [visibleColumns, navigate, basePath, allowEdit, allowDelete, resource, singularTitle, deleteConfirmField],
  );

  const table = useReactTable({
    data: result.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: false,
    pageCount,
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  const totalResults = result.total ?? 0;
  const lastPage = Math.max(pageCount, 1);

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
                value={searchTerm}
                onSearch={handleSearch}
                placeholder={searchPlaceholder}
                className="max-w-md"
              />
            )}
            {searchTerm && (
              <div className="text-sm text-muted-foreground">
                Showing results for: <strong>"{searchTerm}"</strong> ({totalResults}{" "}
                {totalResults === 1 ? "result" : "results"} found)
                <button type="button" onClick={() => handleSearch("")} className="ml-2 text-primary hover:underline">
                  Clear search
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingTable rows={8} columns={visibleColumns.length + 1} />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 rounded-md border p-8 text-center">
              <p className="font-medium">Unable to load {title.toLowerCase()}.</p>
              <p className="text-sm text-muted-foreground">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const sortable = header.column.getCanSort();
                        const direction = header.column.getIsSorted();
                        const label = flexRender(header.column.columnDef.header, header.getContext());
                        return (
                          <TableHead
                            key={header.id}
                            aria-sort={
                              direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined
                            }
                          >
                            {sortable ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {label}
                                {direction === "asc" ? (
                                  <ChevronUpIcon className="h-3 w-3" />
                                ) : direction === "desc" ? (
                                  <ChevronDownIcon className="h-3 w-3" />
                                ) : (
                                  <ChevronUpDownIcon className="h-3 w-3 opacity-50" />
                                )}
                              </button>
                            ) : (
                              label
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
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
          {!isLoading && !isError && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <div className="flex items-center space-x-2">
                <label htmlFor={`${resource}-page-size`} className="text-sm font-medium">
                  Rows per page
                </label>
                <select
                  id={`${resource}-page-size`}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 w-[70px] rounded border border-input bg-background px-2 text-sm"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm font-medium">
                Page {currentPage} of {lastPage}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronLeftIcon className="h-4 w-4" />
                  <ChevronLeftIcon className="-ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= lastPage}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrentPage(lastPage)}
                  disabled={currentPage >= lastPage}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronRightIcon className="h-4 w-4" />
                  <ChevronRightIcon className="-ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
