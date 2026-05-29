import { Monitor } from "./monitor";

type PlayPageProps = {
  searchParams: {
    session?: string;
  };
};

export default function PlayPage({ searchParams }: PlayPageProps) {
  return <Monitor sessionId={searchParams.session || ""} />;
}
