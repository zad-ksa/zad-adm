import { ReactNode } from "react";
import CharityLayoutClient from "./CharityLayoutClient";

export default async function CharityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  return (
    <CharityLayoutClient charityName={decodedName}>
      {children}
    </CharityLayoutClient>
  );
}
