// api/loyverse-customer.js
//
// Proxy serverless para consultar clientes de Loyverse sin problemas de CORS.
// El navegador le pega a esta funcion (que corre en el servidor de Vercel, no en
// el navegador), y esta funcion le pega a Loyverse de servidor a servidor,
// donde CORS no aplica. Despues devuelve la respuesta al navegador con los
// headers de CORS abiertos para que el navegador la acepte.

const LOYVERSE_TOKEN = "ea72d0bcfe4a438aad213a106c9aea46";

export default async function handler(req, res) {
  // Habilitar CORS para que cualquier sitio (tu app de Netlify) pueda llamar a esta funcion
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responder rapido a la preflight request del navegador
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const dni = req.query.dni;

  if (!dni) {
    res.status(400).json({ error: "Falta el parametro dni" });
    return;
  }

  try {
    const dniLimpio = dni.trim();
    let cursor = null;
    let match = null;
    let paginas = 0;
    const MAX_PAGINAS = 40; // tope de seguridad (40 x 50 = 2000 clientes revisados como maximo)

    do {
      let loyverseUrl = `https://api.loyverse.com/v1.0/customers?customer_code=${encodeURIComponent(dniLimpio)}&limit=50`;
      if (cursor) {
        loyverseUrl += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const loyverseRes = await fetch(loyverseUrl, {
        headers: { Authorization: `Bearer ${LOYVERSE_TOKEN}` }
      });

      const data = await loyverseRes.json();

      if (!loyverseRes.ok) {
        res.status(loyverseRes.status).json(data);
        return;
      }

      const customers = data.customers || [];
      match = customers.find(c => c.customer_code === dniLimpio);

      cursor = data.cursor || null;
      paginas++;

      if (match) break;

    } while (cursor && paginas < MAX_PAGINAS);

    res.status(200).json({ customers: match ? [match] : [] });

  } catch (err) {
    res.status(500).json({ error: "Error consultando Loyverse", details: String(err) });
  }
}
