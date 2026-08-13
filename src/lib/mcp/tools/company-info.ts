import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const OVERVIEW = `SIDDHBALI TECHNOLOGIES provides practical technology solutions for businesses and organizations.

Services:
- IT Support & Service Desk
- Software Development
- Web & Application Development
- AI & Data Solutions
- Automation Solutions
- Graphic Design
- Research & Technical Writing
- Ticket Raising & Issue Management

Website sections: /about, /services, /team, /careers, /contact, /blog, /track.`;

export default defineTool({
  name: "get_company_info",
  title: "Get SIDDHBALI company info",
  description:
    "Return an overview of SIDDHBALI TECHNOLOGIES: services offered and the main website sections.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: () => ({ content: [{ type: "text", text: OVERVIEW }] }),
});

// Unused export kept intentionally minimal — zod is required only for schema-bearing tools.
void z;
