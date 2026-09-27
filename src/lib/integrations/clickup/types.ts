export interface ClickUpTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  members?: Array<{
    user: {
      id: number;
      username: string;
      email: string;
    };
  }>;
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private?: boolean;
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex?: number;
  content?: string;
  status?: string | null;
  priority?: string | null;
  space?: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
}

export interface ClickUpTaskCreateInput {
  name: string;
  description?: string;
  markdown_description?: string;
  status?: string;
  priority?: number | null;
  due_date?: number | null;
  due_date_time?: boolean;
  time_estimate?: number | null;
  start_date?: number | null;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string | null;
  links_to?: string | null;
  check_required_custom_fields?: boolean;
  custom_fields?: Array<{
    id: string;
    value: unknown;
  }>;
}

export interface ClickUpTaskUpdateInput {
  name?: string;
  description?: string;
  markdown_description?: string;
  status?: string;
  priority?: number | null;
  time_estimate?: number | null;
}

export interface ClickUpTaskResponse {
  id: string;
  name: string;
  status?: {
    status: string;
    type: string;
    orderindex: number;
    color: string;
  };
  orderindex?: string;
  date_created?: string;
  date_updated?: string;
  date_closed?: string | null;
  creator?: {
    id: number;
    username: string;
    email: string;
  };
  url?: string;
  list?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  space?: {
    id: string;
  };
}

export interface ClickUpDestinationConfig {
  teamId?: string;
  teamName?: string;
  spaceId?: string;
  spaceName?: string;
  listId?: string;
  listName?: string;
}

export interface ClickUpDealTaskPayload {
  dealId: string;
  dealTitle: string;
  dealValueCents: number;
  currency: string;
  commissionRate: number;
  expectedRevenueCents: number;
  closedAt: Date;
  customerName: string;
  customerEmail?: string | null;
  clientAccountName: string;
  clientAccountId: string;
  agentName: string;
  agentEmail?: string | null;
  handoffStatus: string;
  clientCrmProvider: string;
  zohoRecordId?: string | null;
  closeOutcome?: string | null;
  recommendedNextAction?: string | null;
  notes?: string | null;
}

export interface ClickUpSyncResult {
  success: boolean;
  taskId?: string;
  taskUrl?: string;
  listId?: string;
  action: "CREATED" | "UPDATED" | "SKIPPED";
  error?: string;
}
