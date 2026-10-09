# Plan de implementación de Compras

Diseño aprobado: `2026-10-08-compras-design.md`.

## 1. Consultas a tiendas

- Inspeccionar los mecanismos públicos de búsqueda y selección de ciudad
  o sucursal de Gama y Central Madeirense.
- Implementar adaptadores separados en el servidor existente, sin base
  de datos y sin eludir bloqueos de los sitios.
- Validar entradas y limitar duración, tamaño y concurrencia.
- Devolver por tienda cobertura, candidatos con moneda y fuente, fecha
  de consulta y errores explícitos. No devolver precios simulados.
- Si una tienda no proporciona datos consultables, conservar su estado
  de error y permitir completar sus precios manualmente.

## 2. Emparejamiento y cálculo

- Crear módulos JavaScript nativos independientes para normalizar productos,
  comprobar marca/variante/presentación y calcular importes.
- Priorizar identificadores compartidos y evitar coincidencias dudosas.
- Permitir confirmar candidatos y completar precios manuales en USD o Bs.
- Calcular subtotales por cantidad, totales completos y conversiones
  utilizando la tasa BCV USD existente.
- No elegir ganadora con listas incompletas o productos no equivalentes.

## 3. Interfaz Compras

- Reemplazar el contenido provisional de la pestaña existente sin cambiar
  las demás pantallas ni incorporar un framework de interfaz.
- Añadir ciudad y, cuando lo exija la tienda, sucursal, lista editable,
  cantidades y consulta.
- Mostrar candidatos, fuentes, precios por tienda, edición manual,
  importes y resumen comparativo con estados accesibles.
- Invalidar resultados al cambiar ciudad o productos y proteger contra
  respuestas antiguas que lleguen después de una consulta nueva.
- Adaptar la interfaz a móvil y escritorio usando los estilos existentes.

## 4. Pruebas

- Usar el ejecutor nativo de Node para probar coincidencias, variantes,
  cantidades, monedas, empate, precios faltantes y listas incompletas.
- Probar el servidor con respuestas controladas de éxito, bloqueo,
  tiempo agotado y cobertura no verificable.
- Comprobar consultas reales y reportar sus límites sin tratar un bloqueo
  como ausencia de productos.
- Ejecutar las comprobaciones de compilación y tipos aplicables.
- Verificar el flujo de interfaz y capturar la aplicación en ejecución.

## 5. Entrega

- Configurar únicamente los servicios necesarios para ejecutar y verificar
  la función solicitada, usando los artefactos existentes.
- Actualizar `replit.md` con instrucciones reales de ejecución y límites
  de cobertura comprobados.
- Informar qué funciona y cualquier consulta externa que siga bloqueada.

## Forma de ejecución

El agente principal realizará el trabajo en este proyecto, siguiendo el
orden anterior. No se migrará el proyecto ni se crearán tareas paralelas
para otros agentes.
