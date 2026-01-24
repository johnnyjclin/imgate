'use client';

import { useParams } from 'next/navigation';
import { ViewAsset } from './ViewAsset';

export default function Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  return <ViewAsset slug={slug} />;
}
