import VipConfirmation from "./VipConfirmation";

export default async function VipConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { session_id } = await searchParams;
  return (
    <VipConfirmation
      sessionId={typeof session_id === "string" ? session_id : undefined}
    />
  );
}
