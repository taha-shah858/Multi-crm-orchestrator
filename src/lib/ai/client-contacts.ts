import "server-only";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { listClientDirectoryContacts } from "@/lib/client-crm/client-directory-contacts";

/** Use the same read-only company/brand projection as Client CRM, not import storage ownership. */
export async function listAiClientContacts(context: RequestContext) {
  const directory = await listClientDirectoryContacts(context);
  return prisma.contact.findMany({
    where: { organizationId: context.user.organizationId, id: { in: directory.map(row => row.id) } },
    select: { id: true, firstName: true, lastName: true, email: true, company: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function requireAiClientContact(context: RequestContext, id: string) {
  const contact = (await listAiClientContacts(context)).find(row => row.id === id);
  if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact does not belong to the selected client's directory.", "Choose a contact associated with the selected client's company or brand.");
  return contact;
}
