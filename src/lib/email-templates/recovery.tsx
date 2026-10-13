import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Recebemos uma solicitação para redefinir a senha da sua conta {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{siteName}</Heading>
        <Text style={text}>Olá,</Text>
        <Text style={text}>
          Recebemos uma solicitação para redefinir a senha da sua conta {siteName}.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir senha
        </Button>
        <Text style={linkText}>
          Se o botão não funcionar, copie e cole este link no navegador:{' '}
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Text style={text}>
          Este link expira em 60 minutos e pode ser usado apenas uma vez.
        </Text>
        <Text style={text}>
          Não solicitou essa alteração? Ignore este e-mail — sua senha permanece
          inalterada e nenhuma conta será afetada.
        </Text>
        <Text style={text}>
          Precisa de ajuda? Fale com a gente:{' '}
          <Link href="mailto:contatotaskbio@gmail.com" style={link}>
            contatotaskbio@gmail.com
          </Link>.
        </Text>
        <Text style={footer}>
          TaskBio — sua semana, organizada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#2f5bd8',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #2f5bd8',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const linkText = { ...text, margin: '24px 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-all' as const }
const link = { color: '#2f5bd8', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#55575d', margin: '30px 0 0' }
