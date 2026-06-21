async function runTest() {
  try {
    // 1. Login as Admin
    console.log("Logging in as admin...");
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@coremen.pe', password: 'Admin1234!' })
    });
    
    if (!loginRes.ok) {
      console.log("Login failed:", await loginRes.text());
      return;
    }
    
    // Get the auth_token cookie
    const cookies = loginRes.headers.get('set-cookie');
    const authToken = cookies?.split(';')[0];
    
    if (!authToken) {
      console.log("No auth token received");
      return;
    }
    console.log("Logged in successfully");

    // 2. Fetch Attributes
    console.log("Fetching attributes...");
    const attrsRes = await fetch('http://localhost:3001/api/admin/attributes');
    const attrs = await attrsRes.json() as any;
    
    const cat = attrs.categories[0];
    const fab = attrs.fabrics[0];
    const size = attrs.sizes[0];

    // 3. Create Product
    console.log("Creating product...");
    const productPayload = {
      name: "Test HTTP Product",
      description: "testing",
      basePrice: 50,
      categoryId: cat.id,
      fabricId: fab.id,
      imageUrl: "",
      fiberComposition: "95% Algodón, 5% Lycra",
      careInstructions: "Lavar a máquina en frío",
      variants: [
        {
          sizeId: size.id,
          color: "Azul",
          stock: 5,
          price: undefined
        }
      ]
    };

    const createRes = await fetch('http://localhost:3001/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authToken
      },
      body: JSON.stringify(productPayload)
    });

    console.log("Create Product Status:", createRes.status);
    const result = await createRes.json();
    console.log("Result:", JSON.stringify(result, null, 2));

  } catch(e) {
    console.error("Test error:", e);
  }
}
runTest();
