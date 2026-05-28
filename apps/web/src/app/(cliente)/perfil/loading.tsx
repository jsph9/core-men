import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PerfilLoading() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8 md:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-100" />
        </CardContent>
      </Card>
    </div>
  );
}
