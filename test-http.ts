import fetch from 'node-fetch';

async function testPost() {
  try {
    // 1. Get Categories, Fabrics, Sizes
    const attrsRes = await fetch('http://localhost:3001/api/admin/attributes');
    if (!attrsRes.ok) throw new Error("Failed to get attributes");
    const attrs = await attrsRes.json();
    
    console.log("Attributes fetched:", {
      cat: attrs.categories.length,
      fab: attrs.fabrics.length,
      sizes: attrs.sizes.length
    });

    // 2. We need a token for ADMIN. We can mock it or use the API directly.
    // Actually, we can just use the controller directly like before.
    // Wait, testing via HTTP requires a valid JWT token. 
    // It's easier to check the console logs of the Next.js or Express app.
  } catch(e) {
    console.error(e);
  }
}
testPost();
