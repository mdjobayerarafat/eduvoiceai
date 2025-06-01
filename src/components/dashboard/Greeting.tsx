
"use client";

interface GreetingProps {
  name?: string | null;
  isLoading?: boolean;
}

export function Greeting({ name, isLoading }: GreetingProps) {
  if (isLoading) {
    // You can refine this loading state if needed, e.g., show a Skeleton
    return <h1 className="font-headline text-3xl font-semibold">Loading...</h1>;
  }

  return (
    <h1 className="font-headline text-3xl font-semibold">
      Welcome back, {name || "Learner"}!
    </h1>
  );
}
