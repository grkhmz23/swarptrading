import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ErrorPage = ({ title, description }: { title: string; description: string }) => (
  <div className="flex justify-center pt-12">
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

export const NotFound = () => (
  <ErrorPage title="Page not found" description="The page you are looking for does not exist or has moved." />
);

export const Forbidden = () => (
  <ErrorPage
    title="Not permitted"
    description="Your admin role does not allow this action. Ask a super admin if you need access."
  />
);
