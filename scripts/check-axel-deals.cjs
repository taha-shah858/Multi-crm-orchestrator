const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { company: { contains: 'axel', mode: 'insensitive' } },
        { clientAccountId: 'cmu77k9ue0002c498bstiiqpn' }
      ]
    },
    include: { deals: true }
  });
  console.log('CONTACTS FOR AXEL:', JSON.stringify(contacts.map(c => ({
    id: c.id,
    name: c.firstName + ' ' + c.lastName,
    company: c.company,
    deals: c.deals
  })), null, 2));

  const clientDeals = await prisma.deal.findMany({
    where: { clientAccountId: 'cmu77k9ue0002c498bstiiqpn' }
  });
  console.log('CLIENT DEALS IN DB:', JSON.stringify(clientDeals, null, 2));

  const allDeals = await prisma.deal.findMany({
    take: 10
  });
  console.log('ALL DEALS IN DB:', JSON.stringify(allDeals.map(d => ({
    id: d.id,
    title: d.title,
    clientAccountId: d.clientAccountId,
    contactId: d.contactId,
    status: d.status
  })), null, 2));
}
main().finally(() => prisma.$disconnect());
