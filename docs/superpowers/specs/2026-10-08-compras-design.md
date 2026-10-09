# Diseño: comparación de compras

## Objetivo y alcance

Completar la pestaña Compras existente de Pagar Claro. La persona elige
una ciudad, introduce productos con cantidad y compara su lista en
Central Madeirense y Gama. Mantener HTML, CSS y JavaScript nativos.
Usar el servidor existente para consultas externas, sin base de datos.

## Flujo

1. Elegir ciudad e introducir filas de producto y cantidad positiva.
   Permitir agregar, editar y eliminar filas.
2. Consultar ambas tiendas de forma independiente. Un fallo en una no
   impide mostrar resultados de la otra.
3. Mostrar producto encontrado, presentación, precio unitario, importe
   por cantidad, tienda, fuente y momento de consulta.
4. Emparejar por identificador compartido cuando exista; en su defecto,
   comprobar nombre, marca, variante y contenido neto. No emparejar
   automáticamente distintas marcas, variantes o presentaciones.
   Cuando la descripción sea ambigua, ofrecer candidatos para elegir.
5. Permitir introducir o corregir precios unitarios manualmente en USD
   o Bs, distinguiéndolos siempre de los consultados.
6. Mostrar total por tienda en USD y Bs, tasa BCV USD utilizada y fecha.
   Los precios originalmente en Bs se conservan en Bs y se convierten
   a USD con esa misma tasa, sin convertirlos dos veces.

## Cobertura y fuentes

Consultar únicamente las tiendas oficiales verificadas: tucentralonline.com
y gamaenlinea.com. No usar centralenlinea.com, que corresponde a otro
comercio. Verificar los mecanismos públicos de consulta y de selección
de sucursal antes de escribir adaptadores.

Las opciones de ciudad y sucursal deben corresponder a cobertura verificable.
No asignar precios de Caracas a otra ciudad ni considerar que un catálogo
genérico representa una sucursal sin evidencia.

Gama anuncia cobertura en la Gran Caracas. Central Madeirense devolvió
un bloqueo HTTP 503 durante la exploración. Si no se puede obtener el catálogo,
la cobertura o el precio local, informar esa limitación y permitir precios
manuales. No eludir bloqueos ni exigir credenciales personales de clientes.

## Estados y comparación

Distinguir: consultando, consulta correcta, producto no encontrado,
coincidencia por confirmar, cobertura no verificable, tienda no disponible
y precio manual. Ausencia de precio no significa precio cero.

Mostrar subtotales y número de productos con precio cuando falten datos.
Solo declarar la tienda más barata si ambas listas están completas y
comparan los mismos productos confirmados. Mostrar empate si corresponde.
Si la lista se modifica o cambia la ciudad, invalidar los resultados afectados
para no reutilizar precios de otra consulta.

Reutilizar la tasa BCV existente. Si se utiliza su caché, indicarlo con fecha;
si no hay tasa válida, mostrar los importes en su moneda original y explicar
que la conversión y la comparación entre monedas no están disponibles.

## Servidor y seguridad

Añadir rutas al servidor existente con validación de ciudad, producto,
cantidades y límites de tamaño. Consultar solo destinos oficiales
predefinidos, con tiempos máximos, concurrencia limitada y respuesta
estructurada por tienda. No aceptar URLs arbitrarias ni devolver errores
internos al navegador. No almacenar información en una base de datos.

## Verificación y entrega

Probar cantidades, coincidencias y variantes distintas, precios manuales,
totales incompletos, empate, conversión BCV, cambio de ciudad y fallos
independientes de las tiendas. Comprobar las consultas externas reales:
una respuesta bloqueada cuenta como fallo explícito, no como búsqueda exitosa.
Verificar interfaz móvil y escritorio, navegación por teclado y mensajes
de carga/error. Documentar cómo ejecutar los servicios necesarios para esta
función, sin migrar ni reestructurar el proyecto.

## Fuera de alcance

Checkout, compras reales, autenticación con las tiendas, histórico de precios,
base de datos, otras cadenas y gastos de envío. El resultado compara productos,
no el importe final de un pedido con delivery.
