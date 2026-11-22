// Textos de ayuda: explican en lenguaje sencillo los términos de comercio exterior y del sistema.

export const INCOTERMS = {
  FOB: ["Franco a bordo", "RiTech entrega la carga a bordo del barco en el puerto de salida. Desde ese momento el flete, el seguro y el riesgo son del cliente."],
  CIF: ["Costo, seguro y flete", "RiTech paga el flete y el seguro hasta el puerto de destino. El riesgo pasa al cliente cuando la carga sube al barco."],
  EXW: ["En fábrica", "El cliente recoge la mercancía en la bodega de RiTech y asume todo el transporte, los trámites y el riesgo."],
  DDP: ["Entregado con derechos pagados", "RiTech asume todo: transporte, seguro, aduana e impuestos hasta la dirección del cliente."],
};

export const TERMINOS = {
  incoterm: "Regla internacional que define quién paga el transporte y el seguro, y en qué punto el riesgo pasa del vendedor al comprador.",
  sku: "Código interno que identifica cada producto. Ejemplo: CAF-SUP-70 es café supremo en sacos de 70 kg.",
  stock_minimo: "Cantidad por debajo de la cual el producto se marca con stock bajo y aparece en las alertas.",
  tax_id: "Número de identificación tributaria del cliente en su país (equivale al NIT en Colombia).",
  nit: "Número de Identificación Tributaria del proveedor en Colombia.",
  consecutivo: "Número único de la exportación, con el formato EXP-año-número.",
};

// Qué significa cada estado de una exportación y qué hacer a continuación.
export const ESTADOS_EXPLICADOS = {
  BORRADOR: "La exportación se está preparando: aún no descuenta inventario y se puede modificar.",
  CONFIRMADA: "El pedido está aprobado y los productos ya se descontaron del inventario.",
  EN_TRANSITO: "La carga salió del puerto de origen y va camino al cliente.",
  ENTREGADA: "El cliente recibió la mercancía. La exportación queda cerrada.",
  CANCELADA: "La exportación se anuló y no continuará el proceso.",
};
