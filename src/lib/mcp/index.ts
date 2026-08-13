import { defineMcp } from "@lovable.dev/mcp-js";
import companyInfoTool from "./tools/company-info";
import submitTicketTool from "./tools/submit-ticket";
import trackTicketTool from "./tools/track-ticket";

export default defineMcp({
  name: "siddhbali-mcp",
  title: "SIDDHBALI TECHNOLOGIES",
  version: "0.1.0",
  instructions:
    "Public MCP server for SIDDHBALI TECHNOLOGIES. Use get_company_info for an overview of the company. Use submit_ticket to file a contact message, career application, or business enquiry on behalf of the user (always ask the user for their name and email first). Use track_ticket to look up an existing ticket by its number and submitter email.",
  tools: [companyInfoTool, submitTicketTool, trackTicketTool],
});
