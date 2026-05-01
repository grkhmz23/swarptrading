import React from "react";
import {
  useShow,
} from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingCard } from "@/components/ui/loading";
import { GenericDelete } from "./GenericDelete";

interface GenericShowProps {
  resource: string;
  title: string;
  listPath: string;
  canDelete?: boolean; // Add option to enable/disable delete
  canEdit?: boolean; // Add option to enable/disable edit
}

export const GenericShow: React.FC<GenericShowProps> = ({ 
  resource, 
  title, 
  listPath,
  canEdit = true, // Default to true
  canDelete = true, // Default to true
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { queryResult } = useShow({ 
    resource,
    id: id,
  });
  const { data, isLoading, error } = queryResult;

  const record = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(listPath)}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to {title}
            </Button>
            <h1 className="text-2xl font-bold">{title} Details</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading {title}...</CardTitle>
            <CardDescription>Please wait while we fetch the {title.toLowerCase()} information</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingCard lines={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(listPath)}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to {title}
            </Button>
            <h1 className="text-2xl font-bold">{title} Details</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error Loading {title}</CardTitle>
            <CardDescription>Unable to load {title.toLowerCase()} information. This might be because the backend API is not running.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Unable to load data from the API.</p>
              <p>Please check your network connection and API configuration.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderValue = (key: string, value: unknown) => {
    if (value === null || value === undefined) return "N/A";
    
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? 'default' : 'destructive'}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }
    
    if (key.includes("date") || key.includes("At")) {
      return new Date(value as string | number).toLocaleString();
    }
    
    if (key.includes("status")) {
      return <Badge>{value as React.ReactNode}</Badge>;
    }
    
    return String(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(listPath)}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to {title}
          </Button>
          <h1 className="text-2xl font-bold">{title} Details</h1>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${listPath}/edit/${record?.id}`)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && record?.id && (
            <GenericDelete
              id={String(record.id)}
              resource={resource}
              title={title}
              redirectTo={listPath}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title} #{record?.id}</CardTitle>
          <CardDescription>View {title.toLowerCase()} details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {record && Object.entries(record).map(([key, value]) => (
              <div key={key}>
                <label className="text-sm font-medium text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div className="text-sm">{renderValue(key, value)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};