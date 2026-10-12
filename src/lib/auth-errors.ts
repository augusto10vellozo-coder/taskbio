// Traduz mensagens de autenticação do backend para português do Brasil,
// para que nenhuma tela apareça em inglês para quem usa o TaskBio.

type AuthLikeError = { message?: unknown; code?: unknown };

const BY_CODE: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  user_already_exists: "Este e-mail já tem uma conta. Entre ou recupere a senha.",
  email_invalid: "Informe um e-mail válido.",
  weak_password: "A senha precisa ter pelo menos 8 caracteres.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  over_email_sent_rate_limit: "Aguarde um minuto antes de pedir outro link.",
  network_error: "Sem conexão com a internet. Verifique sua rede e tente de novo.",
  session_missing: "Sua sessão expirou. Entre novamente.",
  invalid_grant: "Este link é inválido ou já expirou. Peça um novo.",
  unsupported_provider: "Esta forma de entrada ainda não está disponível.",
};

const BY_TEXT: Array<[RegExp, string]> = [
  [/invalid login credentials|invalid email or password|invalid credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed|confirm your email/i, "Confirme seu e-mail pelo link que enviamos antes de entrar."],
  [/already registered|already exists|already been registered/i, "Este e-mail já tem uma conta. Entre ou recupere a senha."],
  [/unable to validate email|invalid email format|email address is invalid/i, "Informe um e-mail válido."],
  [/password should be at least|password is too short|weak password/i, "A senha precisa ter pelo menos 8 caracteres."],
  [/too many requests|rate limit|requests per hour/i, "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."],
  [/password reset emails are limited|one per minute/i, "Aguarde um minuto antes de pedir outro link."],
  [/failed to fetch|networkerror|network request failed|load failed/i, "Sem conexão com a internet. Verifique sua rede e tente de novo."],
  [/expired|invalid.{0,12}link|link.{0,12}invalid|bad jwt|jwt expired/i, "Este link é inválido ou já expirou. Peça um novo."],
  [/auth session missing|no session|session missing/i, "Sua sessão expirou. Entre novamente."],
  [/provider is not supported|unsupported provider|not a supported provider/i, "Esta forma de entrada ainda não está disponível."],
  [/redirect url/i, "O endereço de retorno é inválido. Tente entrar de novo."],
  [/only users that authenticated using a password|password update is only allowed/i, "Entre com e-mail e senha para alterar a senha."],
  [/anonymous sign-ins/i, "Entre com seu e-mail para continuar."],
];

/** Devolve a mensagem de erro em português, sem nunca expor o texto em inglês do backend. */
export function authErrorMessage(error: unknown, fallback = "Não foi possível acessar sua conta. Tente de novo."): string {
  if (!error) return fallback;
  const code = typeof (error as AuthLikeError).code === "string" ? (error as AuthLikeError).code : "";
  if (code && BY_CODE[code]) return BY_CODE[code];
  const message =
    typeof (error as AuthLikeError).message === "string"
      ? (error as AuthLikeError).message
      : error instanceof Error
        ? error.message
        : String(error);
  for (const [pattern, text] of BY_TEXT) if (pattern.test(message)) return text;
  return fallback;
}
