export const DEFAULT_EMAIL_TEMPLATE = `Bonjour {{prenom}},

Veuillez trouver ci-joint : {{document}}.

N'hésitez pas à revenir vers moi pour toute question.

Cordialement,
{{expediteur}}`;

export function renderEmailTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}
