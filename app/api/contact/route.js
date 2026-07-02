import { Resend } from 'resend';

export async function POST(req) {
  const { name, email, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Portfolio <noreply@bennyhinn.life>',
      to: 'info@bennyhinn.life',
      replyTo: email,
      subject: `Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}
