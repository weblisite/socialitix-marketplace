import { Resend } from 'resend';
import { db } from './storage';
import { emailTemplates, emailLogs, type InsertEmailLog } from '@shared/schema';
import { eq } from 'drizzle-orm';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not found - email functionality will be disabled');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'noreply@engagemarket.com';

interface EmailData {
  to: string;
  templateName: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function sendEmail({ to, templateName, variables = {}, metadata = {} }: EmailData) {
  if (!resend) {
    console.log(`Email would be sent to ${to} using template ${templateName}:`, variables);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Get email template
    const template = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.name, templateName))
      .limit(1);

    if (!template.length) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const emailTemplate = template[0];
    
    // Replace variables in template
    let subject = emailTemplate.subject;
    let htmlContent = emailTemplate.htmlContent;
    let textContent = emailTemplate.textContent || '';

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
      textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
    });

    // Send email
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: htmlContent,
      text: textContent || undefined,
    });

    // Log email
    const logData: InsertEmailLog = {
      recipient: to,
      templateId: emailTemplate.id,
      subject,
      status: 'sent',
      externalId: result.data?.id,
      metadata,
    };

    await db.insert(emailLogs).values(logData);

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    
    // Log failed email
    const logData: InsertEmailLog = {
      recipient: to,
      templateId: null,
      subject: `Failed: ${templateName}`,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata,
    };

    await db.insert(emailLogs).values(logData);
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Initialize default email templates
export async function initializeEmailTemplates() {
  const templates = [
    {
      name: 'welcome',
      subject: 'Welcome to EngageMarket',
      htmlContent: `
        <h1>Welcome to EngageMarket, {{name}}!</h1>
        <p>Thank you for joining our social media engagement marketplace.</p>
        <p>As a {{role}}, you can now:</p>
        {{#if isBuyer}}
        <ul>
          <li>Browse authentic engagement services</li>
          <li>Purchase followers, likes, views, and comments</li>
          <li>Track your social media growth</li>
        </ul>
        {{/if}}
        {{#if isProvider}}
        <ul>
          <li>List your engagement services</li>
          <li>Earn money by providing authentic actions</li>
          <li>Track your earnings and withdraw funds</li>
        </ul>
        {{/if}}
        <p><a href="{{dashboardUrl}}">Get started now</a></p>
      `,
      type: 'transactional'
    },
    {
      name: 'purchase_confirmation',
      subject: 'Purchase Confirmed - Order #{{orderId}}',
      htmlContent: `
        <h1>Purchase Confirmed</h1>
        <p>Hi {{buyerName}},</p>
        <p>Your order #{{orderId}} has been confirmed and payment processed.</p>
        <h3>Order Details:</h3>
        <ul>
          <li>Service: {{serviceType}} on {{platform}}</li>
          <li>Quantity: {{quantity}}</li>
          <li>Total Cost: {{totalCost}} KES</li>
          <li>Target URL: {{targetUrl}}</li>
          {{#if commentText}}<li>Comment: "{{commentText}}"</li>{{/if}}
        </ul>
        <p>Our providers will start working on your order shortly. You'll be notified when it's completed.</p>
        <p><a href="{{dashboardUrl}}">View Order Status</a></p>
      `,
      type: 'transactional'
    },
    {
      name: 'withdrawal_confirmation',
      subject: 'Withdrawal Request Confirmed',
      htmlContent: `
        <h1>Withdrawal Request Confirmed</h1>
        <p>Hi {{providerName}},</p>
        <p>Your withdrawal request has been confirmed and is being processed.</p>
        <h3>Withdrawal Details:</h3>
        <ul>
          <li>Amount Requested: {{amount}} KES</li>
          <li>Processing Fee: {{fee}} KES</li>
          <li>Net Amount: {{netAmount}} KES</li>
        </ul>
        <p>Funds will be transferred to your account within 1-3 business days.</p>
        <p><a href="{{dashboardUrl}}">Track Withdrawal Status</a></p>
      `,
      type: 'transactional'
    },
    {
      name: 'action_assignment',
      subject: 'New Action Assignment - Earn {{earnings}} KES',
      htmlContent: `
        <h1>New Action Assignment</h1>
        <p>Hi {{providerName}},</p>
        <p>You have a new action to complete. Earn {{earnings}} KES upon completion!</p>
        <h3>Action Details:</h3>
        <ul>
          <li>Action: {{actionType}} on {{platform}}</li>
          <li>Target: {{targetUrl}}</li>
          {{#if commentText}}<li>Comment Text: "{{commentText}}"</li>{{/if}}
          <li>Earnings: {{earnings}} KES</li>
        </ul>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Visit the target URL</li>
          <li>Perform the required action ({{actionType}})</li>
          {{#if commentText}}<li>Use the exact comment text provided</li>{{/if}}
          <li>Submit proof in your dashboard</li>
        </ol>
        <p><a href="{{dashboardUrl}}">Complete Action Now</a></p>
      `,
      type: 'transactional'
    },
    {
      name: 'action_completed',
      subject: 'Action Completed - {{actionType}} on {{platform}}',
      htmlContent: `
        <h1>Action Completed Successfully</h1>
        <p>Hi {{buyerName}},</p>
        <p>Great news! Your requested action has been completed.</p>
        <h3>Completed Action:</h3>
        <ul>
          <li>Action: {{actionType}} on {{platform}}</li>
          <li>Target: {{targetUrl}}</li>
          <li>Completed by: {{providerName}}</li>
          <li>Completed at: {{completedAt}}</li>
        </ul>
        <p>You can view the results on your social media account.</p>
        <p><a href="{{dashboardUrl}}">View All Orders</a></p>
      `,
      type: 'transactional'
    },
    {
      name: 'promotional_campaign',
      subject: 'Boost Your Growth - 20% Off All Services!',
      htmlContent: `
        <h1>Limited Time Offer - 20% Off!</h1>
        <p>Hi {{name}},</p>
        <p>Ready to supercharge your social media presence? For a limited time, get 20% off all engagement services!</p>
        <h3>Popular Services:</h3>
        <ul>
          <li>Instagram Followers - Now 4 KES (was 5 KES)</li>
          <li>YouTube Views - Now 4 KES (was 5 KES)</li>
          <li>TikTok Likes - Now 4 KES (was 5 KES)</li>
          <li>Twitter Engagement - Now 4 KES (was 5 KES)</li>
        </ul>
        <p>Use code: <strong>GROWTH20</strong> at checkout</p>
        <p><a href="{{dashboardUrl}}">Shop Now</a></p>
        <p><small>Offer valid until {{expiryDate}}. Terms and conditions apply.</small></p>
      `,
      type: 'marketing'
    }
  ];

  for (const template of templates) {
    try {
      await db.insert(emailTemplates).values(template).onConflictDoNothing();
    } catch (error) {
      console.error(`Error inserting template ${template.name}:`, error);
    }
  }
}