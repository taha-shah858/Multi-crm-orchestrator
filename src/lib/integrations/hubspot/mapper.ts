import { NormalizedContact } from "@/lib/models/contact";
import type { HubSpotContactProperties } from "./types";

/**
 * Maps a raw HubSpot v3 contact record to the platform's canonical NormalizedContact model.
 */
export function mapHubSpotContactToNormalized(record: { id: string; properties: HubSpotContactProperties; createdAt: string; updatedAt: string }): NormalizedContact {
  const props = record.properties || {};

  return {
    id: record.id,
    first_name: (props.firstname || "").trim(),
    last_name: (props.lastname || "").trim(),
    email: (props.email || "").trim(),
    phone: (props.phone || "").trim(),
    company: (props.company || "").trim(),
    source_crm: "HubSpot",
    raw_created_at: props.createdate || record.createdAt,
    raw_updated_at: props.lastmodifieddate || record.updatedAt,
  };
}
