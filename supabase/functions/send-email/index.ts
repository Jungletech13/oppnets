import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_URL = "https://api.resend.com/emails";

const ALLOWED_TEMPLATES = [
  "welcome",
  "inquiry",
  "invitation",
  "verification",
  "moderation",
] as const;
type TemplateName = (typeof ALLOWED_TEMPLATES)[number];

const SENDER_MAP: Record<string, string> = {
  welcome: "EMAIL_FROM_AUTH",
  inquiry: "EMAIL_FROM_NOTIFICATIONS",
  invitation: "EMAIL_FROM_NOTIFICATIONS",
  verification: "EMAIL_FROM_NOTIFICATIONS",
  moderation: "EMAIL_FROM_NOTIFICATIONS",
};

const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_MAX_PER_WINDOW = 10;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  recipientEmail: string,
  templateName: string
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();
  const { count, error } = await supabase
    .from("email_log")
    .select("*", { count: "exact", head: true })
    .eq("recipient_email", recipientEmail)
    .eq("template_name", templateName)
    .gte("created_at", windowStart);

  if (error) return false;
  return (count ?? 0) < RATE_LIMIT_MAX_PER_WINDOW;
}

async function hasAlreadySent(
  supabase: ReturnType<typeof createClient>,
  recipientEmail: string,
  templateName: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("email_log")
    .select("id")
    .eq("recipient_email", recipientEmail)
    .eq("template_name", templateName)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function logEmail(
  supabase: ReturnType<typeof createClient>,
  params: {
    recipientEmail: string;
    templateName: string;
    status: "sent" | "failed";
    providerMessageId?: string;
    error?: string;
    relatedId?: string;
    relatedType?: string;
  }
) {
  try {
    await supabase.from("email_log").insert({
      recipient_email: params.recipientEmail,
      template_name: params.templateName,
      status: params.status,
      provider_message_id: params.providerMessageId ?? null,
      error: params.error ?? null,
      related_id: params.relatedId ?? null,
      related_type: params.relatedType ?? null,
    });
  } catch {
    // Logging is best-effort — do not throw on log failure
  }
}

async function resolveRecipientEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
    userId
  );
  if (authError || !authUser.user?.email) return null;
  return authUser.user.email;
}

async function verifyOwnership(
  supabase: ReturnType<typeof createClient>,
  templateName: string,
  relatedId: string,
  userId: string
): Promise<boolean> {
  if (templateName === "inquiry") {
    const { data } = await supabase
      .from("professional_inquiries")
      .select("sender_id")
      .eq("id", relatedId)
      .maybeSingle();
    return data?.sender_id === userId;
  }
  if (templateName === "welcome") {
    return relatedId === userId;
  }
  if (templateName === "invitation") {
    const { data } = await supabase
      .from("collaboration_spaces")
      .select("id")
      .eq("id", relatedId)
      .maybeSingle();
    if (!data) return false;
    const { data: member } = await supabase
      .from("space_members")
      .select("user_id")
      .eq("space_id", relatedId)
      .eq("user_id", userId)
      .maybeSingle();
    return !!member;
  }
  if (templateName === "verification" || templateName === "moderation") {
    const { data } = await supabase
      .from("verification_claims")
      .select("user_id")
      .eq("id", relatedId)
      .maybeSingle();
    return data?.user_id === userId;
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return jsonResponse(
        { error: "Email service not configured. Contact the administrator." },
        503
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return jsonResponse({ error: "Invalid authentication." }, 401);
    }
    const callerId = userData.user.id;

    const body = await req.json();
    const {
      to,
      template,
      recipientUserId,
      subject,
      html,
      text,
      relatedId,
      relatedType,
    } = body as {
      to?: string;
      template?: string;
      recipientUserId?: string;
      subject?: string;
      html?: string;
      text?: string;
      relatedId?: string;
      relatedType?: string;
    };

    if (!template || !ALLOWED_TEMPLATES.includes(template as TemplateName)) {
      return jsonResponse({ error: "Invalid or missing template name." }, 400);
    }
    const templateName = template as TemplateName;

    if (!subject || typeof subject !== "string" || subject.length > 200) {
      return jsonResponse({ error: "Invalid subject." }, 400);
    }
    if (!html || typeof html !== "string" || html.length > 100000) {
      return jsonResponse({ error: "Invalid email content." }, 400);
    }
    if (!text || typeof text !== "string") {
      return jsonResponse({ error: "Plain-text fallback required." }, 400);
    }

    let recipientEmail = "";
    if (to) {
      if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return jsonResponse({ error: "Invalid recipient email." }, 400);
      }
      recipientEmail = to;
    } else if (recipientUserId) {
      const resolved = await resolveRecipientEmail(supabase, recipientUserId);
      if (!resolved) {
        return jsonResponse(
          { error: "Could not resolve recipient email." },
          400
        );
      }
      recipientEmail = resolved;
    } else {
      return jsonResponse(
        { error: "Provide either 'to' or 'recipientUserId'." },
        400
      );
    }

    if (relatedId) {
      const isOwner = await verifyOwnership(
        supabase,
        templateName,
        relatedId,
        callerId
      );
      if (!isOwner) {
        return jsonResponse(
          { error: "You are not authorized to send this email." },
          403
        );
      }
    }

    const alreadySent = await hasAlreadySent(
      supabase,
      recipientEmail,
      templateName
    );
    if (alreadySent) {
      return jsonResponse({
        success: true,
        messageId: null,
        template: templateName,
        deduplicated: true,
      });
    }

    const allowed = await checkRateLimit(
      supabase,
      recipientEmail,
      templateName
    );
    if (!allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded. Please try again later." },
        429
      );
    }

    const senderEnv = SENDER_MAP[templateName];
    const fromAddress = Deno.env.get(senderEnv);
    if (!fromAddress) {
      return jsonResponse(
        { error: "Sender address not configured." },
        503
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://oppnets.com";
    void appUrl;

    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
        text,
        tags: [{ name: "template", value: templateName }],
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      await logEmail(supabase, {
        recipientEmail,
        templateName,
        status: "failed",
        error: `Resend API error: ${resendResponse.status}`,
        relatedId,
        relatedType,
      });
      return jsonResponse(
        { error: "Email delivery failed. Please try again later." },
        502
      );
    }

    const resendData = await resendResponse.json();
    const messageId = resendData.id ?? null;

    await logEmail(supabase, {
      recipientEmail,
      templateName,
      status: "sent",
      providerMessageId: messageId ?? undefined,
      relatedId,
      relatedType,
    });

    return jsonResponse({
      success: true,
      messageId,
      template: templateName,
    });
  } catch (err) {
    return jsonResponse(
      { error: "An unexpected error occurred." },
      500
    );
  }
});
