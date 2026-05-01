import React, { useState, useEffect } from "react";
import {
  useOne,
  useUpdate,
  useCreate,
} from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingSpinner, LoadingCard } from "@/components/ui/loading";

interface GenericEditProps {
  resource: string;
  title: string;
  listPath: string;
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'email' | 'number' | 'checkbox' }[];
}

export const GenericEdit: React.FC<GenericEditProps> = ({ 
  resource,
  title,
  listPath,
  fields
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Initialize form data state
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  
  // Hooks for data fetching and mutations
  const { data, isLoading: dataLoading, error } = useOne({
    resource,
    id: id as string,
    queryOptions: {
      enabled: !!id, // Only fetch if editing (id exists)
    },
  });

  const { mutate: updateRecord, isLoading: updateLoading } = useUpdate();
  const { mutate: createRecord, isLoading: createLoading } = useCreate();
  
  const isSubmitting = updateLoading || createLoading;

  // Initialize form data when record is loaded
  useEffect(() => {
    if (data?.data) {
      const initialData: Record<string, unknown> = {};
      fields.forEach(field => {
        initialData[field.key] = data.data[field.key] || '';
      });
      setFormData(initialData);
    }
  }, [data, fields]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (id) {
      // Update existing record
      updateRecord(
        {
          resource,
          id: id,
          values: formData,
        },
        {
          onSuccess: () => {
            navigate(listPath);
          },
        }
      );
    } else {
      // Create new record
      createRecord(
        {
          resource,
          values: formData,
        },
        {
          onSuccess: () => {
            navigate(listPath);
          },
        }
      );
    }
  };

  // Handle input changes
  const handleInputChange = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (id && dataLoading) {
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
              Back to {title}s
            </Button>
            <h1 className="text-2xl font-bold">Edit {title}</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading {title}...</CardTitle>
            <CardDescription>Please wait while we fetch the {title.toLowerCase()} data for editing</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingCard lines={fields.length} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (id && error) {
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
              Back to {title}s
            </Button>
            <h1 className="text-2xl font-bold">Edit {title}</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error Loading {title}</CardTitle>
            <CardDescription>Unable to load {title.toLowerCase()} data for editing. This might be because the backend API is not running.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Unable to load data from the API.</p>
              <p>Please check your network connection and API configuration.</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate(listPath.replace('/edit', '/create'))}
              >
                Create New {title}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Back to {title}s
          </Button>
          <h1 className="text-2xl font-bold">{id ? "Edit" : "Create"} {title}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit" : "Create"} {title}</CardTitle>
          <CardDescription>
            {id ? `Update ${title.toLowerCase()} information` : `Create a new ${title.toLowerCase()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.key} className={field.type === 'checkbox' ? "flex items-center space-x-3" : "space-y-2"}>
                  {field.type === 'checkbox' ? (
                    <>
                      <input
                        id={field.key}
                        type="checkbox"
                        checked={!!formData[field.key]}
                        onChange={(e) => handleInputChange(field.key, e.target.checked)}
                        disabled={isSubmitting}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor={field.key} className="cursor-pointer">{field.label}</Label>
                    </>
                  ) : (
                    <>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={String(formData[field.key] || '')}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type}
                          value={String(formData[field.key] || '')}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          disabled={isSubmitting}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center justify-center"
              >
                {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                <CheckIcon className="h-4 w-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(listPath)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};