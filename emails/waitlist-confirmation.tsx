import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Locale = "es" | "en";

const copy = {
  es: {
    preview: "Gracias por unirte a maisha matcha.",
    heading: "Te damos la bienvenida a maisha matcha",
    line: "Hoja molida en piedra, agua a su punto, una pausa larga.",
    next: "Tu nombre está en la lista de los socios fundadores. Te escribiremos una sola vez, antes de la apertura.",
    confirm: "Tu nombre está en la lista de los socios fundadores. Para recibir noticias de la apertura y de las plazas, confirma que este correo es tuyo.",
    button: "Confirmar mi correo",
    ignore: "Si no te apuntaste tú, no hagas nada: no te escribiremos.",
    signature: "maisha matcha · Murcia",
  },
  en: {
    preview: "Thank you for joining maisha matcha.",
    heading: "Welcome to maisha matcha",
    line: "Leaf ground on stone, water at the right heat, a long pause.",
    next: "Your name is on the founding members list. We will write once, before the opening.",
    confirm: "Your name is on the founding members list. To hear about the opening and the places, confirm that this address is yours.",
    button: "Confirm my email",
    ignore: "If you did not sign up, do nothing: we will not write to you.",
    signature: "maisha matcha · Murcia",
  },
} as const;

// Brand tokens. Email clients are unreliable with custom web fonts, so we use
// a serif stack for the display line and a neutral sans for body text.
const washi = "#F5F1E8";
const sumi = "#1C1B18";
const wood = "#B08D57";

const serifStack = "Georgia, 'Times New Roman', serif";
const sansStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif";

export function WaitlistConfirmation({
  locale = "es",
  name,
  confirmUrl,
}: {
  locale?: Locale;
  name?: string;
  /** Double opt-in: letters start only once this link is used. */
  confirmUrl?: string;
}) {
  const t = copy[locale];
  const greeting = name ? `${name},` : undefined;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={{ backgroundColor: washi, margin: 0, padding: "40px 0" }}>
        <Container
          style={{
            backgroundColor: washi,
            maxWidth: "520px",
            margin: "0 auto",
            padding: "8px 32px 32px",
          }}
        >
          <Section>
            <Text
              style={{
                fontFamily: serifStack,
                fontSize: "34px",
                lineHeight: 1.1,
                fontWeight: 400,
                color: sumi,
                margin: "16px 0 0",
              }}
            >
              {t.heading}
            </Text>
            {greeting ? (
              <Text
                style={{
                  fontFamily: sansStack,
                  fontSize: "15px",
                  color: sumi,
                  opacity: 0.7,
                  margin: "12px 0 0",
                }}
              >
                {greeting}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: serifStack,
                fontSize: "18px",
                lineHeight: 1.6,
                color: sumi,
                margin: "12px 0 0",
              }}
            >
              {t.line}
            </Text>
            <Text
              style={{
                fontFamily: sansStack,
                fontSize: "15px",
                lineHeight: 1.7,
                color: sumi,
                opacity: 0.85,
                margin: "24px 0 0",
              }}
            >
              {confirmUrl ? t.confirm : t.next}
            </Text>
            {confirmUrl ? (
              <>
                <Button
                  href={confirmUrl}
                  style={{
                    display: "inline-block",
                    marginTop: "20px",
                    padding: "14px 24px",
                    backgroundColor: sumi,
                    color: washi,
                    fontFamily: sansStack,
                    fontSize: "15px",
                    borderRadius: "2px",
                    textDecoration: "none",
                  }}
                >
                  {t.button}
                </Button>
                <Text style={{ fontFamily: sansStack, fontSize: "13px", lineHeight: 1.6, color: sumi, opacity: 0.7, margin: "16px 0 0" }}>
                  {t.ignore}
                </Text>
              </>
            ) : null}
          </Section>
          <Hr style={{ borderColor: wood, opacity: 0.4, margin: "32px 0 16px" }} />
          <Text
            style={{
              fontFamily: sansStack,
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: sumi,
              opacity: 0.5,
              margin: 0,
            }}
          >
            {t.signature}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

