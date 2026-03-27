import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getTemplateBySlug, PROGRAM_TEMPLATES } from "@/lib/program-templates";
import { getTemplatePreview } from "../../template-actions";
import { TemplatePreviewClient } from "./_components/template-preview-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PROGRAM_TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  return {
    title: template ? template.name : "Program Template",
    description: template?.description,
  };
}

async function PreviewContent({ slug }: { slug: string }) {
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const preview = await getTemplatePreview(slug);
  if (!preview) notFound();

  return (
    <TemplatePreviewClient
      template={{
        slug: template.slug,
        name: template.name,
        subtitle: template.subtitle,
        description: template.description,
        daysPerWeek: template.daysPerWeek,
        weeks: template.weeks,
        targetLevel: template.targetLevel,
      }}
      preview={preview}
    />
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { slug } = await params;

  return (
    <Suspense fallback={<PreviewSkeleton />}>
      <PreviewContent slug={slug} />
    </Suspense>
  );
}
