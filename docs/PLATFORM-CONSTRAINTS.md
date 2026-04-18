# Restricciones de plataforma

## Restriccion principal

- `Todo Cloudflare` y `todo gratis` no encajan a la vez para emails transaccionales reales de activacion y reset a terceros.

## Hechos operativos

- Email Routing de Cloudflare no resuelve este caso por si solo: historicamente es forwarding y procesamiento de correo entrante, no SMTP general saliente.
- Cloudflare Email Service ya cubre email transaccional saliente, pero segun documentacion actual esta disponible en Workers Paid y sigue en beta.
- El plan gratuito de Workers y D1 es suficiente para el arranque tecnico del MVP, pero no garantiza margen ilimitado para una app publica si el trafico sube.

## Opcion A. Mantener todo en Cloudflare

- Usar Cloudflare Email Service.
- Ventaja: stack puro Cloudflare.
- Coste: rompe el requisito de `todo gratis`.
- Estado actual documentado: beta y plan Paid.

## Opcion B. Mantener coste cero inicial

- Usar Resend en su plan gratuito para activacion y reset.
- Ventaja: mantiene coste cero inicial y simplifica deliverability.
- Coste: rompe el requisito de `todo Cloudflare`.

## Decision de arquitectura

- Implementar `EmailSender` como adapter intercambiable.
- Mantener el core de auth y los tokens dentro de Cloudflare.
- Retrasar la eleccion final entre Opcion A y Opcion B hasta el momento de habilitar emails reales.

