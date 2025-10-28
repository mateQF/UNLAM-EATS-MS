<h3>Acciones públicas (usadas por frontend / gateway)</h3>

-Crear y procesar pago — POST /payments

-Crea el pago (idempotente por Idempotency-Key) y lo procesa con el proveedor simulado.

-Estados: pending → processing → succeeded|failed.

-Obtener pago por ID — GET /payments/{paymentId}

-Listar pagos por usuario — GET /payments?userId=...

-Paginado y filtrable por estado/fechas.

-Listar pagos por orden — GET /payments?orderId=...

-Buscar/filtrar pagos — GET /payments?status=...&from=...&to=...

Reintentar pago fallido (opcional) — POST /payments/{paymentId}/retry
<hr>
<h3>Acciones internas (entre servicios)</h3>

Simular webhook de proveedor (opcional) — POST /webhooks/fake

Para demos asíncronas: cambia estado a succeeded|failed “notificado por proveedor”.

Eventos de dominio (publish)

Emitidos a la cola/mensajería cuando cambian estados:

payment.created

payment.processing

payment.succeeded

payment.failed

Payload mínimo: { id, orderId, userId, amountCents, currency, status, at }.

Observabilidad / Operación

Health check — GET /health

OK para Docker/compose y gateway.

Metrics (opcional) — GET /metrics

Contadores por estado, montos totales, p95/p99 (aunque sea dummy).

Resumen diario (opcional) — GET /reports/payments/daily?date=YYYY-MM-DD

Total cobranzas, cantidad por estado, ticket promedio.

Resumen por rango (opcional) — GET /reports/payments/summary?from=...&to=...&groupBy=day|status|method

Útil para tablero docente.

(Opcional) Métodos de pago guardados*

Sólo si querés mostrar “wallet” del usuario. No es obligatorio para el TP.

Crear método de pago — POST /payment-methods (token simulado, masked)

Listar métodos por usuario — GET /payment-methods?userId=...

Eliminar método — DELETE /payment-methods/{id}