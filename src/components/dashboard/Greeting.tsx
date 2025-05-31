"use client";

// Placeholder for user data
const useUser = () => ({ user: { name: "Learner" }, isLoading: false });

export function Greeting() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <h1 className="font-headline text-3xl font-semibold">Loading...</h1>;
  }

  return (
    <h1 className="font-headline text-3xl font-semibold