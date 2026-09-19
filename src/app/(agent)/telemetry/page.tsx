import { redirect } from "next/navigation";

/** Agent requests for the retired telemetry page stay inside the Agent workspace. */
export default function TelemetryRedirect() {
  redirect("/");
}
