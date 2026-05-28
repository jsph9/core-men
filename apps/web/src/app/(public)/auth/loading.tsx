import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
      <Card className="mx-auto mt-20 w-full max-w-md rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-100" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-200" />
        </CardContent>
      </Card>
    </div>
  );
}
